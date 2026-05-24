
        const FIREBASE_URL = "https://bdc-app-fb723-default-rtdb.asia-southeast1.firebasedatabase.app/";
        const CLEANUP_RETENTION_DAYS = 30;
        const CLEANUP_ORDER_STATUSES = ['paid', 'canceled', 'canceled_cleared'];
        
        let allMenu = []; let allMenuRaw = {}; 
        let globalOptions = []; let globalOptionsRaw = {};
        let allTables = []; 
        let staffData = {}; let cart = []; let currentUser = null; 
        let activeOrders = {}; let pollingInterval = null; let currentSelectingItem = null; let currentCheckoutKey = null; 
        window.currentPaidOrders = [];
        let appSettings = {
            ownerPin: "1234",
            receipt: {
                shopName: "บ้านเดือนฉาย",
                logoUrl: "",
                phone: "081-959-1650",
                address: "23 ซอยหนวงจิราเมญ ต.บ่อยาง อ.เมือง จ.สงขลา 90000",
                facebook: "บ้านเดือนฉายคาเฟ่",
                promptPayQrUrl: "",
                promptPayName: "",
                note: "ขอบคุณที่ใช้บริการ"
            }
        };

        // 🌟 ตั้งค่าวันที่เริ่มต้นในปฏิทินหน้ายอดขาย
        document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            today.setHours(today.getHours() - 5); // หักลบเวลาเปิด-ปิดร้าน
            const defaultDateStr = today.toISOString().split('T')[0];
            const startInput = document.getElementById('salesDateStart');
            const endInput = document.getElementById('salesDateEnd');
            if(startInput) startInput.value = defaultDateStr;
            if(endInput) endInput.value = defaultDateStr;
        });
        
        // 🌟 ฟังก์ชันส่งข้อมูลประวัติการทำงานไปยัง Firebase (Audit Log)
        async function logActivity(actionType, detail) {
            if(!currentUser) return;
            const payload = {
                timestamp: new Date().toISOString(),
                staffName: currentUser.Name || 'System',
                role: currentUser.Role || currentUser.Position || 'Staff',
                action: actionType,
                detail: detail
            };
            try { await fetch(`${FIREBASE_URL}AuditLogs.json`, { method: 'POST', body: JSON.stringify(payload) }); } catch (e) { console.error(e); }
        }

        function getBusinessDate(dateString) { const d = dateString ? new Date(dateString) : new Date(); d.setHours(d.getHours() - 5); return d.toLocaleDateString('th-TH'); }
        function getBusinessDateKey(dateString) {
            const d = dateString ? new Date(dateString) : new Date();
            d.setHours(d.getHours() - 5);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${date}`;
        }

        async function fetchFirebaseJson(path) {
            const res = await fetch(`${FIREBASE_URL}${path}.json`);
            if(!res.ok) throw new Error(`โหลด ${path} ไม่สำเร็จ (${res.status})`);
            return await res.json() || {};
        }

        async function patchFirebase(path, payload) {
            const res = await fetch(`${FIREBASE_URL}${path}.json`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
            if(!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`บันทึก ${path} ไม่สำเร็จ (${res.status}) ${text}`);
            }
        }

        function getCleanupCutoffDate() {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - CLEANUP_RETENTION_DAYS);
            cutoff.setHours(0, 0, 0, 0);
            return cutoff;
        }

        function isOldTimestamp(timestamp, cutoffTime) {
            const time = new Date(timestamp).getTime();
            return !Number.isNaN(time) && time < cutoffTime;
        }

        function shouldCleanupOrder(order, cutoffTime) {
            return order
                && order.timestamp
                && CLEANUP_ORDER_STATUSES.includes(order.status)
                && isOldTimestamp(order.timestamp, cutoffTime);
        }

        function getCleanupKeys(data, cutoffTime, predicate) {
            const keys = [];
            for(let key in data) {
                if(predicate(data[key], cutoffTime)) keys.push(key);
            }
            return keys;
        }

        async function deleteKeysInChunks(path, keysToDelete) {
            const chunkSize = 300;
            for(let i = 0; i < keysToDelete.length; i += chunkSize) {
                const patch = {};
                keysToDelete.slice(i, i + chunkSize).forEach(key => patch[key] = null);
                await patchFirebase(path, patch);
            }
            return keysToDelete.length;
        }

        function showModal(type, title, message, onConfirm) {
            const modal = document.getElementById('customModal');
            const iconEl = document.getElementById('customModalIcon');
            const titleEl = document.getElementById('customModalTitle');
            const msgEl = document.getElementById('customModalMessage');
            const btnContainer = document.getElementById('customModalButtons');
            titleEl.innerText = title; msgEl.innerText = message;
            if (type === 'alert') {
                iconEl.innerHTML = title.includes('สำเร็จ') ? '<i class="fa-solid fa-circle-check text-green-500"></i>' : '<i class="fa-solid fa-circle-exclamation text-yellow-500"></i>';
                btnContainer.innerHTML = `<button onclick="closeCustomModal()" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md active:scale-95">ตกลง</button>`;
            } else if (type === 'confirm') {
                iconEl.innerHTML = '<i class="fa-solid fa-circle-question text-blue-500"></i>';
                window.currentConfirmCallback = () => { closeCustomModal(); if(onConfirm) onConfirm(); };
                btnContainer.innerHTML = `<button onclick="closeCustomModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold active:scale-95">ยกเลิก</button><button onclick="window.currentConfirmCallback()" class="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-md active:scale-95">ยืนยัน</button>`;
            }
            modal.classList.remove('hidden');
        }
        function closeCustomModal() { document.getElementById('customModal').classList.add('hidden'); }
        window.originalAlert = window.alert; window.alert = function(msg) { showModal('alert', msg.includes('สำเร็จ') ? 'สำเร็จ!' : 'แจ้งเตือน', msg); };

        async function fetchInitialData() {
            try {
                let res = await fetch(`${FIREBASE_URL}Staff.json`); 
                staffData = await res.json() || {};
                
                res = await fetch(`${FIREBASE_URL}Menu.json`); 
                allMenuRaw = await res.json() || {};
                allMenu = [];
                for(let key in allMenuRaw) {
                    if(allMenuRaw[key] && allMenuRaw[key].Name) {
                        allMenu.push({ ...allMenuRaw[key], _key: key }); 
                    }
                }
                
                res = await fetch(`${FIREBASE_URL}Options.json`);
                globalOptionsRaw = await res.json() || {};
                globalOptions = [];
                for(let key in globalOptionsRaw) {
                    if(globalOptionsRaw[key]) globalOptions.push({ ...globalOptionsRaw[key], id: key });
                }

                let tblRes = await fetch(`${FIREBASE_URL}Tables.json`);
                let tblData = await tblRes.json();
                if(tblData) {
                    if(Array.isArray(tblData)) allTables = tblData.filter(t => t);
                    else allTables = Object.values(tblData);
                }
                if(allTables.length === 0) allTables = ['A1', 'A2', 'B1']; 
                allTables.sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));

                res = await fetch(`${FIREBASE_URL}AppSettings.json`);
                const settingsData = await res.json();
                if(settingsData) {
                    appSettings = {
                        ...appSettings,
                        ...settingsData,
                        receipt: { ...appSettings.receipt, ...(settingsData.receipt || {}) }
                    };
                }

            } catch (e) { console.error("Load Error:", e); }
        }
