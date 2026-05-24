        window.toggleSalesTab = function(tabName) { if(tabName === 'bills') { document.getElementById('tab-btn-bills').className = "flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow transition-all"; document.getElementById('tab-btn-items').className = "flex-1 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold transition-all"; document.getElementById('sales-bills-view').classList.remove('hidden'); document.getElementById('sales-items-view').classList.add('hidden'); } else { document.getElementById('tab-btn-items').className = "flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow transition-all"; document.getElementById('tab-btn-bills').className = "flex-1 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold transition-all"; document.getElementById('sales-items-view').classList.remove('hidden'); document.getElementById('sales-bills-view').classList.add('hidden'); } };
        window.toggleAccordion = function(id) { const content = document.getElementById(id); const icon = document.getElementById('icon-' + id); if(content.classList.contains('hidden')) { content.classList.remove('hidden'); icon.style.transform = 'rotate(180deg)'; } else { content.classList.add('hidden'); icon.style.transform = 'rotate(0deg)'; } };
        
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
                            totalRevenue += Number(order.totalAmount || 0); totalOrders++; paidOrdersArray.push(order); 
                            (order.items || []).filter(i => i.itemStatus !== 'canceled').forEach(item => { 
                                let cat = item.category || 'อื่นๆ'; 
                                if(!categorySales[cat]) { categorySales[cat] = { totalQty: 0, totalAmount: 0, items: {} }; } 
                                categorySales[cat].totalQty += item.qty; categorySales[cat].totalAmount += item.totalPrice; 
                                if(!categorySales[cat].items[item.name]) { categorySales[cat].items[item.name] = { qty: 0, total: 0 }; } 
                                categorySales[cat].items[item.name].qty += item.qty; categorySales[cat].items[item.name].total += item.totalPrice; totalItemsCount += item.qty; 
                            }); 
                        } 
                    } 
                } 
                
                window.currentPaidOrders = paidOrdersArray; 
                paidOrdersArray.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)); 
                
                let billsHtml = paidOrdersArray.map(order => {
                    const timeStr = new Date(order.paidAt || order.timestamp).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'});
                    const validItems = (order.items || []).filter(i => i.itemStatus !== 'canceled');
                    const subtotal = Number(order.subtotalAmount ?? validItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0));
                    const discountAmount = Number(order.discount?.amount || 0);
                    const orderIdSafe = String(order.orderId || '').replace(/'/g, "\\'");
                    return `<div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-3"><div class="flex justify-between items-center border-b border-gray-100 pb-2 mb-2"><span class="font-bold text-indigo-700">โต๊ะ ${order.tableNo} <span class="text-[10px] text-gray-400 font-normal ml-1">#${order.orderId}</span></span><span class="text-xs text-gray-500"><i class="fa-solid fa-clock"></i> ${timeStr}</span></div><div class="text-xs text-gray-600 mb-2 space-y-1">${validItems.map(i => `<div class="flex justify-between"><span>${i.qty}x ${i.name}</span><span>฿${Number(i.totalPrice || 0).toLocaleString()}</span></div>`).join('')}</div>${discountAmount ? `<div class="text-xs bg-amber-50 border border-amber-100 rounded-lg p-2 mb-2"><div class="flex justify-between text-slate-500"><span>ยอดก่อนลด</span><span>฿${subtotal.toLocaleString()}</span></div><div class="flex justify-between text-red-500 font-bold"><span>ส่วนลด (${order.discount?.reason || '-'})</span><span>-฿${discountAmount.toLocaleString()}</span></div></div>` : ''}<div class="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-gray-200"><span class="text-[10px] text-gray-400">แคชเชียร์: ${order.cashierName || order.staffName || '-'}</span><span class="font-bold text-gray-800 text-sm">฿${Number(order.totalAmount || 0).toLocaleString()}</span></div><button onclick="printPaidReceipt('${orderIdSafe}')" class="mt-3 w-full bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold active:scale-95"><i class="fa-solid fa-receipt mr-1"></i> ออกใบเสร็จอีกครั้ง</button></div>`;
                }).join(''); if(billsHtml === '') billsHtml = `<p class="text-center text-gray-400 py-4 text-sm">ยังไม่มีบิลที่ชำระเงินแล้วในรอบบิลนี้</p>`; const sortedCategories = Object.entries(categorySales).sort((a, b) => b[1].totalAmount - a[1].totalAmount); let itemsHtml = sortedCategories.map(([catName, catData]) => { const catId = 'cat-' + catName.replace(/[^a-zA-Z0-9]/g, ''); const sortedItems = Object.entries(catData.items).sort((a, b) => b[1].qty - a[1].qty); const subItemsHtml = sortedItems.map(([itemName, stat]) => `<div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 mb-1.5 ml-2"><div class="flex items-center gap-2"><span class="bg-gray-200 text-gray-600 font-bold w-6 h-6 rounded-full flex items-center justify-center text-[10px]">${stat.qty}</span><span class="text-xs font-semibold text-gray-700">${itemName}</span></div><span class="font-bold text-gray-800 text-xs">฿${stat.total.toLocaleString()}</span></div>`).join(''); return `<div class="bg-white rounded-xl border border-indigo-100 shadow-sm mb-3 overflow-hidden"><button onclick="toggleAccordion('${catId}')" class="w-full flex justify-between items-center p-3 bg-indigo-50/30 hover:bg-indigo-50 transition-colors"><div class="flex items-center gap-3"><span class="bg-indigo-100 text-indigo-700 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">${catData.totalQty}</span><span class="font-bold text-indigo-900">${catName}</span></div><div class="flex items-center gap-3"><span class="font-bold text-indigo-700">฿${catData.totalAmount.toLocaleString()}</span><i id="icon-${catId}" class="fa-solid fa-chevron-down text-indigo-400 transition-transform duration-300"></i></div></button><div id="${catId}" class="hidden p-2 border-t border-indigo-50 bg-white">${subItemsHtml}</div></div>`; }).join(''); if(itemsHtml === '') itemsHtml = `<p class="text-center text-gray-400 py-4 text-sm">ยังไม่มีรายการขายในรอบบิลนี้</p>`; document.getElementById('sales-container').innerHTML = `<div class="grid grid-cols-2 gap-3 mb-4"><div class="col-span-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-3xl shadow-lg text-center relative overflow-hidden"><div class="absolute top-0 right-0 opacity-10 text-7xl transform translate-x-4 -translate-y-4"><i class="fa-solid fa-coins"></i></div><p class="text-xs text-indigo-100 mb-1">ยอดขายรวมตามช่วงวันที่เลือก</p><p class="text-4xl font-bold">฿${totalRevenue.toLocaleString()}</p><p class="text-[10px] text-indigo-200 mt-3 bg-black/20 inline-block px-3 py-1 rounded-full"><i class="fa-solid fa-calendar-days"></i> แสดงข้อมูล: ${displayDateStr}</p></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50 text-center"><p class="text-xs text-gray-500 mb-1">จำนวนบิล</p><p class="text-2xl font-bold text-indigo-600">${totalOrders}</p></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50 text-center"><p class="text-xs text-gray-500 mb-1">ขายได้ทั้งหมด</p><p class="text-2xl font-bold text-emerald-500">${totalItemsCount} <span class="text-xs font-normal">ชิ้น</span></p></div></div><div class="flex gap-2 mb-4"><button onclick="toggleSalesTab('bills')" id="tab-btn-bills" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow transition-all">ประวัติบิลทั้งหมด</button><button onclick="toggleSalesTab('items')" id="tab-btn-items" class="flex-1 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold transition-all">สรุปรายสินค้า</button></div><div id="sales-bills-view" class="space-y-2 pb-10 block">${billsHtml}</div><div id="sales-items-view" class="space-y-2 pb-10 hidden">${itemsHtml}</div>`; 
            } catch (e) { document.getElementById('sales-container').innerHTML = `<p class="text-center text-red-500">โหลดข้อมูลล้มเหลว</p>`; } 
        }
        
        window.exportSalesToExcel = function() { 
            if(!window.currentPaidOrders || window.currentPaidOrders.length === 0) return alert("⚠️ ไม่มีข้อมูลยอดขายสำหรับดาวน์โหลดครับ"); 
            let csvContent = "\uFEFF"; 
            
            csvContent += "วันที่,เวลา,รหัสบิล,ประเภท,วิธีชำระ,แคชเชียร์,ชื่อเมนูหลัก,รูปแบบ (ร้อน/เย็น/ไซส์),ท็อปปิ้ง,จำนวน,ราคาต่อชิ้น,ราคารวม,หมายเหตุเพิ่มเติม\n"; 
            
            window.currentPaidOrders.forEach(order => { 
                const dateObj = new Date(order.timestamp);
                const dateStr = dateObj.toLocaleDateString('th-TH');
                const timeStr = dateObj.toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'});
                
                const validItems = (order.items || []).filter(i => i.itemStatus !== 'canceled'); 
                
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

                    const safeBaseName = `"${baseMenuName.replace(/"/g, '""')}"`;
                    const safeVariant = `"${variant.replace(/"/g, '""')}"`;
                    const safeToppings = `"${toppings.replace(/"/g, '""')}"`;
                    const safeNote = `"${(item.note || '-').replace(/"/g, '""')}"`;
                    const pricePerUnit = item.totalPrice / item.qty;

                    let row = [
                        dateStr, 
                        timeStr, 
                        order.orderId || '-', 
                        order.orderType || '-', 
                        order.paymentMethod || '-', 
                        order.staffName || '-', 
                        safeBaseName, 
                        safeVariant,
                        safeToppings,
                        item.qty, 
                        pricePerUnit,
                        item.totalPrice, 
                        safeNote
                    ]; 
                    csvContent += row.join(",") + "\n"; 
                });
            }); 
            
            // อ่านวันที่ที่ใช้ดึงไฟล์นี้
            const startVal = document.getElementById('salesDateStart')?.value;
            const endVal = document.getElementById('salesDateEnd')?.value;
            const exportDateStr = (startVal && endVal) 
                ? (startVal === endVal ? startVal : `${startVal}_ถึง_${endVal}`)
                : new Date().toISOString().split('T')[0];

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob); 
            const link = document.createElement("a"); 
            link.setAttribute("href", url); 
            link.setAttribute("download", `สรุปยอดขาย_BDC_${exportDateStr}.csv`); 
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link); 
        };

        fetchInitialData();
