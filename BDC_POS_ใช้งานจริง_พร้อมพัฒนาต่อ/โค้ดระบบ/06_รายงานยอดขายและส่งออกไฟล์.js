        window.toggleSalesTab = function(tabName) { 
            if(tabName === 'bills') { 
                document.getElementById('tab-btn-bills').className = "flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow transition-all"; 
                document.getElementById('tab-btn-items').className = "flex-1 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold transition-all"; 
                document.getElementById('sales-bills-view').classList.remove('hidden'); 
                document.getElementById('sales-items-view').classList.add('hidden'); 
            } else { 
                document.getElementById('tab-btn-items').className = "flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow transition-all"; 
                document.getElementById('tab-btn-bills').className = "flex-1 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold transition-all"; 
                document.getElementById('sales-items-view').classList.remove('hidden'); 
                document.getElementById('sales-bills-view').classList.add('hidden'); 
                // ซ่อนแถบลบบิลหลายใบเมื่อเปลี่ยนแท็บ
                const bar = document.getElementById('bulkDeleteBar');
                if (bar) {
                    bar.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                    bar.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
                }
            } 
        };
        window.toggleAccordion = function(id) { const content = document.getElementById(id); const icon = document.getElementById('icon-' + id); if(content.classList.contains('hidden')) { content.classList.remove('hidden'); icon.style.transform = 'rotate(180deg)'; } else { content.classList.add('hidden'); icon.style.transform = 'rotate(0deg)'; } };
        
        // สถานะตัวกรองประเภทชำระเงินและข้อมูล
        window.salesPaymentFilter = 'all';
        window.currentSalesData = null;

        window.renderSalesUI = function() {
            if (!window.currentSalesData) return;
            const { totalRevenue, totalOrders, categorySales, totalItemsCount, paidOrdersArray, displayDateStr, cashSales, transferSales, creditSales } = window.currentSalesData;
            const filter = window.salesPaymentFilter || 'all';

            // กรองบิลตามวิธีจ่ายเงิน
            let filteredOrders = paidOrdersArray;
            if (filter !== 'all') {
                filteredOrders = paidOrdersArray.filter(o => (o.paymentMethod || '').toLowerCase() === filter);
            }

            // ตรวจสอบสิทธิ์สำหรับปุ่มลบยอดขาย/ลบบิล
            const isOwner = currentUser && ((currentUser.Role || "").toLowerCase().includes('owner') || currentUser.Username === 'owner' || currentUser.Username === 'gun');
            const canClear = currentUser && (currentUser.Permissions?.admin || currentUser.Permissions?.clear || isOwner);

            // สร้าง HTML ของรายการบิลประวัติ
            let billsHtml = filteredOrders.map(order => {
                const timeStr = new Date(order.paidAt || order.timestamp).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'});
                const validItems = (order.items || []).filter(i => i.itemStatus !== 'canceled');
                const subtotal = Number(order.subtotalAmount ?? validItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0));
                const discountAmount = Number(order.discount?.amount || 0);
                const orderIdSafe = String(order.orderId || '').replace(/'/g, "\\'");
                const dateKeySafe = String(order._dateKey || '').replace(/'/g, "\\'");

                // แปลประเภทชำระเงินและสร้าง Badge
                const method = (order.paymentMethod || '').toLowerCase();
                let methodBadge = '';
                if (method === 'cash') {
                    methodBadge = `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">💵 เงินสด</span>`;
                } else if (method === 'transfer') {
                    methodBadge = `<span class="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">📱 โอนเงิน</span>`;
                } else if (method === 'credit') {
                    methodBadge = `<span class="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold">💳 บัตรเครดิต</span>`;
                } else {
                    methodBadge = `<span class="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">${order.paymentMethod || '-'}</span>`;
                }

                // ป้ายกำกับโต๊ะ แก้ไข โต๊ะ โต๊ะ ซ้ำซ้อน
                let tableLabel = order.tableNo || '';
                if (order.orderType === 'Dine-in') {
                    if (!tableLabel.startsWith('โต๊ะ')) {
                        tableLabel = 'โต๊ะ ' + tableLabel;
                    }
                } else {
                    tableLabel = (order.orderType === 'Takeaway' ? 'กลับบ้าน' : 'เดลิเวอรี่') + (tableLabel && tableLabel !== 'กลับบ้าน' && tableLabel !== 'เดลิเวอรี่' ? ` (${tableLabel})` : '');
                }

                // ปุ่มควบคุม: ถ้ามีสิทธิ์ล้างข้อมูลจะแสดงปุ่ม ลบบิล เคียงคู่กับปุ่มออกใบเสร็จ
                let actionButtonsHtml = '';
                if (canClear) {
                    actionButtonsHtml = `
                    <div class="flex gap-2 mt-3">
                        <button onclick="printPaidReceipt('${orderIdSafe}')" class="flex-[3] bg-slate-100 text-slate-700 py-2.5 rounded-xl text-[11px] font-bold active:scale-95"><i class="fa-solid fa-receipt mr-1"></i> ใบเสร็จ</button>
                        <button onclick="deletePaidOrder('${orderIdSafe}', '${dateKeySafe}')" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-[11px] font-bold hover:bg-red-100 active:scale-95"><i class="fa-solid fa-trash-can mr-1"></i> ลบบิล</button>
                    </div>`;
                } else {
                    actionButtonsHtml = `<button onclick="printPaidReceipt('${orderIdSafe}')" class="mt-3 w-full bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold active:scale-95"><i class="fa-solid fa-receipt mr-1"></i> ออกใบเสร็จอีกครั้ง</button>`;
                }

                // กล่องเช็คบล็อกเลือกหลายรายการสำหรับแอดมิน
                let checkboxHtml = '';
                if (canClear) {
                    checkboxHtml = `<input type="checkbox" class="bill-select-chk w-4.5 h-4.5 rounded text-red-500 border-gray-300 focus:ring-red-500 mr-2.5 cursor-pointer shrink-0" data-id="${orderIdSafe}" data-date="${dateKeySafe}" onchange="window.updateBulkDeleteBar()">`;
                }

                return `<div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-3">
                    <div class="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                        <div class="flex items-center">
                            ${checkboxHtml}
                            <div class="flex flex-col gap-0.5">
                                <span class="font-bold text-indigo-700 text-sm">${tableLabel} <span class="text-[10px] text-gray-400 font-normal ml-1">#${order.orderId}</span></span>
                                <div class="mt-0.5">${methodBadge}</div>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                    </div>
                    <div class="text-xs text-gray-600 mb-2 space-y-1">
                        ${validItems.map(i => `<div class="flex justify-between"><span>${i.qty}x ${i.name}</span><span>฿${Number(i.totalPrice || 0).toLocaleString()}</span></div>`).join('')}
                    </div>
                    ${discountAmount ? `<div class="text-xs bg-amber-50 border border-amber-100 rounded-lg p-2 mb-2"><div class="flex justify-between text-slate-500"><span>ยอดก่อนลด</span><span>฿${subtotal.toLocaleString()}</span></div><div class="flex justify-between text-red-500 font-bold"><span>ส่วนลด (${order.discount?.reason || '-'})</span><span>-฿${discountAmount.toLocaleString()}</span></div></div>` : ''}
                    <div class="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-gray-200">
                        <span class="text-[10px] text-gray-400">แคชเชียร์: ${order.cashierName || order.staffName || '-'}</span>
                        <span class="font-bold text-gray-800 text-sm">฿${Number(order.totalAmount || 0).toLocaleString()}</span>
                    </div>
                    ${actionButtonsHtml}
                </div>`;
            }).join('');

            if (billsHtml === '') {
                billsHtml = `<p class="text-center text-gray-400 py-6 text-sm">ยังไม่มีบิลชำระเงินประเภทนี้ในรอบบิลนี้</p>`;
            }

            // สรุปยอดขายตามหมวดหมู่
            const sortedCategories = Object.entries(categorySales).sort((a, b) => b[1].totalAmount - a[1].totalAmount);
            let itemsHtml = sortedCategories.map(([catName, catData], idx) => {
                const catId = 'cat-sales-' + idx;
                
                const broadIcons = {
                    'อาหาร': '🍲 อาหาร',
                    'เครื่องดื่ม': '🥤 เครื่องดื่ม',
                    'ของหวาน': '🍰 ของหวาน',
                    'เซ็ตเมนู': '🍱 เซ็ตเมนู',
                    'อีเว้นต์': '🎉 อีเว้นต์',
                    'อื่นๆ': '📦 อื่นๆ'
                };
                const displayCatName = broadIcons[catName] || catName;
                
                const sortedSubCats = Object.entries(catData.subCats || {}).sort((a, b) => b[1].totalAmount - a[1].totalAmount);
                
                const subCatsHtml = sortedSubCats.map(([subCatName, subCatData]) => {
                    const sortedItems = Object.entries(subCatData.items).sort((a, b) => b[1].qty - a[1].qty);
                    const itemsListHtml = sortedItems.map(([itemName, stat]) => 
                        `<div class="flex justify-between items-center bg-gray-50/50 p-2 rounded-lg border border-gray-100 mb-1 ml-4">
                            <div class="flex items-center gap-2">
                                <span class="bg-gray-200 text-gray-600 font-bold w-5 h-5 rounded-full flex items-center justify-center text-[9px]">${stat.qty}</span>
                                <span class="text-xs text-slate-600">${itemName}</span>
                            </div>
                            <span class="font-semibold text-slate-700 text-xs">฿${stat.total.toLocaleString()}</span>
                        </div>`
                    ).join('');
                    
                    return `
                    <div class="mb-3 border border-slate-100 rounded-xl p-2 bg-slate-50/30">
                        <div class="flex justify-between items-center mb-1.5 px-1">
                            <span class="text-xs font-bold text-slate-700"><i class="fa-solid fa-folder-open text-amber-500 mr-1.5"></i>${subCatName} (${subCatData.totalQty} ชิ้น)</span>
                            <span class="text-xs font-bold text-slate-800">฿${subCatData.totalAmount.toLocaleString()}</span>
                        </div>
                        ${itemsListHtml}
                    </div>`;
                }).join('');

                return `<div class="bg-white rounded-xl border border-indigo-100 shadow-sm mb-3 overflow-hidden">
                    <button onclick="toggleAccordion('${catId}')" class="w-full flex justify-between items-center p-3 bg-indigo-50/30 hover:bg-indigo-50 transition-colors">
                        <div class="flex items-center gap-3">
                            <span class="bg-indigo-100 text-indigo-700 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">${catData.totalQty}</span>
                            <span class="font-bold text-indigo-900">${displayCatName}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-indigo-700">฿${catData.totalAmount.toLocaleString()}</span>
                            <i id="icon-${catId}" class="fa-solid fa-chevron-down text-indigo-400 transition-transform duration-300"></i>
                        </div>
                    </button>
                    <div id="${catId}" class="hidden p-3 border-t border-indigo-50 bg-white">${subCatsHtml}</div>
                </div>`;
            }).join('');

            if (itemsHtml === '') {
                itemsHtml = `<p class="text-center text-gray-400 py-4 text-sm">ยังไม่มีรายการขายในรอบบิลนี้</p>`;
            }

            // ไฮไลต์การเลือกฟิลเตอร์
            const activeClass = 'ring-2 ring-indigo-500 scale-[1.02] shadow';
            const cashActive = filter === 'cash' ? activeClass : 'opacity-80 hover:opacity-100';
            const transferActive = filter === 'transfer' ? activeClass : 'opacity-80 hover:opacity-100';
            const creditActive = filter === 'credit' ? activeClass : 'opacity-80 hover:opacity-100';
            const allActive = filter === 'all' ? 'ring-2 ring-white' : '';

            document.getElementById('sales-container').innerHTML = `
            <div class="grid grid-cols-2 gap-3 mb-4">
                <button onclick="window.filterSalesByPayment('all')" class="col-span-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-3xl shadow-lg text-center relative overflow-hidden active:scale-95 transition-all ${allActive}">
                    <div class="absolute top-0 right-0 opacity-10 text-7xl transform translate-x-4 -translate-y-4"><i class="fa-solid fa-coins"></i></div>
                    <p class="text-xs text-indigo-100 mb-1">ยอดขายรวมตามช่วงวันที่เลือก${filter !== 'all' ? ' (คลิกเพื่อแสดงทั้งหมด)' : ''}</p>
                    <p class="text-4xl font-bold">฿${totalRevenue.toLocaleString()}</p>
                    <p class="text-[10px] text-indigo-200 mt-3 bg-black/20 inline-block px-3 py-1 rounded-full"><i class="fa-solid fa-calendar-days"></i> แสดงข้อมูล: ${displayDateStr}</p>
                </button>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50 text-center">
                    <p class="text-xs text-gray-500 mb-1">จำนวนบิล${filter !== 'all' ? ' (คัดกรอง)' : ''}</p>
                    <p class="text-2xl font-bold text-indigo-600">${filteredOrders.length} <span class="text-xs text-gray-400 font-normal">/ ${totalOrders}</span></p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50 text-center">
                    <p class="text-xs text-gray-500 mb-1">ขายได้ทั้งหมด</p>
                    <p class="text-2xl font-bold text-emerald-500">${totalItemsCount} <span class="text-xs font-normal">ชิ้น</span></p>
                </div>
                
                <div class="col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p class="text-[11px] font-bold text-slate-400 mb-2.5 text-center"><i class="fa-solid fa-filter mr-1"></i> คลิกเลือกเพื่อกรองบิลด้านล่าง</p>
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="window.filterSalesByPayment('cash')" class="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-center active:scale-95 transition-all ${cashActive}">
                            <p class="text-[10px] font-bold text-emerald-700 mb-0.5">💵 เงินสด</p>
                            <p class="text-sm font-bold text-emerald-800">฿${cashSales.toLocaleString()}</p>
                        </button>
                        <button onclick="window.filterSalesByPayment('transfer')" class="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 text-center active:scale-95 transition-all ${transferActive}">
                            <p class="text-[10px] font-bold text-blue-700 mb-0.5">📱 โอน/สแกน</p>
                            <p class="text-sm font-bold text-blue-800">฿${transferSales.toLocaleString()}</p>
                        </button>
                        <button onclick="window.filterSalesByPayment('credit')" class="bg-orange-50/50 p-2.5 rounded-xl border border-orange-100 text-center active:scale-95 transition-all ${creditActive}">
                            <p class="text-[10px] font-bold text-orange-700 mb-0.5">💳 เครดิต</p>
                            <p class="text-sm font-bold text-orange-800">฿${creditSales.toLocaleString()}</p>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="flex gap-2 mb-4">
                <button onclick="toggleSalesTab('bills')" id="tab-btn-bills" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow transition-all">ประวัติบิลทั้งหมด</button>
                <button onclick="toggleSalesTab('items')" id="tab-btn-items" class="flex-1 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold transition-all">สรุปรายสินค้า</button>
            </div>
            
            <div id="sales-bills-view" class="space-y-2 pb-10 block">
                <!-- แถบเลือกดำเนินการลบหลายรายการแบบ Sticky -->
                <div id="bulkDeleteBar" class="fixed bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between z-50 border border-slate-700/50 transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">เลือกบิลแล้ว</span>
                        <span class="text-sm font-extrabold text-red-400" id="bulkDeleteCount">0 บิล</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.selectAllBills(true)" class="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                            <i class="fa-solid fa-check-double mr-1"></i> ทั้งหมด
                        </button>
                        <button onclick="window.selectAllBills(false)" class="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                            <i class="fa-solid fa-xmark mr-1"></i> ยกเลิก
                        </button>
                        <button onclick="window.deleteSelectedBills()" class="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-red-500/20 transition-all">
                            <i class="fa-solid fa-trash mr-1"></i> ลบที่เลือก
                        </button>
                    </div>
                </div>
                ${billsHtml}
            </div>
            <div id="sales-items-view" class="space-y-2 pb-10 hidden">${itemsHtml}</div>
            `;
        };

        window.filterSalesByPayment = function(method) {
            window.salesPaymentFilter = (window.salesPaymentFilter === method) ? 'all' : method;
            window.renderSalesUI();
            window.toggleSalesTab('bills');
        };

        // 🌟 ดึงข้อมูลยอดขาย โดยเช็คจากช่วงวันที่ระบุใน Date Picker
        async function fetchSalesData() { 
            try { 
                const startDateVal = document.getElementById('salesDateStart')?.value;
                const endDateVal = document.getElementById('salesDateEnd')?.value;
                
                let dateKeys = [];
                if (startDateVal && endDateVal) {
                    let start = new Date(startDateVal);
                    let end = new Date(endDateVal);
                    if (start > end) {
                        const temp = start;
                        start = end;
                        end = temp;
                    }
                    let current = new Date(start);
                    while (current <= end) {
                        const year = current.getFullYear();
                        const month = String(current.getMonth() + 1).padStart(2, '0');
                        const date = String(current.getDate()).padStart(2, '0');
                        dateKeys.push(`${year}-${month}-${date}`);
                        current.setDate(current.getDate() + 1);
                    }
                } else {
                    dateKeys.push(getBusinessDateKey());
                }

                const fetchPromises = dateKeys.map(key => 
                    fetch(`${FIREBASE_URL}OrderHistory/${key}.json`)
                        .then(r => r.json())
                        .catch(() => null)
                );
                const results = await Promise.all(fetchPromises);
                
                let combinedData = {};
                results.forEach(dayData => {
                    if (dayData) {
                        Object.assign(combinedData, dayData);
                    }
                });

                let data = combinedData;
                let isLegacy = false;
                
                if(!data || Object.keys(data).length === 0) {
                    let res = await fetch(`${FIREBASE_URL}Orders.json`);
                    data = await res.json() || {};
                    isLegacy = true;
                }
                
                let totalRevenue = 0; let totalOrders = 0; let categorySales = {}; let totalItemsCount = 0; let paidOrdersArray = []; 
                let cashSales = 0; let transferSales = 0; let creditSales = 0;
                
                let displayDateStr;
                if (startDateVal && endDateVal) {
                    if (startDateVal === endDateVal) {
                        displayDateStr = new Date(startDateVal).toLocaleDateString('th-TH');
                    } else {
                        displayDateStr = new Date(startDateVal).toLocaleDateString('th-TH') + ' ถึง ' + new Date(endDateVal).toLocaleDateString('th-TH');
                    }
                } else {
                    displayDateStr = getBusinessDate();
                }

                for(let key in data) { 
                    const order = data[key]; 
                    if(order && order.status === 'paid') { 
                        const orderDateKey = getBusinessDateKey(order.timestamp);
                        const isMatch = !isLegacy || dateKeys.includes(orderDateKey);
                        if (isMatch) { 
                            order._dateKey = orderDateKey; // บันทึก dateKey ของบิลสำหรับใช้อ้างอิงพาธในการลบ
                            const orderAmount = Number(order.totalAmount || 0);
                            totalRevenue += orderAmount; totalOrders++; paidOrdersArray.push(order); 
                            
                            const method = (order.paymentMethod || '').toLowerCase();
                            if (method === 'cash') {
                                cashSales += orderAmount;
                            } else if (method === 'transfer') {
                                transferSales += orderAmount;
                            } else if (method === 'credit') {
                                creditSales += orderAmount;
                            }

                            (order.items || []).filter(i => i.itemStatus !== 'canceled').forEach(item => { 
                                let rawCat = item.category || 'อื่นๆ'; 
                                let cat = window.getBroadMainCategory(rawCat);
                                if(!categorySales[cat]) { categorySales[cat] = { totalQty: 0, totalAmount: 0, subCats: {} }; } 
                                categorySales[cat].totalQty += item.qty; categorySales[cat].totalAmount += item.totalPrice; 
                                
                                let subCat = item.category || 'ทั่วไป';
                                if(!categorySales[cat].subCats[subCat]) { 
                                    categorySales[cat].subCats[subCat] = { totalQty: 0, totalAmount: 0, items: {} }; 
                                }
                                categorySales[cat].subCats[subCat].totalQty += item.qty;
                                categorySales[cat].subCats[subCat].totalAmount += item.totalPrice;
                                
                                if(!categorySales[cat].subCats[subCat].items[item.name]) { 
                                    categorySales[cat].subCats[subCat].items[item.name] = { qty: 0, total: 0 }; 
                                } 
                                categorySales[cat].subCats[subCat].items[item.name].qty += item.qty; 
                                categorySales[cat].subCats[subCat].items[item.name].total += item.totalPrice;
                                totalItemsCount += item.qty; 
                            }); 
                        } 
                    } 
                } 
                
                window.currentPaidOrders = paidOrdersArray; 
                paidOrdersArray.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)); 
                
                window.currentSalesData = {
                    totalRevenue,
                    totalOrders,
                    categorySales,
                    totalItemsCount,
                    paidOrdersArray,
                    displayDateStr,
                    cashSales,
                    transferSales,
                    creditSales
                };
                window.salesPaymentFilter = 'all'; // reset filter on fresh load
                window.renderSalesUI();
                
            } catch (e) { document.getElementById('sales-container').innerHTML = `<p class="text-center text-red-500">โหลดข้อมูลล้มเหลว</p>`; } 
        }
        
        window.exportSalesToExcel = function() {
            window.exportSalesItemsCSV();
        };

        window.exportSalesItemsCSV = function() {
            if(!window.currentPaidOrders || window.currentPaidOrders.length === 0) return alert("⚠️ ไม่มีข้อมูลยอดขายสำหรับดาวน์โหลดครับ");
            
            // Rows array for Excel/CSV
            const rows = [
                [
                    "วันที่ (YYYY-MM-DD)", "ปี", "เดือน", "วัน", "ชั่วโมง", "วันในสัปดาห์", "เวลา", 
                    "รหัสบิล", "ประเภทออเดอร์", "โต๊ะ", "วิธีชำระเงิน", "แคชเชียร์", 
                    "รหัสเมนู", "หมวดหมู่หลัก", "หมวดหมู่ย่อย", "ชื่อเมนูหลัก", "รูปแบบ (ร้อน/เย็น/ไซส์)", "ท็อปปิ้ง", 
                    "จำนวน", "ราคาต่อชิ้น", "ราคารวมสินค้า (ก่อนลด)", "ส่วนลดเฉลี่ยลงสินค้า", "ยอดรวมสุทธิสินค้า", 
                    "เหตุผลส่วนลด", "หมายเหตุเพิ่มเติม"
                ]
            ];
            
            window.currentPaidOrders.forEach(order => {
                const dateObj = new Date(order.timestamp);
                const isoDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                
                const weekdays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
                const weekdayStr = weekdays[dateObj.getDay()];
                
                const validItems = (order.items || []).filter(i => i.itemStatus !== 'canceled');
                const orderSubtotal = Number(order.subtotalAmount ?? validItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0));
                const orderDiscount = Number(order.discount?.amount || 0);
                
                validItems.forEach(item => {
                    let rawName = item.name || '-';
                    let baseMenuName = rawName;
                    let variant = '-';
                    let toppings = '-';

                    const varMatch = rawName.match(/\((.*?)\)/);
                    if (varMatch) {
                        variant = varMatch[1];
                        baseMenuName = baseMenuName.replace(varMatch[0], '');
                    }

                    const topMatch = rawName.match(/\[(.*?)\]/);
                    if (topMatch) {
                        toppings = topMatch[1];
                        baseMenuName = baseMenuName.replace(topMatch[0], '');
                    }

                    baseMenuName = baseMenuName.trim();
                    const pricePerUnit = item.qty > 0 ? (item.totalPrice / item.qty) : 0;

                    // ปันส่วนลด
                    let allocatedDiscount = 0;
                    if (orderSubtotal > 0 && orderDiscount > 0) {
                        allocatedDiscount = (Number(item.totalPrice || 0) / orderSubtotal) * orderDiscount;
                        allocatedDiscount = Math.round(allocatedDiscount * 100) / 100;
                    }
                    const netItemPrice = Number(item.totalPrice || 0) - allocatedDiscount;

                    // หาหมวดหมู่
                    let rawCat = item.category || '';
                    if (!rawCat) {
                        const refMenu = (typeof allMenu !== 'undefined') ? allMenu.find(m => String(m.Name || '').trim() === baseMenuName) : null;
                        rawCat = refMenu ? refMenu.Category : 'อื่นๆ';
                    }
                    const mainCategory = window.getBroadMainCategory(rawCat);
                    const subCategory = window.getItemSubCategory(rawCat);

                    // หารหัสเมนู
                    let rawKey = item.menuKey || '';
                    if (!rawKey || rawKey === 'custom') {
                        const refMenu = (typeof allMenu !== 'undefined') ? allMenu.find(m => String(m.Name || '').trim() === baseMenuName) : null;
                        rawKey = refMenu ? refMenu._key : (rawKey || '-');
                    }

                    let tableLabel = order.tableNo || '-';
                    if (order.orderType === 'Dine-in') {
                        if (!tableLabel.startsWith('โต๊ะ')) {
                            tableLabel = 'โต๊ะ ' + tableLabel;
                        }
                    } else {
                        tableLabel = order.orderType === 'Takeaway' ? 'กลับบ้าน' : 'เดลิเวอรี่';
                    }

                    rows.push([
                        isoDate,
                        dateObj.getFullYear(),
                        dateObj.getMonth() + 1,
                        dateObj.getDate(),
                        dateObj.getHours(),
                        weekdayStr,
                        timeStr,
                        order.orderId || '-',
                        order.orderType || '-',
                        tableLabel,
                        order.paymentMethod || '-',
                        order.staffName || order.cashierName || '-',
                        rawKey,
                        mainCategory,
                        subCategory,
                        baseMenuName,
                        variant,
                        toppings,
                        Number(item.qty || 0),
                        Number(pricePerUnit),
                        Number(item.totalPrice || 0),
                        Number(allocatedDiscount),
                        Number(netItemPrice),
                        order.discount?.reason || '-',
                        item.note || '-'
                    ]);
                });
            });
            
            window.downloadXLSXFile(rows);
        };

        window.downloadXLSXFile = function(rows) {
            const startVal = document.getElementById('salesDateStart')?.value;
            const endVal = document.getElementById('salesDateEnd')?.value;
            const exportDateStr = (startVal && endVal) 
                ? (startVal === endVal ? startVal : `${startVal}_ถึง_${endVal}`)
                : new Date().toISOString().split('T')[0];

            try {
                if (typeof XLSX === 'undefined') {
                    throw new Error("ระบบ XLSX ยังโหลดไม่เสร็จ กรุณารอสักครู่หรือดาวน์โหลดแบบ CSV แทนครับ");
                }
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, "ยอดขายรายสินค้า");
                XLSX.writeFile(wb, `สรุปยอดขาย_BDC_${exportDateStr}.xlsx`);
            } catch (e) {
                console.error(e);
                alert("❌ ไม่สามารถดาวน์โหลดเป็น .xlsx ได้: " + e.message + "\nระบบจะสลับไปดาวน์โหลดแบบ CSV ให้แทนครับ");
                window.downloadCSVFallback(rows, exportDateStr);
            }
        };

        window.downloadCSVFallback = function(rows, exportDateStr) {
            let csvContent = "\uFEFF";
            rows.forEach(r => {
                const safeRow = r.map(val => `"${(val || '-').toString().replace(/"/g, '""')}"`);
                csvContent += safeRow.join(",") + "\n";
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob); 
            const link = document.createElement("a"); 
            link.setAttribute("href", url); 
            link.setAttribute("download", `สรุปยอดขาย_BDC_${exportDateStr}.csv`); 
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link); 
        };

        // 🗑️ ฟังก์ชันลบบิลขายเดี่ยวรายใบอย่างถาวร (ควบคุมสิทธิ์แอดมิน + ใช้ Owner PIN)
        window.deletePaidOrder = function(orderId, dateKey) {
            const isOwner = currentUser && ((currentUser.Role || "").toLowerCase().includes('owner') || currentUser.Username === 'owner' || currentUser.Username === 'gun');
            const canClear = currentUser && (currentUser.Permissions?.admin || currentUser.Permissions?.clear || isOwner);
            if (!canClear) {
                return alert("⚠️ คุณไม่มีสิทธิ์ลบบิลนี้");
            }
            
            const enteredPin = prompt(`🔑 กรุณาใส่ Owner PIN เพื่อยืนยันการลบบิลถาวร\n(บิล #${orderId})`);
            if (enteredPin === null) return; // กดยกเลิก
            if (enteredPin !== appSettings.ownerPin) {
                return alert("❌ รหัส Owner PIN ไม่ถูกต้อง! การดำเนินการถูกยกเลิก");
            }

            showModal('confirm', 'ลบบิลถาวร', `⚠️ คุณยืนยันที่จะลบบิล #${orderId} หรือไม่?\nยอดขายและข้อมูลในบิลนี้จะถูกลบออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้`, async () => {
                try {
                    // หากมี dateKey (รูปแบบใหม่) ให้ลบตามวันที่ในประวัติ หากไม่มีให้ลบจาก Orders หลัก (รูปแบบเก่า)
                    const path = dateKey ? `OrderHistory/${dateKey}/${orderId}.json` : `Orders/${orderId}.json`;
                    const res = await fetch(`${FIREBASE_URL}${path}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error("ลบข้อมูลไม่สำเร็จ");
                    
                    alert("🗑️ ลบบิลสำเร็จแล้ว");
                    logActivity('DELETE_PAID_ORDER', `ลบบิลชำระเงินถาวร: บิล #${orderId} (วันที่: ${dateKey || 'Legacy'})`);
                    fetchSalesData();
                } catch (e) {
                    alert("❌ เกิดข้อผิดพลาดในการลบบิล: " + e.message);
                }
            });
        };

        window.updateBulkDeleteBar = function() {
            const checkboxes = document.querySelectorAll('.bill-select-chk:checked');
            const count = checkboxes.length;
            const bar = document.getElementById('bulkDeleteBar');
            const countText = document.getElementById('bulkDeleteCount');
            if (bar && countText) {
                countText.innerText = count + ' บิล';
                if (count > 0) {
                    bar.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
                    bar.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
                } else {
                    bar.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                    bar.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
                }
            }
        };

        window.selectAllBills = function(status) {
            const checkboxes = document.querySelectorAll('.bill-select-chk');
            checkboxes.forEach(chk => {
                chk.checked = status;
            });
            window.updateBulkDeleteBar();
        };

        window.deleteSelectedBills = function() {
            const checkboxes = document.querySelectorAll('.bill-select-chk:checked');
            if (checkboxes.length === 0) return;

            const isOwner = currentUser && ((currentUser.Role || "").toLowerCase().includes('owner') || currentUser.Username === 'owner' || currentUser.Username === 'gun');
            const canClear = currentUser && (currentUser.Permissions?.admin || currentUser.Permissions?.clear || isOwner);
            if (!canClear) {
                return alert("⚠️ คุณไม่มีสิทธิ์ลบบิล");
            }

            const enteredPin = prompt(`🔑 กรุณาใส่ Owner PIN เพื่อยืนยันการลบบิลจำนวน ${checkboxes.length} บิลถาวร`);
            if (enteredPin === null) return; // กดยกเลิก
            if (enteredPin !== appSettings.ownerPin) {
                return alert("❌ รหัส Owner PIN ไม่ถูกต้อง! การดำเนินการถูกยกเลิก");
            }

            showModal('confirm', 'ลบบิลหลายรายการถาวร', `⚠️ คุณยืนยันที่จะลบบิลทั้งหมดที่เลือกจำนวน ${checkboxes.length} บิลหรือไม่?\nยอดขายและข้อมูลในบิลเหล่านี้จะถูกลบออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้`, async () => {
                try {
                    const deletePromises = Array.from(checkboxes).map(async chk => {
                        const orderId = chk.getAttribute('data-id');
                        const dateKey = chk.getAttribute('data-date');
                        const path = dateKey ? `OrderHistory/${dateKey}/${orderId}.json` : `Orders/${orderId}.json`;
                        const res = await fetch(`${FIREBASE_URL}${path}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error(`ลบข้อมูลบิล #${orderId} ไม่สำเร็จ`);
                        return { orderId, dateKey };
                    });

                    const deletedResults = await Promise.all(deletePromises);
                    const deletedInfo = deletedResults.map(r => `#${r.orderId} (${r.dateKey || 'Legacy'})`).join(', ');

                    alert(`🗑️ ลบสำเร็จทั้งหมด ${deletedResults.length} บิลแล้ว`);
                    logActivity('DELETE_MULTIPLE_ORDERS', `ลบบิลชำระเงินถาวรหลายรายการ จำนวน ${deletedResults.length} บิล: ${deletedInfo}`);
                    fetchSalesData();
                } catch (e) {
                    alert("❌ เกิดข้อผิดพลาดในการลบบิลบางรายการ: " + e.message);
                    fetchSalesData();
                }
            });
        };
 
        window.initialDataPromise = fetchInitialData();
