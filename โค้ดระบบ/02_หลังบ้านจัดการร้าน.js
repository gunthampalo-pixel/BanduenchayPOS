        // ==========================================
        // 🌟 APP ADMIN: โค้ดสำหรับระบบหลังบ้าน 
        // ==========================================
        const appAdmin = {
            editingMenuKey: null,
            editingOptionId: null,
            editingStaffId: null,
            currentVariants: [],

            verifyOwnerPin: function(pin) {
                return String(pin || '').trim() === String(appSettings.ownerPin || '1234').trim();
            },

            openOwnerSettingsModal: function() {
                if(!currentUser) return alert("⚠️ กรุณาเข้าสู่ระบบก่อนครับ");
                const p = currentUser.Permissions || {};
                const role = String(currentUser.Role || '').toLowerCase();
                const isAdmin = p.admin || role.includes('admin') || role.includes('manager');
                if(!isAdmin) return alert("⚠️ เมนูนี้สำหรับเจ้าของร้าน/Admin เท่านั้นครับ");

                const pin = prompt("ใส่ Owner PIN เพื่อเปิดตั้งค่าใบเสร็จ/PromptPay");
                if(!this.verifyOwnerPin(pin)) return alert("❌ Owner PIN ไม่ถูกต้อง");

                const receipt = appSettings.receipt || {};
                document.getElementById('ownerSettingsPinInput').value = "";
                document.getElementById('receiptShopName').value = receipt.shopName || "";
                document.getElementById('receiptPhone').value = receipt.phone || "";
                document.getElementById('receiptLogoUrl').value = receipt.logoUrl || "";
                document.getElementById('receiptAddress').value = receipt.address || "";
                document.getElementById('receiptFacebook').value = receipt.facebook || "";
                document.getElementById('promptPayName').value = receipt.promptPayName || "";
                document.getElementById('promptPayQrUrl').value = receipt.promptPayQrUrl || "";
                document.getElementById('receiptNote').value = receipt.note || "";
                document.getElementById('newOwnerPin').value = "";
                document.getElementById('ownerSettingsModal').classList.remove('hidden');
            },

            closeOwnerSettingsModal: function() {
                document.getElementById('ownerSettingsModal').classList.add('hidden');
            },

            saveOwnerSettings: async function() {
                const ownerPin = document.getElementById('ownerSettingsPinInput').value;
                if(!this.verifyOwnerPin(ownerPin)) return alert("❌ Owner PIN ไม่ถูกต้อง ไม่สามารถบันทึกได้");

                const newPin = document.getElementById('newOwnerPin').value.trim();
                const payload = {
                    ownerPin: newPin || appSettings.ownerPin || "1234",
                    receipt: {
                        shopName: document.getElementById('receiptShopName').value.trim(),
                        phone: document.getElementById('receiptPhone').value.trim(),
                        logoUrl: document.getElementById('receiptLogoUrl').value.trim(),
                        address: document.getElementById('receiptAddress').value.trim(),
                        facebook: document.getElementById('receiptFacebook').value.trim(),
                        promptPayName: document.getElementById('promptPayName').value.trim(),
                        promptPayQrUrl: document.getElementById('promptPayQrUrl').value.trim(),
                        note: document.getElementById('receiptNote').value.trim()
                    }
                };

                const btn = document.getElementById('btnSaveOwnerSettings');
                const oldText = btn.innerHTML;
                btn.innerHTML = "⏳ กำลังบันทึก...";
                btn.disabled = true;
                try {
                    await fetch(`${FIREBASE_URL}AppSettings.json`, { method: 'PUT', body: JSON.stringify(payload) });
                    appSettings = payload;
                    await logActivity('SAVE_SETTINGS', 'แก้ไขตั้งค่าใบเสร็จ/PromptPay');
                    alert("✅ บันทึกตั้งค่าใบเสร็จและ PromptPay เรียบร้อยแล้ว");
                    this.closeOwnerSettingsModal();
                } catch(e) {
                    alert("❌ บันทึกตั้งค่าไม่สำเร็จ: " + e.message);
                } finally {
                    btn.innerHTML = oldText;
                    btn.disabled = false;
                }
            },
            
            openClearDataModal: async function() {
                // เช็คสิทธิ์ก่อน
                if(!currentUser) return alert("⚠️ กรุณาเข้าสู่ระบบก่อนครับ");
                let p = currentUser.Permissions || {};
                const isAdmin = p.admin || (currentUser.Role || "").toLowerCase().includes('admin') || (currentUser.Role || "").toLowerCase().includes('manager');
                if(!isAdmin) return alert("⚠️ เฉพาะผู้จัดการ (Admin) เท่านั้นที่สามารถล้างข้อมูลระบบได้ครับ");

                document.getElementById('adminClearDataModal').classList.remove('hidden');
                document.getElementById('dataRangeDisplay').innerText = "กำลังตรวจสอบ...";
                document.getElementById('oldOrdersCount').innerText = "0";
                document.getElementById('oldLogsCount').innerText = "0";
                document.getElementById('clearConfirmPin').value = "";

                try {
                    const cutoffDate = getCleanupCutoffDate();
                    const cutoffTime = cutoffDate.getTime();
                    const [ordersData, historyData, logsData] = await Promise.all([
                        fetchFirebaseJson('Orders'),
                        fetchFirebaseJson('OrderHistory'),
                        fetchFirebaseJson('AuditLogs')
                    ]);
                    
                    // สแกนบิลแบบเก่า
                    const oldOrderKeys = getCleanupKeys(ordersData, cutoffTime, shouldCleanupOrder);
                    let oldOrdersCount = oldOrderKeys.length;
                    
                    // สแกนบิลแบบใหม่ (แยกรายวัน)
                    for (let dateStr in historyData) {
                        const time = new Date(dateStr).getTime();
                        if (!Number.isNaN(time) && time < cutoffTime) {
                            const dayOrders = historyData[dateStr] || {};
                            oldOrdersCount += Object.keys(dayOrders).length;
                        }
                    }
                    
                    const oldLogKeys = getCleanupKeys(logsData, cutoffTime, (log, time) => log && log.timestamp && isOldTimestamp(log.timestamp, time));
                    document.getElementById('oldOrdersCount').innerText = oldOrdersCount.toLocaleString();
                    document.getElementById('oldLogsCount').innerText = oldLogKeys.length.toLocaleString();
                    document.getElementById('dataRangeDisplay').innerText = `เก่ากว่า ${cutoffDate.toLocaleDateString('th-TH')} (${CLEANUP_RETENTION_DAYS} วัน)`;
                } catch(e) {
                     document.getElementById('dataRangeDisplay').innerText = `ตรวจสอบไม่สำเร็จ: ${e.message}`;
                }
            },

            closeClearDataModal: function() {
                document.getElementById('adminClearDataModal').classList.add('hidden');
            },

            executeClearData: async function() {
                const pin = document.getElementById('clearConfirmPin').value;
                
                // 🌟 แก้ปัญหา PIN ที่เป็นตัวเลขในฐานข้อมูลไม่ตรงกับข้อความที่พิมพ์
                const expectedPin = String(currentUser?.Password ?? currentUser?.PIN ?? "").trim();
                if(!expectedPin || String(pin).trim() !== expectedPin) {
                    return alert("❌ รหัสผ่าน (PIN) ไม่ถูกต้อง!");
                }

                const cutoffDate = getCleanupCutoffDate();
                const cutoffTime = cutoffDate.getTime();
                const okToDelete = confirm(`⚠️ ยืนยันการเคลียร์ข้อมูลเก่า ⚠️\n\nระบบจะลบเฉพาะข้อมูลที่มีอายุมากกว่า ${CLEANUP_RETENTION_DAYS} วัน\n- บิลยอดขายที่จบแล้ว (ทั้งแบบเก่าและแบบใหม่)\n- ประวัติการเข้าใช้งานและการทำรายการ\n\nข้อมูลเมนู พนักงาน โต๊ะ ท็อปปิ้ง และออเดอร์ที่ยังเปิดอยู่จะไม่ถูกลบ\n\nกด OK เพื่อเริ่มลบข้อมูลเก่า`);
                if (!okToDelete) return;

                const btn = document.getElementById('btnConfirmClear');
                const oldText = btn.innerHTML;
                btn.innerHTML = "⏳ กำลังกวาดลบข้อมูล...";
                btn.disabled = true;

                try {
                    const [ordersData, historyData, logsData] = await Promise.all([
                        fetchFirebaseJson('Orders'),
                        fetchFirebaseJson('OrderHistory'),
                        fetchFirebaseJson('AuditLogs')
                    ]);
                    
                    // 1. เคลียร์บิลรูปแบบเก่า ( Orders/ )
                    const oldOrderKeys = getCleanupKeys(ordersData, cutoffTime, shouldCleanupOrder);
                    const deletedLegacyCount = await deleteKeysInChunks('Orders', oldOrderKeys);
                    
                    // 2. เคลียร์บิลรูปแบบใหม่รายวัน ( OrderHistory/YYYY-MM-DD )
                    const oldHistoryDates = [];
                    let deletedHistoryOrdersCount = 0;
                    for (let dateStr in historyData) {
                        const time = new Date(dateStr).getTime();
                        if (!Number.isNaN(time) && time < cutoffTime) {
                            oldHistoryDates.push(dateStr);
                            const dayOrders = historyData[dateStr] || {};
                            deletedHistoryOrdersCount += Object.keys(dayOrders).length;
                        }
                    }
                    if (oldHistoryDates.length > 0) {
                        const patch = {};
                        oldHistoryDates.forEach(dateStr => { patch[dateStr] = null; });
                        await patchFirebase('OrderHistory', patch);
                    }
                    
                    // 3. เคลียร์ประวัติการทำงานเก่า
                    const oldLogKeys = getCleanupKeys(logsData, cutoffTime, (log, time) => log && log.timestamp && isOldTimestamp(log.timestamp, time));
                    const deletedLogsCount = await deleteKeysInChunks('AuditLogs', oldLogKeys);

                    const deletedOrdersTotal = deletedLegacyCount + deletedHistoryOrdersCount;
                    const cutoffFormat = cutoffDate.toLocaleDateString('th-TH');
                    await logActivity('SYSTEM_WIPE', `ล้างข้อมูลเก่ากว่า ${CLEANUP_RETENTION_DAYS} วัน (ก่อน ${cutoffFormat}) ลบบิลรวม: ${deletedOrdersTotal}, ลบประวัติ: ${deletedLogsCount}`);

                    alert(`✅ ล้างข้อมูลเก่ากว่า ${CLEANUP_RETENTION_DAYS} วันเรียบร้อยแล้ว!\n\n🗑️ ลบบิลที่จบแล้วทั้งหมด: ${deletedOrdersTotal} รายการ\n🗑️ ลบประวัติการใช้งาน: ${deletedLogsCount} รายการ\n\nข้อมูลตั้งค่าร้านและออเดอร์ที่ยังเปิดอยู่ไม่ถูกแตะครับ`);
                    
                    this.closeClearDataModal();
                    
                    // สั่งรีเฟรชหน้าจอ
                    activeOrders = {};
                    window.currentPaidOrders = [];
                    renderKitchen(); renderStatus(); renderCashier();
                    fetchSalesData();
                } catch (e) {
                    alert("❌ เกิดข้อผิดพลาดในการลบข้อมูล: " + e.message);
                } finally {
                    btn.innerHTML = oldText;
                    btn.disabled = false;
                }
            },

            openClearAuditLogModal: async function() {
                // เช็คสิทธิ์ก่อน
                if(!currentUser) return alert("⚠️ กรุณาเข้าสู่ระบบก่อนครับ");
                let p = currentUser.Permissions || {};
                const isAdmin = p.admin || (currentUser.Role || "").toLowerCase().includes('admin') || (currentUser.Role || "").toLowerCase().includes('manager');
                if(!isAdmin) return alert("⚠️ เฉพาะผู้จัดการ (Admin) เท่านั้นที่สามารถล้างประวัติการทำงานได้ครับ");

                document.getElementById('adminClearAuditLogModal').classList.remove('hidden');
                document.getElementById('auditLogRangeDisplay').innerText = "กำลังตรวจสอบ...";
                document.getElementById('oldAuditLogsCount').innerText = "0";
                document.getElementById('clearAuditLogConfirmPin').value = "";

                try {
                    const cutoffDate = getCleanupCutoffDate();
                    const cutoffTime = cutoffDate.getTime();
                    const logsData = await fetchFirebaseJson('AuditLogs');
                    
                    const oldLogKeys = getCleanupKeys(logsData, cutoffTime, (log, time) => log && log.timestamp && isOldTimestamp(log.timestamp, time));
                    document.getElementById('oldAuditLogsCount').innerText = oldLogKeys.length.toLocaleString();
                    document.getElementById('auditLogRangeDisplay').innerText = `เก่ากว่า ${cutoffDate.toLocaleDateString('th-TH')} (${CLEANUP_RETENTION_DAYS} วัน)`;
                } catch(e) {
                     document.getElementById('auditLogRangeDisplay').innerText = `ตรวจสอบไม่สำเร็จ: ${e.message}`;
                }
            },

            closeClearAuditLogModal: function() {
                document.getElementById('adminClearAuditLogModal').classList.add('hidden');
            },

            executeClearAuditLog: async function() {
                const pin = document.getElementById('clearAuditLogConfirmPin').value;
                const expectedPin = String(currentUser?.Password ?? currentUser?.PIN ?? "").trim();
                if(!expectedPin || String(pin).trim() !== expectedPin) {
                    return alert("❌ รหัสผ่าน (PIN) ไม่ถูกต้อง!");
                }

                const cutoffDate = getCleanupCutoffDate();
                const cutoffTime = cutoffDate.getTime();
                const okToDelete = confirm(`⚠️ ยืนยันการล้างประวัติการทำงานเก่า ⚠️\n\nระบบจะลบเฉพาะประวัติการทำงาน (Audit Logs) ที่มีอายุมากกว่า ${CLEANUP_RETENTION_DAYS} วัน\n\nบิลยอดขาย เมนู โต๊ะ และข้อมูลอื่นๆ จะไม่ถูกลบ\n\nกด OK เพื่อเริ่มลบประวัติการทำงาน`);
                if (!okToDelete) return;

                const btn = document.getElementById('btnConfirmClearAudit');
                const oldText = btn.innerHTML;
                btn.innerHTML = "⏳ กำลังลบประวัติ...";
                btn.disabled = true;

                try {
                    const logsData = await fetchFirebaseJson('AuditLogs');
                    const oldLogKeys = getCleanupKeys(logsData, cutoffTime, (log, time) => log && log.timestamp && isOldTimestamp(log.timestamp, time));
                    const deletedLogsCount = await deleteKeysInChunks('AuditLogs', oldLogKeys);

                    const cutoffFormat = cutoffDate.toLocaleDateString('th-TH');
                    await logActivity('SYSTEM_WIPE', `ล้างประวัติการทำงานเก่ากว่า ${CLEANUP_RETENTION_DAYS} วัน (ก่อน ${cutoffFormat}) ลบประวัติรวม: ${deletedLogsCount}`);

                    alert(`✅ ล้างประวัติการทำงานเก่ากว่า ${CLEANUP_RETENTION_DAYS} วันเรียบร้อยแล้ว!\n\n🗑️ ลบประวัติการใช้งานรวม: ${deletedLogsCount} รายการ`);
                    this.closeClearAuditLogModal();
                    this.fetchAndRenderAuditLogs();
                } catch (e) {
                    alert("❌ เกิดข้อผิดพลาดในการลบประวัติ: " + e.message);
                } finally {
                    btn.innerHTML = oldText;
                    btn.disabled = false;
                }
            },

            // --- ระบบประวัติการทำงาน (Audit Log) ---
            openAuditLogModal: function() {
                document.getElementById('adminAuditLogModal').classList.remove('hidden');
                this.fetchAndRenderAuditLogs();
            },
            fetchAndRenderAuditLogs: async function() {
                const container = document.getElementById('adminAuditLogContainer');
                container.innerHTML = `<div class="text-center py-10 text-gray-400">กำลังโหลดข้อมูล...</div>`;
                try {
                    let res = await fetch(`${FIREBASE_URL}AuditLogs.json`);
                    let data = await res.json();
                    if(!data) { container.innerHTML = `<div class="text-center py-10 text-gray-400">ยังไม่มีประวัติการทำงานในระบบ</div>`; return; }
                    
                    let logs = Object.values(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    logs = logs.slice(0, 500); 
                    
                    let html = logs.map(log => {
                        let t = new Date(log.timestamp);
                        let dateStr = t.toLocaleDateString('th-TH') + ' ' + t.toLocaleTimeString('th-TH');
                        let icon = "fa-info-circle text-blue-500";
                        if((log.action||'').includes('CANCEL') || (log.action||'').includes('DELETE')) icon = "fa-trash-can text-red-500";
                        if(log.action === 'PAYMENT') icon = "fa-money-bill-wave text-green-500";
                        if(log.action === 'LOGIN') icon = "fa-right-to-bracket text-purple-500";
                        if(log.action === 'NEW_ORDER') icon = "fa-bell-concierge text-orange-500";
                        if((log.action||'').includes('SAVE')) icon = "fa-floppy-disk text-indigo-500";
                        if((log.action||'').includes('WIPE')) icon = "fa-skull-crossbones text-red-700";
                        
                        return `
                        <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                            <div class="flex justify-between items-start mb-1">
                                <span class="font-bold text-slate-800 text-sm"><i class="fa-solid ${icon} mr-1"></i> ${log.action}</span>
                                <span class="text-[10px] text-slate-400"><i class="fa-solid fa-clock"></i> ${dateStr}</span>
                            </div>
                            <p class="text-xs text-slate-600 mb-1">${log.detail}</p>
                            <p class="text-[10px] text-slate-500 bg-slate-50 inline-block px-1.5 py-0.5 rounded border">👤 ทำรายการโดย: <b>${log.staffName}</b> (${log.role})</p>
                        </div>`;
                    }).join('');
                    container.innerHTML = html;
                } catch(e) { container.innerHTML = `<div class="text-center py-10 text-red-400">โหลดข้อมูลไม่สำเร็จ</div>`; }
            },

            exportAuditLogToExcel: async function() {
                try {
                    let res = await fetch(`${FIREBASE_URL}AuditLogs.json`);
                    let data = await res.json();
                    if(!data) return alert("ไม่มีประวัติการทำงานในระบบครับ");
                    
                    let logs = Object.values(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    let csvContent = "\uFEFF"; 
                    csvContent += "วันที่,เวลา,พนักงาน,ตำแหน่ง (สิทธิ์),การกระทำ (Action),รายละเอียด\n";
                    
                    logs.forEach(log => {
                        let t = new Date(log.timestamp);
                        let dateStr = t.toLocaleDateString('th-TH');
                        let timeStr = t.toLocaleTimeString('th-TH');
                        
                        let staffName = `"${(log.staffName || 'System').replace(/"/g, '""')}"`;
                        let role = `"${(log.role || 'Staff').replace(/"/g, '""')}"`;
                        let action = `"${(log.action || '-').replace(/"/g, '""')}"`;
                        let detail = `"${(log.detail || '-').replace(/"/g, '""')}"`;
                        
                        csvContent += [dateStr, timeStr, staffName, role, action, detail].join(",") + "\n";
                    });
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `ประวัติการทำงาน_AuditLog_${new Date().toLocaleDateString('th-TH').replace(/\//g,'-')}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch(e) {
                    alert("❌ เกิดข้อผิดพลาดในการโหลด Excel");
                }
            },

            // --- ดึงข้อมูลเมนูออกเป็น Excel ---
            exportMenuToExcel: function() {
                if(allMenu.length === 0) return alert("ไม่มีข้อมูลเมนูในระบบครับ");
                let csvContent = "\uFEFF";
                csvContent += "ชื่อเมนู,หมวดหมู่,ราคา,รูปแบบ,ท็อปปิ้ง,รูปภาพ\n";
                
                const sortedMenu = [...allMenu].sort((a,b) => (a.Category||'').localeCompare(b.Category||''));
                
                sortedMenu.forEach(item => {
                    let name = `"${(item.Name || '').replace(/"/g, '""')}"`;
                    let cat = `"${(item.Category || '').replace(/"/g, '""')}"`;
                    let price = item.Price || 0;
                    
                    let variants = "";
                    if(item.Variants && item.Variants.length > 0) {
                        if(item.Variants.length === 1 && item.Variants[0].name === "ปกติ") {
                            variants = "";
                        } else {
                            variants = `"${item.Variants.map(v => `${v.name}:${v.price}`).join(' | ')}"`;
                        }
                    }

                    let optSets = "";
                    if(item.OptionSets && item.OptionSets.length > 0) {
                        let setNames = item.OptionSets.map(optId => {
                            let f = globalOptions.find(o => o.id === optId);
                            return f ? f.name : optId;
                        });
                        optSets = `"${setNames.join(' | ').replace(/"/g, '""')}"`;
                    }

                    let img = item.ImageURL && item.ImageURL !== "-" ? `"${item.ImageURL.replace(/"/g, '""')}"` : '""';

                    csvContent += [name, cat, price, variants, optSets, img].join(",") + "\n";
                });
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `ฐานข้อมูลเมนูอาหาร_BDC_${new Date().toLocaleDateString('th-TH').replace(/\//g,'-')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },

            // --- ดึงข้อมูลคลังท็อปปิ้งออกเป็น Excel ---
            exportOptionsToExcel: function() {
                if(globalOptions.length === 0) return alert("ไม่มีข้อมูลคลังเซ็ตท็อปปิ้งในระบบครับ");
                let csvContent = "\uFEFF";
                csvContent += "ชื่อกลุ่มตัวเลือก,ประเภทการเลือก,รายการ (ชื่อ:ราคาบวกเพิ่ม)\n";
                
                globalOptions.forEach(opt => {
                    let name = `"${(opt.name || '-').replace(/"/g, '""')}"`;
                    let type = `"${(opt.type || '-').replace(/"/g, '""')}"`;
                    let items = "-";
                    if(opt.items && opt.items.length > 0) {
                        items = `"${opt.items.map(i => `${i.name}(+${i.price}บ.)`).join(' | ')}"`;
                    }
                    csvContent += [name, type, items].join(",") + "\n";
                });
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `ฐานข้อมูลท็อปปิ้ง_BDC_${new Date().toLocaleDateString('th-TH').replace(/\//g,'-')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },

            // --- ระบบจัดการพนักงาน ---
            openStaffManagerModal: function() {
                if(!currentUser) return alert("⚠️ กรุณาเข้าสู่ระบบก่อนครับ");
                const p = currentUser.Permissions || {};
                if(!p.admin) return alert("⚠️ คุณไม่มีสิทธิ์จัดการบัญชีพนักงานครับ");
                document.getElementById('adminStaffManagerModal').classList.remove('hidden');
                this.renderStaffList();
            },
            renderStaffList: function() {
                const container = document.getElementById('adminStaffListContainer');
                if(!staffData || Object.keys(staffData).length === 0) {
                    container.innerHTML = `<div class="text-center py-10 text-gray-400">ยังไม่มีข้อมูลพนักงาน</div>`;
                    return;
                }
                let html = "";
                for(let id in staffData) {
                    const staff = staffData[id];
                    if(staff) {
                        let pIcons = "";
                        let p = staff.Permissions;
                        if(p) {
                            if(p.order) pIcons += "🛒 ";
                            if(p.kitchen) pIcons += "🧑‍🍳 ";
                            if(p.cashier) pIcons += "💰 ";
                            if(p.discount) pIcons += "🏷️ ";
                            if(p.sales) pIcons += "📊 ";
                            if(p.menu) pIcons += "🍔 ";
                            if(p.topping) pIcons += "🥤 ";
                            if(p.table) pIcons += "🪑 ";
                            if(p.admin) pIcons += "⚙️ ";
                        } else {
                            pIcons = "🔄 รอตั้งค่าสิทธิ์ใหม่";
                        }

                        html += `
                        <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div class="overflow-hidden pr-2">
                                <p class="font-bold text-slate-800 text-sm truncate">${staff.Name}</p>
                                <div class="flex gap-2 items-center mt-1 flex-wrap">
                                    <span class="text-xs text-slate-500">User: <b>${staff.Username || staff.ID || '-'}</b></span>
                                    <span class="text-xs text-slate-400">Pass: <b>${staff.Password || staff.PIN || '-'}</b></span>
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded border">สิทธิ์เข้าถึง: ${pIcons}</p>
                            </div>
                            <div class="flex gap-1 shrink-0">
                                <button onclick="appAdmin.openStaffFormModal('${id}')" class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-pen"></i></button>
                                <button onclick="appAdmin.deleteStaff('${id}', '${staff.Name}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>`;
                    }
                }
                container.innerHTML = html;
            },
            openStaffFormModal: function(id = null) {
                this.editingStaffId = id;
                const modalTitle = document.getElementById('adminStaffFormTitle');
                const nameInput = document.getElementById('staffFullName');
                const usernameInput = document.getElementById('staffUsername');
                const passwordInput = document.getElementById('staffPassword');
                
                const cbOrder = document.getElementById('permOrder');
                const cbKitchen = document.getElementById('permKitchen');
                const cbCashier = document.getElementById('permCashier');
                const cbDiscount = document.getElementById('permDiscount');
                const cbSales = document.getElementById('permSales');
                const cbAdmin = document.getElementById('permAdmin');
                const cbMenu = document.getElementById('permMenu');
                const cbTopping = document.getElementById('permTopping');
                const cbTable = document.getElementById('permTable');

                if (id) {
                    const staff = staffData[id];
                    if(!staff) return;
                    modalTitle.innerText = "แก้ไขข้อมูลพนักงาน";
                    nameInput.value = staff.Name || "";
                    usernameInput.value = staff.Username || staff.ID || "";
                    passwordInput.value = staff.Password || staff.PIN || "";
                    
                    if (staff.Permissions) {
                        cbOrder.checked = staff.Permissions.order || false;
                        cbKitchen.checked = staff.Permissions.kitchen || false;
                        cbCashier.checked = staff.Permissions.cashier || false;
                        cbDiscount.checked = staff.Permissions.discount || staff.Permissions.admin || false;
                        cbSales.checked = staff.Permissions.sales || false;
                        cbAdmin.checked = staff.Permissions.admin || false;
                        cbMenu.checked = staff.Permissions.menu || staff.Permissions.admin || false;
                        cbTopping.checked = staff.Permissions.topping || staff.Permissions.admin || false;
                        cbTable.checked = staff.Permissions.table || staff.Permissions.admin || false;
                    } else {
                        const r = (staff.Role || staff.Position || '').toLowerCase();
                        cbOrder.checked = r.includes('waiter') || r.includes('admin') || r.includes('manager');
                        cbKitchen.checked = r.includes('kitchen') || r.includes('bar') || r.includes('admin') || r.includes('manager');
                        cbCashier.checked = r.includes('cashier') || r.includes('admin') || r.includes('manager');
                        cbDiscount.checked = r.includes('admin') || r.includes('manager') || r.includes('owner');
                        cbSales.checked = r.includes('admin') || r.includes('manager');
                        cbAdmin.checked = r.includes('admin') || r.includes('manager');
                        cbMenu.checked = r.includes('admin') || r.includes('manager');
                        cbTopping.checked = r.includes('admin') || r.includes('manager');
                        cbTable.checked = r.includes('admin') || r.includes('manager');
                    }
                } else {
                    modalTitle.innerText = "เพิ่มพนักงานใหม่";
                    nameInput.value = "";
                    usernameInput.value = "";
                    passwordInput.value = "";
                    cbOrder.checked = true; cbKitchen.checked = false; cbCashier.checked = false; cbDiscount.checked = false; cbSales.checked = false; cbAdmin.checked = false;
                    cbMenu.checked = false; cbTopping.checked = false; cbTable.checked = false;
                }
                document.getElementById('adminStaffFormModal').classList.remove('hidden');
            },
            closeStaffFormModal: function() {
                document.getElementById('adminStaffFormModal').classList.add('hidden');
                this.editingStaffId = null;
            },
            saveStaff: async function() {
                const name = document.getElementById('staffFullName').value.trim();
                const username = document.getElementById('staffUsername').value.trim();
                const password = document.getElementById('staffPassword').value.trim();
                
                if(!name || !username || !password) return alert('⚠️ กรุณากรอกข้อมูลพนักงานให้ครบทุกช่องด้วยครับ');

                const p = {
                    order: document.getElementById('permOrder').checked,
                    kitchen: document.getElementById('permKitchen').checked,
                    cashier: document.getElementById('permCashier').checked,
                    discount: document.getElementById('permDiscount').checked,
                    sales: document.getElementById('permSales').checked,
                    admin: document.getElementById('permAdmin').checked,
                    menu: document.getElementById('permMenu').checked,
                    topping: document.getElementById('permTopping').checked,
                    table: document.getElementById('permTable').checked
                };
                
                if(!p.order && !p.kitchen && !p.cashier && !p.discount && !p.sales && !p.admin && !p.menu && !p.topping && !p.table) {
                    return alert('⚠️ กรุณาติ๊กสิทธิ์การเข้าถึงอย่างน้อย 1 หน้าต่างครับ');
                }

                let fallbackRole = "Staff";
                if(p.admin) fallbackRole = "Manager";
                else if(p.cashier) fallbackRole = "Cashier";
                else if(p.kitchen) fallbackRole = "Kitchen";

                const payload = { Name: name, Username: username, Password: password, Role: fallbackRole, Permissions: p, PIN: password, ID: username };
                const saveId = this.editingStaffId || ('staff_' + Date.now());
                const btn = document.getElementById('btnSaveStaff');
                const oldText = btn.innerHTML; btn.innerHTML = "⏳ กำลังบันทึก..."; btn.disabled = true;

                try {
                    let res = await fetch(`${FIREBASE_URL}Staff/${saveId}.json`, { method: 'PUT', body: JSON.stringify(payload) });
                    if (!res.ok) throw new Error("Firebase ปฏิเสธการบันทึก");
                    alert('✅ บันทึกข้อมูลพนักงานพร้อมกำหนดสิทธิ์สำเร็จ!');
                    logActivity('SAVE_STAFF', `แก้ไข/เพิ่มบัญชีพนักงาน: ${name}`); 
                    this.closeStaffFormModal(); await fetchInitialData(); this.renderStaffList();
                } catch(e) {
                    alert('❌ บันทึกไม่สำเร็จ: ' + e.message);
                } finally { btn.innerHTML = oldText; btn.disabled = false; }
            },
            deleteStaff: function(id, name) {
                showModal('confirm', 'ลบพนักงาน', `⚠️ ยืนยันการลบคุณ "${name}" ออกจากระบบใช่หรือไม่?`, async () => {
                    try { await fetch(`${FIREBASE_URL}Staff/${id}.json`, { method: 'DELETE' }); alert('✅ ลบข้อมูลพนักงานสำเร็จ!'); logActivity('DELETE_STAFF', `ลบบัญชีพนักงาน: ${name}`); await fetchInitialData(); appAdmin.renderStaffList(); } catch(e) {}
                });
            },

            // --- ระบบจัดการผังโต๊ะ ---
            openTableManagerModal: function() {
                if(!currentUser) return alert("⚠️ กรุณาเข้าสู่ระบบก่อนครับ");
                const p = currentUser.Permissions || {};
                if(!p.admin && !p.table) return alert("⚠️ คุณไม่มีสิทธิ์จัดการผังโต๊ะครับ");
                document.getElementById('adminTableManagerModal').classList.remove('hidden');
                this.renderTableManagerList();
            },
            renderTableManagerList: function() {
                const container = document.getElementById('adminTableListContainer');
                if(allTables.length === 0) { container.innerHTML = `<p class="text-center text-slate-400 py-4">ยังไม่มีข้อมูลโต๊ะ</p>`; return; }
                container.innerHTML = allTables.map((tbl, idx) => `<div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center"><span class="font-bold text-slate-800"><i class="fa-solid fa-chair text-slate-400 mr-2"></i> ${tbl}</span><button onclick="appAdmin.deleteTable(${idx})" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-trash-can"></i></button></div>`).join('');
            },
             addTable: async function() {
                const name = document.getElementById('newTableName').value.trim();
                if(!name) return alert('กรุณาใส่ชื่อโต๊ะ');
                if(allTables.includes(name)) return alert('ชื่อโต๊ะนี้มีอยู่แล้ว');
                allTables.push(name); 
                allTables = allTables.map(t => String(t || '').trim()).filter(t => t);
                allTables.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
                try { 
                    await fetch(`${FIREBASE_URL}Tables.json`, { method: 'PUT', body: JSON.stringify(allTables) }); 
                    document.getElementById('newTableName').value = ''; 
                    logActivity('SAVE_TABLE', `เพิ่มผังโต๊ะ: ${name}`); 
                    await fetchInitialData();
                    this.renderTableManagerList(); 
                } catch(e) {}
            },
            deleteTable: function(idx) {
                const tblName = allTables[idx];
                showModal('confirm', 'ลบโต๊ะ', `ยืนยันการลบโต๊ะ "${tblName}" ใช่หรือไม่?`, async () => {
                    allTables.splice(idx, 1); 
                    try { 
                        await fetch(`${FIREBASE_URL}Tables.json`, { method: 'PUT', body: JSON.stringify(allTables) }); 
                        logActivity('DELETE_TABLE', `ลบผังโต๊ะ: ${tblName}`); 
                        await fetchInitialData();
                        appAdmin.renderTableManagerList(); 
                    } catch(e) {}
                });
            },

            // --- ตัวแปลงลิงก์ Google Drive ---
            convertDriveLink: function(url) {
                if (!url) return '';
                const driveRegex = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([\w-]+)/;
                const match = url.match(driveRegex);
                if (match && match[1]) { return `https://lh3.googleusercontent.com/d/${match[1]}`; }
                return url; 
            },

            // --- คลังเซ็ตท็อปปิ้ง (Global Toppings) ---
            openOptionManagerModal: function() {
                if(!currentUser) return alert("⚠️ กรุณาเข้าสู่ระบบก่อนครับ");
                const p = currentUser.Permissions || {};
                if(!p.admin && !p.topping) return alert("⚠️ คุณไม่มีสิทธิ์จัดการคลังเซ็ตท็อปปิ้งครับ");
                document.getElementById('adminOptionManagerModal').classList.remove('hidden');
                this.renderOptionManagerList();
            },
            renderOptionManagerList: function() {
                const container = document.getElementById('adminOptionManagerList');
                if(globalOptions.length === 0) { container.innerHTML = `<div class="text-center py-10 text-gray-400">ยังไม่มีเซ็ตท็อปปิ้ง</div>`; return; }
                container.innerHTML = globalOptions.map(opt => {
                    const itemsList = (opt.items || []).map(i => {
                        let isFree = Number(i.price) === 0; return `<li class="flex justify-between border-b border-slate-50 border-dashed pb-1 mb-1 last:border-0"><span>- ${i.name}</span> <span class="${isFree ? 'text-slate-400' : 'text-blue-600 font-bold'}">${isFree ? 'ฟรี' : '+฿'+i.price}</span></li>`;
                    }).join('');
                    let badgeClass = (opt.type || '').includes('บังคับ') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                    return `<div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200"><div class="flex justify-between items-start mb-3 border-b border-slate-100 pb-2"><div><h3 class="font-bold text-slate-800 text-lg">${opt.name}</h3><span class="${badgeClass} text-[10px] font-bold px-2 py-0.5 rounded">${opt.type || 'ไม่มีการระบุประเภท'}</span></div><div class="flex gap-1"><button onclick="appAdmin.openOptionSetModal('${opt.id}')" class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-pen"></i></button><button onclick="appAdmin.deleteOptionSet('${opt.id}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-trash-can"></i></button></div></div><ul class="text-sm text-slate-600">${itemsList}</ul></div>`;
                }).join('');
            },
            openOptionSetModal: function(id = null) {
                this.editingOptionId = id; const modalTitle = document.getElementById('optionSetModalTitle');
                if (id) { const opt = globalOptions.find(o => o.id === id); if(!opt) return; modalTitle.innerText = "แก้ไขเซ็ต: " + opt.name; document.getElementById('optSetName').value = opt.name; document.getElementById('optSetType').value = opt.type || "บังคับเลือก 1 อย่าง"; document.getElementById('optSetItemsContainer').innerHTML = (opt.items || []).map(i => this.genOptRow(i.name, i.price)).join(''); } 
                else { modalTitle.innerText = "สร้างเซ็ตท็อปปิ้งใหม่"; document.getElementById('optSetName').value = ""; document.getElementById('optSetType').value = "บังคับเลือก 1 อย่าง"; document.getElementById('optSetItemsContainer').innerHTML = this.genOptRow('', ''); }
                document.getElementById('optionSetModal').classList.remove('hidden');
            },
            closeOptionSetModal: function() { document.getElementById('optionSetModal').classList.add('hidden'); this.editingOptionId = null; },
            genOptRow: function(n, p) { return `<div class="flex gap-2 items-center opt-item-row"><input type="text" placeholder="เช่น ไข่มุก" value="${n}" class="opt-name flex-1 p-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:border-blue-500 outline-none"><div class="relative w-24"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">+฿</span><input type="number" placeholder="0" value="${p}" class="opt-price w-full pl-7 p-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:border-blue-500 outline-none"></div><button onclick="this.parentElement.remove()" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg">✕</button></div>`; },
            addOptionItemRow: function() { document.getElementById('optSetItemsContainer').insertAdjacentHTML('beforeend', this.genOptRow('', '')); },
            saveOptionSet: async function() {
                try {
                    const name = document.getElementById('optSetName').value.trim(); const type = document.getElementById('optSetType').value; const rows = document.querySelectorAll('#optSetItemsContainer .opt-item-row');
                    const newItems = []; let hasError = false;
                    rows.forEach(row => { const nameInput = row.querySelector('.opt-name'); const priceInput = row.querySelector('.opt-price'); if (!nameInput || !priceInput) return; const n = nameInput.value.trim(); const p = priceInput.value.trim(); if (!n && !p) return; if (!n) { hasError = true; } else { newItems.push({ name: n, price: Number(p) || 0 }); } });
                    if (!name) return alert('⚠️ กรุณาใส่ชื่อเซ็ตท็อปปิ้งด้วยครับ'); if (newItems.length === 0) return alert('⚠️ ต้องมีตัวเลือกอย่างน้อย 1 อย่างครับ'); if (hasError) return alert('⚠️ กรุณากรอกชื่อตัวเลือกให้ครบถ้วน');
                    const dataToSave = { name: name, type: type, items: newItems }; const saveId = this.editingOptionId || ('opt_' + Date.now());
                    const btn = document.getElementById('btnSaveOption'); const oldText = btn.innerHTML; btn.innerHTML = "⏳ กำลังบันทึก..."; btn.disabled = true;
                    let res = await fetch(`${FIREBASE_URL}Options/${saveId}.json`, { method: 'PUT', body: JSON.stringify(dataToSave) });
                    if (!res.ok) throw new Error("Firebase ปฏิเสธการเชื่อมต่อ");
                    alert('✅ บันทึกเซ็ตท็อปปิ้งสำเร็จ!'); 
                    logActivity('SAVE_TOPPING', `สร้าง/แก้ไขคลังท็อปปิ้ง: ${name}`); 
                    this.closeOptionSetModal(); await fetchInitialData(); this.renderOptionManagerList();
                    const cbElements = document.querySelectorAll('.opt-set-cb:checked'); const selOpts = Array.from(cbElements).map(cb => cb.value); this.renderOptionSetsCheckboxes(selOpts);
                    if(btn) { btn.innerHTML = oldText; btn.disabled = false; }
                } catch (e) { alert('❌ เกิดข้อผิดพลาด: ' + e.message); const btn = document.getElementById('btnSaveOption'); if(btn) { btn.innerHTML = "บันทึกเซ็ต"; btn.disabled = false; } }
            },
            deleteOptionSet: function(id) { showModal('confirm', 'ลบท็อปปิ้ง', 'ยืนยันการลบเซ็ตท็อปปิ้งนี้ใช่หรือไม่?', async () => { try { await fetch(`${FIREBASE_URL}Options/${id}.json`, { method: 'DELETE' }); logActivity('DELETE_TOPPING', `ลบคลังท็อปปิ้ง (ID: ${id})`); await fetchInitialData(); appAdmin.renderOptionManagerList(); } catch (e) {} }); },

            // --- จัดการเมนูอาหาร (Add Menu Form) ---
            openAdminMenuModal: function() {
                if(!currentUser) return alert("⚠️ กรุณาเข้าสู่ระบบก่อนครับ");
                const p = currentUser.Permissions || {};
                if(!p.admin && !p.menu) return alert("⚠️ คุณไม่มีสิทธิ์จัดการเมนูอาหารครับ");

                // โหลดหมวดหมู่ทั้งหมดเข้าตัวกรองด้านบนหลังบ้าน
                const filterSel = document.getElementById('adminMenuCategoryFilter');
                if (filterSel) {
                    const cats = ['All', 'Beverage', 'Food', 'Dessert', ...new Set(allMenu.map(m => m.Category).filter(Boolean))];
                    const uniqueCats = [...new Set(cats)];
                    const oldVal = filterSel.value || 'All';
                    filterSel.innerHTML = uniqueCats.map(c => `<option value="${c}">${c === 'All' ? 'ทั้งหมด' : c}</option>`).join('');
                    filterSel.value = uniqueCats.includes(oldVal) ? oldVal : 'All';
                }

                // รีเซ็ตสถานะ Checkbox และปุ่ม Bulk
                const selectAllCb = document.getElementById('adminMenuSelectAll');
                if(selectAllCb) selectAllCb.checked = false;
                this.updateBulkButtonState();

                document.getElementById('adminMenuModal').classList.remove('hidden');
                this.renderMenuList();
            },
            closeAdminMenuModal: function() { document.getElementById('adminMenuModal').classList.add('hidden'); },
            openMenuImportModal: function() {
                document.getElementById('menuImportText').value = "";
                document.getElementById('menuImportPreview').innerHTML = "วางตารางแล้วกด “ตรวจตัวอย่าง” ก่อนนำเข้า";
                document.getElementById('menuImportReplaceExisting').checked = false;
                document.getElementById('adminMenuImportModal').classList.remove('hidden');
            },
            closeMenuImportModal: function() {
                document.getElementById('adminMenuImportModal').classList.add('hidden');
            },
            fillMenuImportExample: function() {
                document.getElementById('menuImportText').value = [
                    "ชื่อเมนู\tหมวดหมู่\tราคา\tรูปแบบ\tท็อปปิ้ง\tรูปภาพ",
                    "อเมริกาโน่\tBeverage\t45\tร้อน:45 | เย็น:55 | ปั่น:65\tความหวาน | เพิ่มช็อต\t",
                    "ข้าวกะเพราหมูสับ\tFood\t65\tปกติ:65 | ไข่ดาว:75\tระดับความเผ็ด\t",
                    "เค้กกล้วยหอม\tDessert\t49\t\t\t"
                ].join("\n");
                this.previewMenuImport();
            },
            parseDelimitedLine: function(line, delimiter) {
                const cells = [];
                let current = "";
                let inQuotes = false;
                for(let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    if(ch === '"') {
                        if(inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                        else inQuotes = !inQuotes;
                    } else if(ch === delimiter && !inQuotes) {
                        cells.push(current.trim());
                        current = "";
                    } else {
                        current += ch;
                    }
                }
                cells.push(current.trim());
                return cells;
            },
            parseMenuImportRows: function() {
                const rawText = document.getElementById('menuImportText').value.trim();
                if(!rawText) return { rows: [], errors: ["ยังไม่มีข้อมูลในตาราง"] };

                const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
                const delimiter = lines[0].includes("\t") ? "\t" : ",";
                const header = this.parseDelimitedLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
                const aliases = {
                    name: ["ชื่อเมนู", "เมนู", "name", "menu", "menu name"],
                    category: ["หมวดหมู่", "หมวด", "category", "cat"],
                    price: ["ราคา", "price"],
                    variants: ["รูปแบบ", "variant", "variants", "ราคาแยก", "ตัวเลือก"],
                    optionSets: ["ท็อปปิ้ง", "เซ็ตท็อปปิ้ง", "options", "option sets", "topping"],
                    image: ["รูปภาพ", "รูป", "image", "imageurl", "image url"]
                };
                const col = {};
                Object.entries(aliases).forEach(([key, names]) => {
                    col[key] = header.findIndex(h => names.includes(h));
                });
                if(col.name < 0) return { rows: [], errors: ["ไม่พบคอลัมน์ชื่อเมนู"] };

                const optionMap = {};
                globalOptions.forEach(opt => optionMap[String(opt.name || '').trim().toLowerCase()] = opt.id);
                const rows = [];
                const errors = [];

                lines.slice(1).forEach((line, index) => {
                    const cells = this.parseDelimitedLine(line, delimiter);
                    const lineNo = index + 2;
                    const name = (cells[col.name] || '').trim();
                    if(!name) { errors.push(`แถว ${lineNo}: ไม่มีชื่อเมนู`); return; }
                    const category = (col.category >= 0 ? cells[col.category] : '') || 'ทั่วไป';
                    const basePrice = Number((col.price >= 0 ? cells[col.price] : '0') || 0);
                    const rawVariants = (col.variants >= 0 ? cells[col.variants] : '') || '';
                    let variants = [];
                    if(rawVariants.trim()) {
                        variants = rawVariants.split('|').map(v => {
                            const parts = v.split(':');
                            return { id: Date.now() + Math.random(), name: (parts[0] || '').trim(), price: Number((parts[1] || '').replace(/[^\d.]/g, '')) };
                        }).filter(v => v.name && !Number.isNaN(v.price));
                    }
                    if(variants.length === 0) {
                        if(Number.isNaN(basePrice) || basePrice < 0) { errors.push(`แถว ${lineNo}: ราคาไม่ถูกต้อง`); return; }
                        variants = [{ id: Date.now() + Math.random(), name: 'ปกติ', price: basePrice }];
                    }
                    const rawOptionSets = (col.optionSets >= 0 ? cells[col.optionSets] : '') || '';
                    const optionSets = rawOptionSets.split('|').map(v => v.trim()).filter(Boolean).map(name => optionMap[name.toLowerCase()] || name);
                    rows.push({
                        Name: name,
                        Category: category.trim() || 'ทั่วไป',
                        Price: Number(variants[0].price || 0),
                        Variants: variants,
                        OptionSets: optionSets,
                        ImageURL: (col.image >= 0 ? cells[col.image] : '') || ''
                    });
                });

                return { rows, errors };
            },
            previewMenuImport: function() {
                const { rows, errors } = this.parseMenuImportRows();
                const preview = document.getElementById('menuImportPreview');
                const samples = rows.slice(0, 5).map(item => `<div class="flex justify-between gap-3 py-1 border-b border-slate-100"><span><b>${item.Name}</b><span class="text-xs text-slate-400 ml-2">${item.Category}</span></span><span class="font-bold text-emerald-600">฿${item.Price.toLocaleString()}</span></div>`).join('');
                preview.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <p class="font-bold text-slate-800">พร้อมนำเข้า ${rows.length.toLocaleString()} เมนู</p>
                        ${errors.length ? `<span class="text-xs font-bold text-red-600">${errors.length} จุดต้องดู</span>` : `<span class="text-xs font-bold text-green-600">ข้อมูลดูโอเค</span>`}
                    </div>
                    ${samples || '<p class="text-slate-400 text-center py-3">ยังไม่มีแถวเมนูที่อ่านได้</p>'}
                    ${errors.length ? `<div class="mt-3 bg-red-50 border border-red-100 rounded-xl p-2 text-xs text-red-700 space-y-1">${errors.slice(0, 8).map(e => `<p>${e}</p>`).join('')}${errors.length > 8 ? `<p>...และอีก ${errors.length - 8} รายการ</p>` : ''}</div>` : ''}
                `;
                return { rows, errors };
            },
            executeMenuImport: async function() {
                const { rows, errors } = this.previewMenuImport();
                if(rows.length === 0) return alert("⚠️ ยังไม่มีเมนูที่นำเข้าได้ครับ");
                if(errors.length && !confirm(`พบข้อควรตรวจ ${errors.length} รายการ ต้องการนำเข้าแถวที่ถูกต้องต่อไหม?`)) return;
                const replaceExisting = document.getElementById('menuImportReplaceExisting').checked;
                const existingByName = {};
                allMenu.forEach(item => existingByName[String(item.Name || '').trim().toLowerCase()] = item._key);
                const patch = {};
                rows.forEach((item, idx) => {
                    const existingKey = existingByName[String(item.Name || '').trim().toLowerCase()];
                    const key = replaceExisting && existingKey ? existingKey : `menu_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
                    patch[key] = item;
                });
                const btn = document.getElementById('btnImportMenu');
                const oldText = btn.innerHTML;
                btn.innerHTML = "⏳ กำลังนำเข้า...";
                btn.disabled = true;
                try {
                    await patchFirebase('Menu', patch);
                    await logActivity('IMPORT_MENU', `นำเข้าเมนูจากตาราง ${rows.length} รายการ`);
                    alert(`✅ นำเข้าเมนูสำเร็จ ${rows.length.toLocaleString()} รายการ`);
                    this.closeMenuImportModal();
                    await fetchInitialData();
                    this.renderMenuList();
                    renderCategories();
                    filterMenu('All');
                } catch(e) {
                    alert("❌ นำเข้าเมนูไม่สำเร็จ: " + e.message);
                } finally {
                    btn.innerHTML = oldText;
                    btn.disabled = false;
                }
            },
            renderMenuList: function() {
                const container = document.getElementById('adminMenuListContainer');
                if(allMenu.length === 0) { container.innerHTML = `<div class="text-center py-10 text-gray-400">ยังไม่มีข้อมูลเมนู</div>`; return; }
                
                // โหลดเงื่อนไขตัวกรองหมวดหมู่
                const filterVal = document.getElementById('adminMenuCategoryFilter')?.value || 'All';
                let filteredMenu = [...allMenu];
                if (filterVal !== 'All') {
                    filteredMenu = filteredMenu.filter(m => m.Category === filterVal);
                }
                
                const sortedMenu = filteredMenu.sort((a,b) => (a.Category||'').localeCompare(b.Category||''));
                
                if (sortedMenu.length === 0) {
                    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm font-semibold">ไม่พบรายการเมนูอาหารในหมวดหมู่นี้</div>`;
                    return;
                }

                container.innerHTML = sortedMenu.map(item => {
                    let imgUrl = item.ImageURL ? this.convertDriveLink(item.ImageURL) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop';
                    
                    // แสดงลิสต์ท็อปปิ้งที่ผูกอยู่ย่อ
                    let toppingsText = "";
                    if (item.OptionSets && item.OptionSets.length > 0) {
                        const names = item.OptionSets.map(optId => {
                            const f = globalOptions.find(o => o.id === optId);
                            return f ? f.name : optId;
                        });
                        toppingsText = `<p class="text-[10px] text-indigo-500 font-semibold mt-0.5"><i class="fa-solid fa-list-check mr-1"></i>ท็อปปิ้ง: ${names.join(', ')}</p>`;
                    }

                    return `
                    <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <!-- Checkbox สำหรับ Bulk Actions -->
                            <input type="checkbox" data-key="${item._key}" onchange="appAdmin.updateBulkButtonState()" class="admin-menu-select w-5 h-5 text-blue-600 rounded cursor-pointer shrink-0">
                            
                            <div class="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                <img src="${imgUrl}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'">
                            </div>
                            
                            <div>
                                <p class="font-bold text-slate-800 text-sm line-clamp-1">${item.Name}</p>
                                <div class="flex gap-2 items-center mt-0.5 flex-wrap">
                                    <span class="text-xs font-semibold text-blue-600">฿${item.Price || (item.Variants && item.Variants[0] ? item.Variants[0].price : 0)}</span>
                                    <span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">${item.Category || 'ทั่วไป'}</span>
                                </div>
                                ${toppingsText}
                            </div>
                        </div>
                        
                        <div class="flex gap-1 shrink-0">
                            <button onclick="appAdmin.openAdminMenuFormModal('${item._key}')" class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="appAdmin.deleteMenu('${item._key}', '${item.Name}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>`;
                }).join('');
                
                this.updateBulkButtonState();
            },
            toggleComboForm: function() {
                const isCombo = document.getElementById('adminMenuIsCombo').checked;
                if (isCombo) {
                    document.getElementById('adminMenuBasePriceContainer').classList.remove('hidden');
                    document.getElementById('adminComboMenuFields').classList.remove('hidden');
                    document.getElementById('adminNormalMenuFields').classList.add('hidden');
                } else {
                    document.getElementById('adminMenuBasePriceContainer').classList.add('hidden');
                    document.getElementById('adminComboMenuFields').classList.add('hidden');
                    document.getElementById('adminNormalMenuFields').classList.remove('hidden');
                }
            },
            addComboStepRow: function(stepData = null) {
                const container = document.getElementById('adminComboStepsContainer');
                if (!container) return;
                const stepId = stepData ? stepData.id : Date.now() + Math.floor(Math.random() * 1000);
                const title = stepData ? stepData.title : '';
                const required = stepData ? (stepData.required !== false) : true;
                
                let type = 'pick_one';
                if (stepData) {
                    if (stepData.type) {
                        type = stepData.type;
                    } else if (stepData.items) {
                        type = stepData.items.length === 1 ? 'fixed_all' : 'pick_one';
                    }
                }
                const limit = (stepData && stepData.limit) ? stepData.limit : '';
                
                const html = `
                <div class="combo-step-row bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm relative space-y-3" data-step-id="${stepId}">
                    <button type="button" onclick="this.closest('.combo-step-row').remove()" class="absolute top-2.5 right-2.5 text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 w-6 h-6 rounded-full flex items-center justify-center">✕</button>
                    
                    <div class="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-1 block">ชื่อขั้นตอน (เช่น เลือกเครื่องดื่ม)</label>
                            <input type="text" class="combo-step-title w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none text-xs focus:ring-1 focus:ring-blue-500" value="${title}" placeholder="เช่น เลือกเครื่องดื่ม">
                        </div>
                        <div class="flex items-center gap-1 mt-5">
                            <input type="checkbox" class="combo-step-required w-4 h-4 text-blue-600 rounded cursor-pointer" ${required ? 'checked' : ''}>
                            <span class="text-xs text-slate-600 font-bold">บังคับเลือก</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-1 block">รูปแบบการเลือก</label>
                            <select class="combo-step-type w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none text-xs focus:ring-1 focus:ring-blue-500" onchange="appAdmin.onStepTypeChange('${stepId}')">
                                <option value="fixed_all" ${type === 'fixed_all' ? 'selected' : ''}>ได้ทุกรายการ (บังคับทั้งหมด)</option>
                                <option value="pick_one" ${type === 'pick_one' ? 'selected' : ''}>เลือก 1 รายการ (Radio)</option>
                                <option value="pick_many" ${type === 'pick_many' ? 'selected' : ''}>เลือกได้หลายรายการ (Checkbox)</option>
                            </select>
                        </div>
                        <div class="combo-step-limit-container ${type === 'pick_many' ? '' : 'hidden'}" id="stepLimitContainer_${stepId}">
                            <label class="text-xs font-bold text-slate-500 mb-1 block">จำนวนรายการสูงสุด (ถ้าจำกัด)</label>
                            <input type="number" class="combo-step-limit w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none text-xs focus:ring-1 focus:ring-blue-500" value="${limit}" min="1" placeholder="ไม่จำกัด">
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-xs font-bold text-slate-800">รายการอาหารในขั้นตอนนี้</label>
                            <button type="button" onclick="appAdmin.addComboStepItemRow('${stepId}')" class="text-[10px] text-blue-600 font-bold bg-blue-100/50 px-2 py-0.5 rounded hover:bg-blue-100">+ เพิ่มอาหาร</button>
                        </div>
                        <div class="combo-step-items-container space-y-2" id="stepItems_${stepId}">
                            <!-- items will be rendered here -->
                        </div>
                    </div>
                </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
                
                if (stepData && stepData.items) {
                    stepData.items.forEach(item => {
                        this.addComboStepItemRow(stepId, item);
                    });
                } else {
                    this.addComboStepItemRow(stepId);
                }
            },
            onStepTypeChange: function(stepId) {
                const row = document.querySelector(`.combo-step-row[data-step-id="${stepId}"]`);
                if (!row) return;
                const type = row.querySelector('.combo-step-type').value;
                const limitContainer = document.getElementById(`stepLimitContainer_${stepId}`);
                if (limitContainer) {
                    if (type === 'pick_many') {
                        limitContainer.classList.remove('hidden');
                    } else {
                        limitContainer.classList.add('hidden');
                    }
                }
            },
            addComboStepItemRow: function(stepId, itemData = null) {
                const container = document.getElementById(`stepItems_${stepId}`);
                if (!container) return;
                const menuKey = itemData ? itemData.menuKey : '';
                const extraPrice = itemData ? itemData.extraPrice : 0;
                const selectedVariantName = itemData ? itemData.variant : '';
                
                const optionsHtml = allMenu
                    .filter(m => !m.IsCombo && m._key !== this.editingMenuKey)
                    .map(m => `<option value="${m._key}" ${m._key === menuKey ? 'selected' : ''}>${m.Name} (฿${m.Price || (m.Variants && m.Variants[0] ? m.Variants[0].price : 0)})</option>`)
                    .join('');
                
                let variantsHtml = `<option value="">-- ทุกรูปแบบ (เลือกหน้าร้าน) --</option>`;
                if (menuKey) {
                    const refMenu = allMenu.find(m => m._key === menuKey);
                    if (refMenu && refMenu.Variants && refMenu.Variants.length > 1) {
                        refMenu.Variants.forEach(v => {
                            variantsHtml += `<option value="${v.name}" ${v.name === selectedVariantName ? 'selected' : ''}>รูปแบบ: ${v.name} (฿${v.price})</option>`;
                        });
                    }
                }
                
                const itemRowHtml = `
                <div class="combo-item-row flex flex-col sm:flex-row gap-2 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm relative w-full">
                    <div class="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                        <select onchange="appAdmin.onComboItemMenuChange(this)" class="combo-item-key w-full flex-1 p-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-blue-500">
                            <option value="">-- เลือกเมนู --</option>
                            ${optionsHtml}
                        </select>
                        <select class="combo-item-variant w-full sm:max-w-[180px] p-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-blue-500 ${(!menuKey || !variantsHtml.includes('รูปแบบ:')) ? 'hidden' : ''}">
                            ${variantsHtml}
                        </select>
                    </div>
                    <div class="flex gap-2 items-center w-full sm:w-auto justify-between sm:justify-start mt-1 sm:mt-0">
                        <div class="relative flex-1 sm:flex-initial sm:w-24">
                            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">บวก</span>
                            <input type="number" class="combo-item-extra w-full pl-8 pr-2 p-2 rounded-lg border border-slate-300 text-xs outline-none text-right focus:border-blue-500" value="${extraPrice}" placeholder="0">
                        </div>
                        <button type="button" onclick="this.closest('.combo-item-row').remove()" class="text-red-400 hover:text-red-600 font-bold text-xs p-2.5 bg-red-50 rounded-lg sm:bg-transparent sm:p-1 active:scale-95 shrink-0">✕ ลบ</button>
                    </div>
                </div>
                `;
                container.insertAdjacentHTML('beforeend', itemRowHtml);
            },
            onComboItemMenuChange: function(selectEl) {
                const row = selectEl.closest('.combo-item-row');
                if (!row) return;
                const menuKey = selectEl.value;
                const variantSel = row.querySelector('.combo-item-variant');
                if (!variantSel) return;
                
                if (!menuKey) {
                    variantSel.innerHTML = `<option value="">-- ทุกรูปแบบ (เลือกหน้าร้าน) --</option>`;
                    variantSel.classList.add('hidden');
                    return;
                }
                
                const refMenu = allMenu.find(m => m._key === menuKey);
                if (refMenu && refMenu.Variants && refMenu.Variants.length > 1) {
                    let html = `<option value="">-- ทุกรูปแบบ (เลือกหน้าร้าน) --</option>`;
                    refMenu.Variants.forEach(v => {
                        html += `<option value="${v.name}">รูปแบบ: ${v.name} (฿${v.price})</option>`;
                    });
                    variantSel.innerHTML = html;
                    variantSel.classList.remove('hidden');
                } else {
                    variantSel.innerHTML = `<option value="">-- ทุกรูปแบบ (เลือกหน้าร้าน) --</option>`;
                    variantSel.classList.add('hidden');
                }
            },
            onMainCategoryChange: function() {
                const mainSel = document.getElementById('adminMenuMainCategory');
                const subSel = document.getElementById('adminMenuSubCategory');
                if (!mainSel || !subSel) return;
                
                const mainCat = mainSel.value;
                
                // Get all subcategories belonging to this main category
                const subs = allMenu
                    .filter(m => m.Category && m.Category.startsWith(mainCat + '/'))
                    .map(m => m.Category.split('/')[1].trim())
                    .filter(Boolean);
                const uniqueSubs = ['-- ไม่มี --', ...new Set(subs)];
                
                subSel.innerHTML = uniqueSubs.map(s => `<option value="${s === '-- ไม่มี --' ? '' : s}">${s}</option>`).join('');
            },
            addNewSubCategory: function() {
                const newSub = prompt("พิมพ์ชื่อหมวดหมู่ย่อยใหม่:");
                if(newSub) {
                    const subSel = document.getElementById('adminMenuSubCategory');
                    if (subSel) {
                        // Check if it already exists, if not add it
                        let found = false;
                        for (let option of subSel.options) {
                            if (option.value === newSub) found = true;
                        }
                        if (!found) {
                            subSel.insertAdjacentHTML('beforeend', `<option value="${newSub}">${newSub}</option>`);
                        }
                        subSel.value = newSub;
                    }
                }
            },
            addNewCategory: function() { 
                const newCat = prompt("พิมพ์ชื่อหมวดหมู่หลักใหม่:"); 
                if(newCat) { 
                    const mainSel = document.getElementById('adminMenuMainCategory'); 
                    if(mainSel) {
                        mainSel.insertAdjacentHTML('beforeend', `<option value="${newCat}">${newCat}</option>`); 
                        mainSel.value = newCat; 
                        this.onMainCategoryChange();
                    }
                } 
            },
            openAdminMenuFormModal: function(key = null) {
                this.editingMenuKey = key; 
                
                // Get unique main categories (e.g. "Food", "Beverage" from "Food/Main Course")
                const mainCats = ['Beverage', 'Food', 'Dessert', ...new Set(allMenu.map(m => {
                    if (!m.Category) return null;
                    return m.Category.split('/')[0].trim();
                }).filter(Boolean))];
                const uniqueMainCats = [...new Set(mainCats)];
                
                const mainSel = document.getElementById('adminMenuMainCategory');
                mainSel.innerHTML = uniqueMainCats.map(c => `<option value="${c}">${c}</option>`).join('');
                
                const isComboCb = document.getElementById('adminMenuIsCombo');
                const basePriceInput = document.getElementById('adminMenuBasePrice');
                const stepsContainer = document.getElementById('adminComboStepsContainer');
                stepsContainer.innerHTML = ''; // Clear steps

                if(key) {
                    const item = allMenu.find(m => m._key === key); 
                    document.getElementById('adminMenuFormTitle').innerText = "แก้ไขเมนู"; 
                    document.getElementById('adminMenuName').value = item.Name; 
                    document.getElementById('adminMenuImage').value = item.ImageURL || "";
                    setTimeout(() => this.previewImage(), 100);
                    
                    const catParts = (item.Category || '').split('/');
                    const itemMainCat = catParts[0].trim();
                    const itemSubCat = catParts.length > 1 ? catParts[1].trim() : '';

                    mainSel.value = itemMainCat || uniqueMainCats[0];
                    this.onMainCategoryChange();
                    
                    if (itemSubCat) {
                        const subSel = document.getElementById('adminMenuSubCategory');
                        let found = false;
                        for (let option of subSel.options) {
                            if (option.value === itemSubCat) found = true;
                        }
                        if (!found) {
                            subSel.insertAdjacentHTML('beforeend', `<option value="${itemSubCat}">${itemSubCat}</option>`);
                        }
                        subSel.value = itemSubCat;
                    }
                    
                    if (item.IsCombo) {
                        isComboCb.checked = true;
                        basePriceInput.value = item.Price || 0;
                        if (item.ComboSteps && item.ComboSteps.length > 0) {
                            item.ComboSteps.forEach(step => {
                                this.addComboStepRow(step);
                            });
                        }
                    } else {
                        isComboCb.checked = false;
                        basePriceInput.value = "";
                    }

                    if(item.Variants && item.Variants.length > 0) { 
                        this.currentVariants = [...item.Variants]; 
                    } else { 
                        this.currentVariants = [{ id: 1, name: 'ปกติ', price: item.Price || 0 }]; 
                    } 
                    this.renderVariants();
                    
                    let selOpts = item.OptionSets || []; 
                    this.renderOptionSetsCheckboxes(selOpts);
                } else {
                    document.getElementById('adminMenuFormTitle').innerText = "เพิ่มเมนูใหม่"; 
                    document.getElementById('adminMenuName').value = ""; 
                    document.getElementById('adminMenuImage').value = ""; 
                    document.getElementById('imagePreviewContainer').classList.add('hidden');
                    
                    mainSel.value = 'Food';
                    this.onMainCategoryChange();
                    
                    isComboCb.checked = false;
                    basePriceInput.value = "";
                    this.currentVariants = [{ id: 1, name: 'ปกติ', price: 0 }]; 
                    this.renderVariants(); 
                    this.renderOptionSetsCheckboxes([]);
                }
                
                this.toggleComboForm();
                document.getElementById('adminMenuFormModal').classList.remove('hidden');
            },
            closeAdminMenuFormModal: function() { document.getElementById('adminMenuFormModal').classList.add('hidden'); },
            renderVariants: function() {
                const container = document.getElementById('adminVariantsContainer'); if(!container) return; 
                container.innerHTML = this.currentVariants.map((v, i) => `<div class="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200"><input type="text" value="${v.name}" placeholder="ชื่อ (เช่น ร้อน)" class="var-name flex-1 p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"><div class="relative w-24"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">฿</span><input type="number" value="${v.price}" placeholder="ราคา" class="var-price w-full pl-6 p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"></div><button onclick="appAdmin.removeVariant(${v.id})" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg">✕</button></div>`).join('');
            },
            addVariantRow: function() { this.currentVariants.push({ id: Date.now(), name: '', price: '' }); this.renderVariants(); },
            removeVariant: function(id) { if(this.currentVariants.length <= 1) return alert('ต้องมีอย่างน้อย 1 รูปแบบครับ'); this.currentVariants = this.currentVariants.filter(v => v.id !== id); this.renderVariants(); },
            previewImage: function() {
                const rawUrl = document.getElementById('adminMenuImage').value.trim(); const convertedUrl = this.convertDriveLink(rawUrl); const container = document.getElementById('imagePreviewContainer'); const img = document.getElementById('imagePreview'); const err = document.getElementById('imagePreviewError');
                if(!convertedUrl) { container.classList.add('hidden'); return; } container.classList.remove('hidden'); img.classList.add('hidden'); err.classList.add('hidden');
                img.onerror = function() { img.classList.add('hidden'); err.classList.remove('hidden'); }; img.onload = function() { img.classList.remove('hidden'); err.classList.add('hidden'); }; img.src = convertedUrl;
            },
            renderOptionSetsCheckboxes: function(selectedIds) {
                const container = document.getElementById('adminOptionSetsContainer'); if(!container) return; 
                if(globalOptions.length === 0) { container.innerHTML = `<p class="text-xs text-slate-400 p-2">ยังไม่มีคลังเซ็ตท็อปปิ้ง</p>`; return; }
                container.innerHTML = globalOptions.map(opt => `<label class="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer bg-white hover:bg-blue-50 transition-colors"><input type="checkbox" value="${opt.id}" ${selectedIds.includes(opt.id)?'checked':''} class="opt-set-cb mt-0.5 w-5 h-5 text-blue-600 rounded cursor-pointer"><div><p class="font-bold text-slate-800 text-sm">${opt.name}</p><p class="text-[10px] text-slate-500 line-clamp-1 mt-0.5">${(opt.items||[]).map(i=>i.name).join(', ')}</p></div></label>`).join('');
            },
            saveAdminMenu: async function() {
                const name = document.getElementById('adminMenuName').value.trim(); 
                const mainCat = document.getElementById('adminMenuMainCategory').value;
                const subCat = document.getElementById('adminMenuSubCategory').value;
                const cat = subCat ? `${mainCat}/${subCat}` : mainCat;
                const rawImgUrl = document.getElementById('adminMenuImage').value.trim();
                
                if(!name) return alert('⚠️ กรุณาใส่ชื่อเมนู');

                const isCombo = document.getElementById('adminMenuIsCombo').checked;
                let menuData = {};

                if (isCombo) {
                    const basePrice = Number(document.getElementById('adminMenuBasePrice').value) || 0;
                    const stepRows = document.querySelectorAll('#adminComboStepsContainer > .combo-step-row');
                    const comboSteps = [];

                    for (let row of stepRows) {
                        const stepId = Number(row.getAttribute('data-step-id')) || Date.now();
                        const title = row.querySelector('.combo-step-title').value.trim();
                        const required = row.querySelector('.combo-step-required').checked;
                        
                        const type = row.querySelector('.combo-step-type').value;
                        const limitVal = row.querySelector('.combo-step-limit').value;
                        const limit = (type === 'pick_many' && limitVal) ? Number(limitVal) : null;
                        
                        if (!title) {
                            return alert('⚠️ กรุณากรอกชื่อขั้นตอนให้ครบถ้วน');
                        }

                        const itemRows = row.querySelectorAll('.combo-step-items-container > .combo-item-row');
                        const items = [];
                        
                        for (let itemRow of itemRows) {
                            const menuKey = itemRow.querySelector('.combo-item-key').value;
                            const extraPrice = Number(itemRow.querySelector('.combo-item-extra').value) || 0;
                            const variant = itemRow.querySelector('.combo-item-variant')?.value || '';
                            
                            if (!menuKey) {
                                return alert('⚠️ กรุณาเลือกรายการเมนูอาหารในทุกช่อง หรือลบช่องว่างออก');
                            }

                            const refMenu = allMenu.find(m => m._key === menuKey);
                            const itemName = refMenu ? refMenu.Name : 'ไม่ทราบชื่อ';

                            items.push({
                                menuKey: menuKey,
                                name: itemName,
                                extraPrice: extraPrice,
                                variant: variant
                            });
                        }

                        if (items.length === 0) {
                            return alert(`⚠️ ขั้นตอน "${title}" ต้องมีเมนูให้เลือกอย่างน้อย 1 รายการ`);
                        }

                        comboSteps.push({
                            id: stepId,
                            title: title,
                            required: required,
                            type: type,
                            limit: limit,
                            items: items
                        });
                    }

                    if (comboSteps.length === 0) {
                        return alert('⚠️ กรุณาเพิ่มขั้นตอนสำหรับ Combo Set อย่างน้อย 1 ขั้นตอน');
                    }

                    menuData = {
                        Name: name,
                        Category: cat,
                        ImageURL: rawImgUrl,
                        Price: basePrice,
                        IsCombo: true,
                        ComboSteps: comboSteps,
                        Variants: null,
                        OptionSets: null
                    };
                } else {
                    const vars = []; 
                    let varErr = false; 
                    document.querySelectorAll('#adminVariantsContainer > div').forEach(row => { 
                        const n = row.querySelector('.var-name').value.trim(); 
                        const p = row.querySelector('.var-price').value; 
                        if(!n || p==='') varErr = true; 
                        else vars.push({ id: Date.now()+Math.random(), name: n, price: Number(p) }); 
                    });
                    const selOpts = Array.from(document.querySelectorAll('.opt-set-cb:checked')).map(cb => cb.value);
                    
                    if(vars.length===0 || varErr) return alert('⚠️ กรุณากรอกรูปแบบและราคาให้ครบถ้วนทุกช่อง');
                    
                    menuData = { 
                        Name: name, 
                        Category: cat, 
                        ImageURL: rawImgUrl, 
                        Price: vars[0].price, 
                        Variants: vars, 
                        OptionSets: selOpts,
                        IsCombo: false,
                        ComboSteps: null
                    };
                }

                const btn = document.getElementById('btnSaveMenu'); 
                const oldText = btn.innerHTML; 
                btn.innerHTML = "⏳ บันทึก..."; 
                btn.disabled = true;
                try { 
                    if(this.editingMenuKey) await fetch(`${FIREBASE_URL}Menu/${this.editingMenuKey}.json`, { method: 'PATCH', body: JSON.stringify(menuData) }); 
                    else await fetch(`${FIREBASE_URL}Menu.json`, { method: 'POST', body: JSON.stringify(menuData) }); 
                    alert('✅ บันทึกเมนูสำเร็จ!'); 
                    logActivity('SAVE_MENU', `สร้าง/แก้ไขเมนูอาหาร: ${name}`); 
                    this.closeAdminMenuFormModal(); 
                    await fetchInitialData(); 
                    this.renderMenuList(); 
                    renderCategories(); 
                    filterMenu('All'); 
                } catch (e) { 
                    alert('❌ เกิดข้อผิดพลาด: ' + e.message); 
                } finally { 
                    btn.innerHTML = oldText; 
                    btn.disabled = false; 
                }
            },
            compressAndConvertFileToBase64: function(file, maxWidth, maxHeight, quality, callback) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                            if (width > maxWidth) {
                                height = Math.round((height * maxWidth) / width);
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = Math.round((width * maxHeight) / height);
                                height = maxHeight;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const dataUrl = canvas.toDataURL('image/jpeg', quality);
                        callback(null, dataUrl);
                    };
                    img.onerror = function() {
                        callback(new Error("⚠️ ไม่สามารถโหลดรูปภาพได้ครับ"), null);
                    };
                    img.src = e.target.result;
                };
                reader.onerror = function() {
                    callback(new Error("⚠️ อ่านไฟล์รูปภาพไม่สำเร็จครับ"), null);
                };
                reader.readAsDataURL(file);
            },
            handleMenuImageUpload: function(event) {
                const file = event.target.files[0];
                if (!file) return;
                const self = this;
                
                const input = document.getElementById('adminMenuImage');
                const btn = event.target.parentElement;
                const oldText = btn.innerHTML;
                btn.innerHTML = "⏳ กำลังแปลงรูป...";
                
                self.compressAndConvertFileToBase64(file, 500, 500, 0.7, function(err, base64Str) {
                    btn.innerHTML = oldText;
                    if (err) {
                        return alert(err.message);
                    }
                    input.value = base64Str;
                    self.previewImage();
                    alert("✅ อัปโหลด/ถ่ายรูปภาพเมนูเรียบร้อยแล้ว (ระบบย่อขนาดไฟล์เรียบร้อย)");
                });
            },
            handlePromptPayQrUpload: function(event) {
                const file = event.target.files[0];
                if (!file) return;
                const self = this;
                
                const input = document.getElementById('promptPayQrUrl');
                const btn = event.target.parentElement;
                const oldText = btn.innerHTML;
                btn.innerHTML = "⏳ กำลังแปลงรูป...";
                
                self.compressAndConvertFileToBase64(file, 600, 600, 0.75, function(err, base64Str) {
                    btn.innerHTML = oldText;
                    if (err) {
                        return alert(err.message);
                    }
                    input.value = base64Str;
                    alert("✅ อัปโหลด PromptPay QR Code เรียบร้อยแล้ว (ระบบย่อขนาดไฟล์เรียบร้อย) อย่าลืมกดปุ่ม 'บันทึก' ด้านล่างเพื่อยืนยันการตั้งค่าครับ");
                });
            },
            handleReceiptLogoUpload: function(event) {
                const file = event.target.files[0];
                if (!file) return;
                const self = this;
                
                const input = document.getElementById('receiptLogoUrl');
                const btn = event.target.parentElement;
                const oldText = btn.innerHTML;
                btn.innerHTML = "⏳ กำลังแปลงรูป...";
                
                self.compressAndConvertFileToBase64(file, 400, 400, 0.7, function(err, base64Str) {
                    btn.innerHTML = oldText;
                    if (err) {
                        return alert(err.message);
                    }
                    input.value = base64Str;
                    alert("✅ อัปโหลดรูปโลโก้เรียบร้อยแล้ว (ระบบย่อขนาดไฟล์เรียบร้อย) อย่าลืมกดปุ่ม 'บันทึก' ด้านล่างเพื่อยืนยันการตั้งค่าครับ");
                });
            },
            deleteMenu: function(key, name) { showModal('confirm', 'ลบเมนู', `ยืนยันการลบ "${name}" ใช่หรือไม่?`, async () => { try { await fetch(`${FIREBASE_URL}Menu/${key}.json`, { method: 'DELETE' }); logActivity('DELETE_MENU', `ลบเมนูอาหาร: ${name}`); await fetchInitialData(); appAdmin.renderMenuList(); renderCategories(); filterMenu('All'); } catch(e){} }); },

            // 🌟 เพิ่มปุ่มเลือกทั้งหมด/สลับการเลือกอาหาร 🌟
            toggleSelectAllMenu: function(selectAllEl) {
                const checked = selectAllEl.checked;
                document.querySelectorAll('.admin-menu-select').forEach(cb => {
                    cb.checked = checked;
                });
                this.updateBulkButtonState();
            },

            // 🌟 อัปเดตยอดการเลือกและแสดงผลปุ่ม Bulk Topping 🌟
            updateBulkButtonState: function() {
                const selectedCbs = document.querySelectorAll('.admin-menu-select:checked');
                const bulkBtn = document.getElementById('adminMenuBulkBtn');
                const countLabel = document.getElementById('adminMenuSelectedCount');
                if (bulkBtn && countLabel) {
                    if (selectedCbs.length > 0) {
                        bulkBtn.classList.remove('hidden');
                        countLabel.innerText = selectedCbs.length;
                    } else {
                        bulkBtn.classList.add('hidden');
                        countLabel.innerText = 0;
                        const selectAllCb = document.getElementById('adminMenuSelectAll');
                        if(selectAllCb) selectAllCb.checked = false;
                    }
                }
            },

            // 🌟 เปิดหน้าต่างผูกท็อปปิ้งแบบกลุ่ม (Bulk Topping Modal) 🌟
            openBulkToppingModal: function() {
                const selectedCbs = document.querySelectorAll('.admin-menu-select:checked');
                if (selectedCbs.length === 0) return alert("⚠️ กรุณาเลือกรายการเมนูอย่างน้อย 1 รายการครับ");

                const countLabel = document.getElementById('bulkToppingSelectedMenuCount');
                if (countLabel) countLabel.innerText = selectedCbs.length;

                // ดึงหมวดหมู่ทั้งหมดไปใส่ในกล่องย้ายหมวดหมู่แบบกลุ่ม
                const catSelect = document.getElementById('bulkCategorySelect');
                if (catSelect) {
                    const cats = ['Beverage', 'Food', 'Dessert', ...new Set(allMenu.map(m => m.Category).filter(Boolean))];
                    const uniqueCats = [...new Set(cats)];
                    catSelect.innerHTML = uniqueCats.map(c => `<option value="${c}">${c}</option>`).join('');
                }

                const container = document.getElementById('bulkToppingOptionsContainer');
                if (container) {
                    if (globalOptions.length === 0) {
                        container.innerHTML = `<p class="text-xs text-slate-400 p-2 text-center font-bold">ยังไม่มีคลังเซ็ตท็อปปิ้งในระบบครับ</p>`;
                    } else {
                        container.innerHTML = globalOptions.map(opt => `
                            <label class="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer bg-white hover:bg-indigo-50 transition-colors shadow-sm">
                                <input type="checkbox" value="${opt.id}" class="bulk-opt-set-cb mt-0.5 w-5 h-5 text-indigo-600 rounded cursor-pointer">
                                <div>
                                    <p class="font-bold text-slate-800 text-sm">${opt.name}</p>
                                    <p class="text-[10px] text-slate-500 mt-0.5 font-semibold">${(opt.items || []).map(i => i.name).join(', ')}</p>
                                </div>
                            </label>
                        `).join('');
                    }
                }

                document.getElementById('adminBulkToppingModal').classList.remove('hidden');
            },

            // 🌟 ปฏิบัติการผูก/ถอน ท็อปปิ้งแบบกลุ่ม (Bulk Actions) 🌟
            executeBulkToppingAction: async function(action) {
                const selectedCbs = document.querySelectorAll('.admin-menu-select:checked');
                if (selectedCbs.length === 0) return alert("⚠️ ไม่พบรายการเมนูที่เลือกไว้");

                const selectedMenuKeys = Array.from(selectedCbs).map(cb => cb.getAttribute('data-key')).filter(Boolean);
                const selectedToppingIds = Array.from(document.querySelectorAll('.bulk-opt-set-cb:checked')).map(cb => cb.value);

                if (action !== 'clear' && selectedToppingIds.length === 0) {
                    return alert("⚠️ กรุณาเลือกท็อปปิ้งอย่างน้อย 1 เซ็ตเพื่อสั่งดำเนินการครับ");
                }

                let confirmMsg = "";
                if (action === 'bind') confirmMsg = `ยืนยันการ "ผูกเซ็ตท็อปปิ้งเพิ่ม" ${selectedToppingIds.length} กลุ่ม ให้กับเมนูทั้ง ${selectedMenuKeys.length} รายการใช่หรือไม่?`;
                else if (action === 'unbind') confirmMsg = `ยืนยันการ "ยกเลิกการผูกเซ็ต" ${selectedToppingIds.length} กลุ่ม ออกจากเมนูทั้ง ${selectedMenuKeys.length} รายการใช่หรือไม่?`;
                else if (action === 'clear') confirmMsg = `⚠️ ยืนยันการ "ล้างเซ็ตท็อปปิ้งทั้งหมด" ของเมนูที่เลือกทั้ง ${selectedMenuKeys.length} รายการใช่หรือไม่? (เมนูเหล่านี้จะไม่มีท็อปปิ้งเหลืออยู่เลย)`;

                if (!confirm(confirmMsg)) return;

                const patch = {};
                selectedMenuKeys.forEach(key => {
                    const menu = allMenu.find(m => m._key === key);
                    if (menu) {
                        let currentOptionSets = menu.OptionSets ? [...menu.OptionSets] : [];
                        
                        if (action === 'bind') {
                            // รวมลิสต์ท็อปปิ้งแบบไม่ซ้ำ
                            selectedToppingIds.forEach(id => {
                                if (!currentOptionSets.includes(id)) {
                                    currentOptionSets.push(id);
                                }
                            });
                        } else if (action === 'unbind') {
                            // กรองเอาท็อปปิ้งออก
                            currentOptionSets = currentOptionSets.filter(id => !selectedToppingIds.includes(id));
                        } else if (action === 'clear') {
                            // ล้างท็อปปิ้งทั้งหมด
                            currentOptionSets = [];
                        }

                        patch[key] = {
                            ...menu,
                            _key: undefined, // ลบ helper key ออกตอนบันทึก Firebase
                            OptionSets: currentOptionSets
                        };
                    }
                });

                // ปรับปุ่มการทำรายการ
                const btn = document.activeElement;
                const oldText = btn ? btn.innerHTML : "";
                if (btn) {
                    btn.innerHTML = "⏳ กำลังดำเนินการ...";
                    btn.disabled = true;
                }

                try {
                    await patchFirebase('Menu', patch);
                    await logActivity('BULK_TOPPING_UPDATE', `จัดการท็อปปิ้งแบบกลุ่ม (${action}) ให้เมนูรวม ${selectedMenuKeys.length} รายการ`);
                    alert("✅ จัดการท็อปปิ้งกลุ่มเรียบร้อยแล้วครับ!");
                    
                    document.getElementById('adminBulkToppingModal').classList.add('hidden');
                    
                    // เคลียร์ค่าตัวติ๊กเลือกทั้งหมด
                    const selectAllCb = document.getElementById('adminMenuSelectAll');
                    if(selectAllCb) selectAllCb.checked = false;
                    
                    await fetchInitialData();
                    this.renderMenuList();
                    renderCategories();
                    filterMenu('All');
                } catch (e) {
                    alert("❌ จัดการท็อปปิ้งแบบกลุ่มไม่สำเร็จ: " + e.message);
                } finally {
                    if (btn) {
                        btn.innerHTML = oldText;
                        btn.disabled = false;
                    }
                }
            },

            // 🌟 เพิ่มตัวเลือกหมวดหมู่ย่อยใหม่ในแผงย้ายหมวดหมู่แบบกลุ่ม 🌟
            addBulkCategoryOption: function() {
                const newCat = prompt("พิมพ์ชื่อหมวดหมู่ใหม่ที่ต้องการสร้าง:");
                if(newCat) {
                    const sel = document.getElementById('bulkCategorySelect');
                    if (sel) {
                        sel.insertAdjacentHTML('beforeend', `<option value="${newCat}">${newCat}</option>`);
                        sel.value = newCat;
                    }
                }
            },

            // 🌟 ปฏิบัติการเปลี่ยนหมวดหมู่แบบกลุ่ม (Bulk Category Change) 🌟
            executeBulkCategoryChange: async function() {
                const selectedCbs = document.querySelectorAll('.admin-menu-select:checked');
                if (selectedCbs.length === 0) return alert("⚠️ ไม่พบรายการเมนูที่เลือกไว้");

                const selectedMenuKeys = Array.from(selectedCbs).map(cb => cb.getAttribute('data-key')).filter(Boolean);
                const targetCategory = document.getElementById('bulkCategorySelect').value;

                if (!targetCategory) return alert("⚠️ กรุณาเลือกหมวดหมู่ปลายทางครับ");

                const confirmMsg = `ยืนยันการย้ายหมวดหมู่ของเมนูที่เลือกทั้ง ${selectedMenuKeys.length} รายการ ไปยังหมวดหมู่ "${targetCategory}" ใช่หรือไม่?`;
                if (!confirm(confirmMsg)) return;

                const patch = {};
                selectedMenuKeys.forEach(key => {
                    const menu = allMenu.find(m => m._key === key);
                    if (menu) {
                        patch[key] = {
                            ...menu,
                            _key: undefined, // ลบ helper key ออกก่อนเซฟ Firebase
                            Category: targetCategory
                        };
                    }
                });

                const btn = document.activeElement;
                const oldText = btn ? btn.innerHTML : "";
                if (btn) {
                    btn.innerHTML = "⏳ กำลังย้าย...";
                    btn.disabled = true;
                }

                try {
                    await patchFirebase('Menu', patch);
                    await logActivity('BULK_CATEGORY_UPDATE', `เปลี่ยนหมวดหมู่เมนูเป็น "${targetCategory}" รวม ${selectedMenuKeys.length} รายการ`);
                    alert(`✅ ย้ายหมวดหมู่ของเมนู ${selectedMenuKeys.length} รายการ ไปยัง "${targetCategory}" สำเร็จเรียบร้อยแล้วครับ!`);
                    
                    document.getElementById('adminBulkToppingModal').classList.add('hidden');
                    
                    // เคลียร์ค่าตัวติ๊กเลือกทั้งหมด
                    const selectAllCb = document.getElementById('adminMenuSelectAll');
                    if(selectAllCb) selectAllCb.checked = false;
                    
                    await fetchInitialData();
                    this.renderMenuList();
                    renderCategories();
                    filterMenu('All');
                } catch (e) {
                    alert("❌ เปลี่ยนหมวดหมู่แบบกลุ่มไม่สำเร็จ: " + e.message);
                } finally {
                    if (btn) {
                        btn.innerHTML = oldText;
                        btn.disabled = false;
                    }
                }
            }
        };
