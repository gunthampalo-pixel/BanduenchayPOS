
        const FIREBASE_URL = "https://bdc-app-fb723-default-rtdb.asia-southeast1.firebasedatabase.app/";
        const CLEANUP_RETENTION_DAYS = 45;
        const CLEANUP_ORDER_STATUSES = ['paid', 'canceled', 'canceled_cleared'];
        
        // 🧪 ระบบตรวจจับและดักจับเส้นทางข้อมูลสำหรับโหมดทดสอบ (Test/Demo Mode Interceptor)
        const IS_TEST_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
        
        function isDemoUserActive() {
            if (!currentUser) return false;
            const username = (currentUser.Username || currentUser.ID || '').toLowerCase().trim();
            return username === 'demo' || username === 'dev';
        }

        // ดักจับการเรียกดึงข้อมูลจาก Firebase
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            if (typeof input === 'string' && input.startsWith(FIREBASE_URL)) {
                const path = input.substring(FIREBASE_URL.length);
                const firstSegment = path.split('/')[0].split('.')[0]; // เช่น "ActiveOrders.json" -> "ActiveOrders"
                const transactionalPaths = ['ActiveOrders', 'OrderHistory', 'AuditLogs'];
                if ((IS_TEST_MODE || isDemoUserActive()) && transactionalPaths.includes(firstSegment)) {
                    input = FIREBASE_URL + 'TestData/' + path;
                    console.log(`[Sandbox Mode Override] Redirected API call for ${currentUser?.Name || 'System'}: ${input}`);
                }
            }
            return originalFetch(input, init);
        };

        // ฟังก์ชันอัปเดตการแสดงผลของแบนเนอร์แจ้งเตือนจำลองข้อมูลด้านบนสุด
        window.updateTestModeBanner = function() {
            const banner = document.getElementById('test-mode-banner');
            if (!banner) return;
            
            const isDemo = isDemoUserActive();
            if (IS_TEST_MODE || isDemo) {
                if (isDemo) {
                    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1.5 animate-bounce"></i> โหมดบัญชีทดสอบ (${currentUser.Name}) - ข้อมูลสั่งอาหารและยอดขายจะไม่ปะปนกับร้านจริง`;
                    banner.className = "bg-amber-500 text-slate-900 font-bold text-center text-xs py-1.5 px-4 z-[110] relative shadow-inner block";
                } else {
                    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1.5 animate-bounce"></i> โหมดทดสอบออฟไลน์ (Test Mode) - ออเดอร์และยอดขายที่ทำจากเครื่องนี้จะไม่ส่งผลต่อร้านจริง`;
                    banner.className = "bg-amber-500 text-slate-900 font-bold text-center text-xs py-1.5 px-4 z-[110] relative shadow-inner block";
                }
            } else {
                banner.className = "hidden";
            }
        };

        // รันตรวจเช็คแบนเนอร์ช่วงโหลดหน้าเว็บแรก
        document.addEventListener('DOMContentLoaded', () => {
            window.updateTestModeBanner();
        });

        // Helper to get broad category (Foods, Beverages, Desserts, Combo Sets, Events)
        window.getBroadMainCategory = function(category) {
            if (!category) return 'อาหาร';
            const catLower = category.toLowerCase().trim();
            if (catLower.includes('event') || catLower.includes('catering') || catLower.includes('จัดเลี้ยง') || catLower.includes('อีเว้นต์')) {
                return 'อีเว้นต์';
            }
            if (catLower.includes('beverage') || catLower.includes('drink') || catLower.includes('เครื่องดื่ม') || catLower.includes('บาร์น้ำ') || catLower.includes('น้ำ')) {
                return 'เครื่องดื่ม';
            }
            if (catLower.includes('dessert') || catLower.includes('bakery') || catLower.includes('ของหวาน') || catLower.includes('ขนม') || catLower.includes('เค้ก')) {
                return 'ของหวาน';
            }
            if (catLower.includes('set') || catLower.includes('combo') || catLower.includes('เซ็ต') || catLower.includes('ชุด')) {
                return 'เซ็ตเมนู';
            }
            return 'อาหาร';
        };

        // Helper to get subcategory under broad category
        window.getItemSubCategory = function(item) {
            const categoryVal = typeof item === 'string' ? item : (item ? item.Category || item.category : '');
            if (!categoryVal) return 'ทั่วไป';
            const parts = categoryVal.split('/');
            const firstPart = parts[0].trim();
            const firstLower = firstPart.toLowerCase();
            
            // Check if the first part is a broad English/Thai group name
            const isBroadGroup = ['beverage', 'dessert', 'desserts', 'set', 'combo', 'event', 'catering', 'option', 'options', 'อื่น', 'อื่นๆ'].some(word => firstLower.includes(word));
            
            if (isBroadGroup) {
                if (parts.length > 1) {
                    return parts[1].trim();
                }
                return 'ทั่วไป';
            }
            
            // For Food items, we use the first part (e.g. "กับข้าว", "อาหารจานเดียว", "สินค้าอบแห้ง")
            return firstPart;
        };

        
        let allMenu = []; let allMenuRaw = {}; 
        let globalOptions = []; let globalOptionsRaw = {};
        let allTables = []; 
        let staffData = {}; let cart = [];
        let currentUser = (function() {
            try {
                const saved = localStorage.getItem('bdc_current_user');
                return saved ? JSON.parse(saved) : null;
            } catch (e) {
                console.error("localStorage current user parse error:", e);
                return null;
            }
        })(); 
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
        
        // 📱 ฟังก์ชันดึงรหัสเครื่องและระบบเครื่องสำหรับ Audit Log
        function getDeviceID() {
            let id = localStorage.getItem('bdc_device_uuid');
            if (!id) {
                // สร้าง ID แบบสุ่ม 8 หลัก
                id = 'bdc-' + Math.random().toString(36).substring(2, 10);
                localStorage.setItem('bdc_device_uuid', id);
            }
            return id;
        }

        function getDeviceInfo() {
            const ua = navigator.userAgent;
            let device = "ไม่ระบุอุปกรณ์";
            let browser = "ไม่ระบุเบราว์เซอร์";

            // ตรวจสอบเครื่องและ OS
            if (/iPhone/i.test(ua)) {
                device = "iPhone";
            } else if (/iPad/i.test(ua)) {
                device = "iPad";
            } else if (/Android/i.test(ua)) {
                const modelMatch = ua.match(/Android[^;]+;\s+([^;\)]+)/);
                device = modelMatch ? modelMatch[1].trim() : "Android Device";
            } else if (/Macintosh/i.test(ua)) {
                device = "Mac OS";
            } else if (/Windows/i.test(ua)) {
                device = "Windows PC";
            } else if (/Linux/i.test(ua)) {
                device = "Linux PC";
            }

            // ตรวจสอบเบราว์เซอร์
            if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua) && !/OPR/i.test(ua)) {
                browser = "Chrome";
            } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
                browser = "Safari";
            } else if (/Firefox/i.test(ua)) {
                browser = "Firefox";
            } else if (/Edg|Edge/i.test(ua)) {
                browser = "Edge";
            } else if (/OPR|Opera/i.test(ua)) {
                browser = "Opera";
            } else if (/FBAN|FBAV/i.test(ua)) {
                browser = "FB App";
            } else if (/Line/i.test(ua)) {
                browser = "Line App";
            }

            return `${device} (${browser})`;
        }

        // 🌟 ฟังก์ชันส่งข้อมูลประวัติการทำงานไปยัง Firebase (Audit Log)
        async function logActivity(actionType, detail) {
            if(!currentUser) return;
            const payload = {
                timestamp: new Date().toISOString(),
                staffName: currentUser.Name || 'System',
                role: currentUser.Role || currentUser.Position || 'Staff',
                action: actionType,
                detail: detail,
                deviceId: getDeviceID(),
                deviceInfo: getDeviceInfo()
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

        // 🧪 ระบบเคลียร์ขยะข้อมูลทดสอบเบื้องหลังอัตโนมัติ (ลบข้อมูลที่อายุเกิน 30 วัน)
        async function runTestBackgroundCleanup() {
            try {
                console.log("[Test Mode] Checking for old test data to auto-cleanup...");
                const retentionDays = 30; // ลบข้อมูลทดสอบที่เก่ากว่า 30 วัน
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - retentionDays);
                const cutoffTime = cutoff.getTime();

                const [ordersData, historyData, logsData] = await Promise.all([
                    fetchFirebaseJson('ActiveOrders'),
                    fetchFirebaseJson('OrderHistory'),
                    fetchFirebaseJson('AuditLogs')
                ]);

                // 1. เคลียร์คิวออเดอร์ค้างในห้องทดสอบ (ActiveOrders)
                const oldActiveKeys = [];
                for (let key in ordersData) {
                    const order = ordersData[key];
                    if (order && order.timestamp) {
                        const time = new Date(order.timestamp).getTime();
                        if (!Number.isNaN(time) && time < cutoffTime) {
                            oldActiveKeys.push(key);
                        }
                    }
                }
                if (oldActiveKeys.length > 0) {
                    await deleteKeysInChunks('ActiveOrders', oldActiveKeys);
                    console.log(`[Test Mode] Auto-cleanup: Deleted ${oldActiveKeys.length} old active test orders`);
                }

                // 2. เคลียร์ประวัติยอดขายแยกรายวัน (OrderHistory)
                const oldHistoryDates = [];
                for (let dateStr in historyData) {
                    const time = new Date(dateStr).getTime();
                    if (!Number.isNaN(time) && time < cutoffTime) {
                        oldHistoryDates.push(dateStr);
                    }
                }
                if (oldHistoryDates.length > 0) {
                    await Promise.all(oldHistoryDates.map(dateKey => 
                        fetch(`${FIREBASE_URL}TestData/OrderHistory/${dateKey}.json`, { method: 'DELETE' })
                    ));
                    console.log(`[Test Mode] Auto-cleanup: Deleted ${oldHistoryDates.length} old test history dates:`, oldHistoryDates);
                }

                // 3. เคลียร์บันทึกการทำงานของโหมดทดสอบ (AuditLogs)
                const oldLogKeys = [];
                for (let key in logsData) {
                    const log = logsData[key];
                    if (log && log.timestamp) {
                        const time = new Date(log.timestamp).getTime();
                        if (!Number.isNaN(time) && time < cutoffTime) {
                            oldLogKeys.push(key);
                        }
                    }
                }
                if (oldLogKeys.length > 0) {
                    await deleteKeysInChunks('AuditLogs', oldLogKeys);
                    console.log(`[Test Mode] Auto-cleanup: Deleted ${oldLogKeys.length} old test audit logs`);
                }
                console.log("[Test Mode] Background auto-cleanup completed successfully.");
            } catch (e) {
                console.error("[Test Mode] Error running background auto-cleanup:", e);
            }
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
                    else allTables = Object.values(tblData).filter(t => t);
                }
                allTables = allTables.map(t => String(t || '').trim()).filter(t => t);
                if(allTables.length === 0) allTables = ['A1', 'A2', 'B1']; 
                allTables.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));

                res = await fetch(`${FIREBASE_URL}AppSettings.json`);
                const settingsData = await res.json();
                if(settingsData) {
                    appSettings = {
                        ...appSettings,
                        ...settingsData,
                        receipt: { ...appSettings.receipt, ...(settingsData.receipt || {}) }
                    };
                }

                // 🧪 รันระบบเคลียร์ขยะข้อมูลทดสอบเบื้องหลังอัตโนมัติ
                if (IS_TEST_MODE) {
                    runTestBackgroundCleanup();
                }

            } catch (e) { console.error("Load Error:", e); }
        }
