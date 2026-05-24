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
                csvContent += "หมวดหมู่,ชื่อเมนู,ราคาเริ่มต้น,รูปแบบ (Variants),เซ็ตท็อปปิ้ง (Option Sets),ลิงก์รูปภาพ\n";
                
                const sortedMenu = [...allMenu].sort((a,b) => (a.Category||'').localeCompare(b.Category||''));
                
                sortedMenu.forEach(item => {
                    let cat = `"${(item.Category || '-').replace(/"/g, '""')}"`;
                    let name = `"${(item.Name || '-').replace(/"/g, '""')}"`;
                    let price = item.Price || 0;
                    
                    let variants = "-";
                    if(item.Variants && item.Variants.length > 0) {
                        variants = `"${item.Variants.map(v => `${v.name}:${v.price}บ.`).join(' | ')}"`;
                    } else if(item.Price) {
                        variants = `"(ราคาเดียว:${item.Price}บ.)"`;
                        price = item.Price;
                    }

                    let optSets = "-";
                    if(item.OptionSets && item.OptionSets.length > 0) {
                        let setNames = item.OptionSets.map(optId => {
                            let f = globalOptions.find(o => o.id === optId);
                            return f ? f.name : optId;
                        });
                        optSets = `"${setNames.join(' | ').replace(/"/g, '""')}"`;
                    } else if (item.OptionGroup) {
                        optSets = `"(แบบเก่า: ${item.OptionGroup})"`;
                    }

                    let img = `"${(item.ImageURL || '-').replace(/"/g, '""')}"`;

                    csvContent += [cat, name, price, variants, optSets, img].join(",") + "\n";
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
                            if(p.order) pIcons += "🍔 ";
                            if(p.kitchen) pIcons += "🧑‍🍳 ";
                            if(p.cashier) pIcons += "💰 ";
                            if(p.discount) pIcons += "🏷️ ";
                            if(p.sales) pIcons += "📊 ";
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
                    } else {
                        const r = (staff.Role || staff.Position || '').toLowerCase();
                        cbOrder.checked = r.includes('waiter') || r.includes('admin') || r.includes('manager');
                        cbKitchen.checked = r.includes('kitchen') || r.includes('bar') || r.includes('admin') || r.includes('manager');
                        cbCashier.checked = r.includes('cashier') || r.includes('admin') || r.includes('manager');
                        cbDiscount.checked = r.includes('admin') || r.includes('manager') || r.includes('owner');
                        cbSales.checked = r.includes('admin') || r.includes('manager');
                        cbAdmin.checked = r.includes('admin') || r.includes('manager');
                    }
                } else {
                    modalTitle.innerText = "เพิ่มพนักงานใหม่";
                    nameInput.value = "";
                    usernameInput.value = "";
                    passwordInput.value = "";
                    cbOrder.checked = true; cbKitchen.checked = false; cbCashier.checked = false; cbDiscount.checked = false; cbSales.checked = false; cbAdmin.checked = false;
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
                    admin: document.getElementById('permAdmin').checked
                };
                
                if(!p.order && !p.kitchen && !p.cashier && !p.discount && !p.sales && !p.admin) {
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
            openTableManagerModal: function() { document.getElementById('adminTableManagerModal').classList.remove('hidden'); this.renderTableManagerList(); },
            renderTableManagerList: function() {
                const container = document.getElementById('adminTableListContainer');
                if(allTables.length === 0) { container.innerHTML = `<p class="text-center text-slate-400 py-4">ยังไม่มีข้อมูลโต๊ะ</p>`; return; }
                container.innerHTML = allTables.map((tbl, idx) => `<div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center"><span class="font-bold text-slate-800"><i class="fa-solid fa-chair text-slate-400 mr-2"></i> ${tbl}</span><button onclick="appAdmin.deleteTable(${idx})" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-trash-can"></i></button></div>`).join('');
            },
            addTable: async function() {
                const name = document.getElementById('newTableName').value.trim();
                if(!name) return alert('กรุณาใส่ชื่อโต๊ะ');
                if(allTables.includes(name)) return alert('ชื่อโต๊ะนี้มีอยู่แล้ว');
                allTables.push(name); allTables.sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
                try { await fetch(`${FIREBASE_URL}Tables.json`, { method: 'PUT', body: JSON.stringify(allTables) }); document.getElementById('newTableName').value = ''; logActivity('SAVE_TABLE', `เพิ่มผังโต๊ะ: ${name}`); this.renderTableManagerList(); } catch(e) {}
            },
            deleteTable: function(idx) {
                const tblName = allTables[idx];
                showModal('confirm', 'ลบโต๊ะ', `ยืนยันการลบโต๊ะ "${tblName}" ใช่หรือไม่?`, async () => {
                    allTables.splice(idx, 1); try { await fetch(`${FIREBASE_URL}Tables.json`, { method: 'PUT', body: JSON.stringify(allTables) }); logActivity('DELETE_TABLE', `ลบผังโต๊ะ: ${tblName}`); appAdmin.renderTableManagerList(); } catch(e) {}
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
            openOptionManagerModal: function() { document.getElementById('adminOptionManagerModal').classList.remove('hidden'); this.renderOptionManagerList(); },
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
            openAdminMenuModal: function() { document.getElementById('adminMenuModal').classList.remove('hidden'); this.renderMenuList(); },
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
                const sortedMenu = [...allMenu].sort((a,b) => (a.Category||'').localeCompare(b.Category||''));
                container.innerHTML = sortedMenu.map(item => {
                    let imgUrl = item.ImageURL ? this.convertDriveLink(item.ImageURL) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop';
                    return `<div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"><div class="flex items-center gap-3 overflow-hidden"><div class="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0"><img src="${imgUrl}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'"></div><div><p class="font-bold text-slate-800 text-sm line-clamp-1">${item.Name}</p><div class="flex gap-2 items-center mt-0.5"><span class="text-xs font-semibold text-blue-600">฿${item.Price || (item.Variants && item.Variants[0] ? item.Variants[0].price : 0)}</span><span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">${item.Category || 'ทั่วไป'}</span></div></div></div><div class="flex gap-1 shrink-0"><button onclick="appAdmin.openAdminMenuFormModal('${item._key}')" class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-pen"></i></button><button onclick="appAdmin.deleteMenu('${item._key}', '${item.Name}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-90"><i class="fa-solid fa-trash-can"></i></button></div></div>`;
                }).join('');
            },
            openAdminMenuFormModal: function(key = null) {
                this.editingMenuKey = key; const cats = ['Beverage', 'Food', 'Dessert', ...new Set(allMenu.map(m => m.Category).filter(Boolean))]; const uniqueCats = [...new Set(cats)]; const sel = document.getElementById('adminMenuCategory'); sel.innerHTML = uniqueCats.map(c => `<option value="${c}">${c}</option>`).join('');
                if(key) {
                    const item = allMenu.find(m => m._key === key); document.getElementById('adminMenuFormTitle').innerText = "แก้ไขเมนู"; document.getElementById('adminMenuName').value = item.Name; sel.value = item.Category || uniqueCats[0]; document.getElementById('adminMenuImage').value = item.ImageURL || "";
                    setTimeout(() => this.previewImage(), 100);
                    if(item.Variants && item.Variants.length > 0) { this.currentVariants = [...item.Variants]; } else { this.currentVariants = [{ id: 1, name: 'ปกติ', price: item.Price || 0 }]; } this.renderVariants();
                    let selOpts = item.OptionSets || []; this.renderOptionSetsCheckboxes(selOpts);
                } else {
                    document.getElementById('adminMenuFormTitle').innerText = "เพิ่มเมนูใหม่"; document.getElementById('adminMenuName').value = ""; document.getElementById('adminMenuImage').value = ""; document.getElementById('imagePreviewContainer').classList.add('hidden');
                    this.currentVariants = [{ id: 1, name: 'ปกติ', price: 0 }]; this.renderVariants(); this.renderOptionSetsCheckboxes([]);
                }
                document.getElementById('adminMenuFormModal').classList.remove('hidden');
            },
            closeAdminMenuFormModal: function() { document.getElementById('adminMenuFormModal').classList.add('hidden'); },
            renderVariants: function() {
                const container = document.getElementById('adminVariantsContainer'); if(!container) return; 
                container.innerHTML = this.currentVariants.map((v, i) => `<div class="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200"><input type="text" value="${v.name}" placeholder="ชื่อ (เช่น ร้อน)" class="var-name flex-1 p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"><div class="relative w-24"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">฿</span><input type="number" value="${v.price}" placeholder="ราคา" class="var-price w-full pl-6 p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"></div><button onclick="appAdmin.removeVariant(${v.id})" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg">✕</button></div>`).join('');
            },
            addVariantRow: function() { this.currentVariants.push({ id: Date.now(), name: '', price: '' }); this.renderVariants(); },
            removeVariant: function(id) { if(this.currentVariants.length <= 1) return alert('ต้องมีอย่างน้อย 1 รูปแบบครับ'); this.currentVariants = this.currentVariants.filter(v => v.id !== id); this.renderVariants(); },
            addNewCategory: function() { const newCat = prompt("พิมพ์ชื่อหมวดหมู่ใหม่:"); if(newCat) { const sel = document.getElementById('adminMenuCategory'); sel.insertAdjacentHTML('beforeend', `<option value="${newCat}">${newCat}</option>`); sel.value = newCat; } },
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
                const name = document.getElementById('adminMenuName').value.trim(); const cat = document.getElementById('adminMenuCategory').value; const rawImgUrl = document.getElementById('adminMenuImage').value.trim();
                const vars = []; let varErr = false; document.querySelectorAll('#adminVariantsContainer > div').forEach(row => { const n = row.querySelector('.var-name').value.trim(); const p = row.querySelector('.var-price').value; if(!n || p==='') varErr = true; else vars.push({ id: Date.now()+Math.random(), name: n, price: Number(p) }); });
                const selOpts = Array.from(document.querySelectorAll('.opt-set-cb:checked')).map(cb => cb.value);
                if(!name) return alert('⚠️ กรุณาใส่ชื่อเมนู'); if(vars.length===0 || varErr) return alert('⚠️ กรุณากรอกรูปแบบและราคาให้ครบถ้วนทุกช่อง');
                const menuData = { Name: name, Category: cat, ImageURL: rawImgUrl, Price: vars[0].price, Variants: vars, OptionSets: selOpts };
                const btn = document.getElementById('btnSaveMenu'); const oldText = btn.innerHTML; btn.innerHTML = "⏳ บันทึก..."; btn.disabled = true;
                try { 
                    if(this.editingMenuKey) await fetch(`${FIREBASE_URL}Menu/${this.editingMenuKey}.json`, { method: 'PATCH', body: JSON.stringify(menuData) }); 
                    else await fetch(`${FIREBASE_URL}Menu.json`, { method: 'POST', body: JSON.stringify(menuData) }); 
                    alert('✅ บันทึกเมนูสำเร็จ!'); 
                    logActivity('SAVE_MENU', `สร้าง/แก้ไขเมนูอาหาร: ${name}`); 
                    this.closeAdminMenuFormModal(); await fetchInitialData(); this.renderMenuList(); renderCategories(); filterMenu('All'); 
                } catch (e) { alert('❌ เกิดข้อผิดพลาด'); } finally { btn.innerHTML = oldText; btn.disabled = false; }
            },
            deleteMenu: function(key, name) { showModal('confirm', 'ลบเมนู', `ยืนยันการลบ "${name}" ใช่หรือไม่?`, async () => { try { await fetch(`${FIREBASE_URL}Menu/${key}.json`, { method: 'DELETE' }); logActivity('DELETE_MENU', `ลบเมนูอาหาร: ${name}`); await fetchInitialData(); appAdmin.renderMenuList(); renderCategories(); filterMenu('All'); } catch(e){} }); }
        };
