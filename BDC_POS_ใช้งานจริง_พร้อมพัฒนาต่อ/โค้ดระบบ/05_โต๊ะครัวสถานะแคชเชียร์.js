        // ==========================================
        // ระบบ Cart, ทั่วไป และ ปิดบิล 
        // ==========================================
        async function openTableModal() { await fetchActiveOrders(); renderTableMap(); document.getElementById('tableModal').classList.remove('hidden'); }
        function renderTableMap() { const grid = document.getElementById('tableMapGrid'); let html = ""; if(allTables.length === 0) { grid.innerHTML = '<p class="text-center col-span-3 text-gray-400 py-4">ยังไม่มีโต๊ะในระบบ กรุณาเพิ่มโต๊ะในเมนู "จัดการผังโต๊ะ"</p>'; return; } allTables.forEach(tbl => { let status = "available"; let bgColor = "bg-green-50 border-green-300 text-green-700"; let icon = "fa-check"; let orderKey = null; for(let key in activeOrders) { const order = activeOrders[key]; if(order.tableNo === tbl && !['paid', 'canceled', 'canceled_cleared'].includes(order.status)) { orderKey = key; if(order.status === 'booked') { status = "booked"; bgColor = "bg-yellow-50 border-yellow-400 text-yellow-700 shadow-md"; icon = "fa-calendar-check"; } else { status = "occupied"; bgColor = "bg-red-50 border-red-400 text-red-700 shadow-md"; icon = "fa-users"; } break; } } html += `<button onclick="handleTableClick('${tbl}', '${status}', '${orderKey}')" class="table-btn p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 ${bgColor}"><i class="fa-solid ${icon} text-xl mb-1"></i><span class="font-bold">${tbl}</span></button>`; }); grid.innerHTML = html; }
        function closeTableModal() { document.getElementById('tableModal').classList.add('hidden'); }
        function handleTableClick(tbl, status, orderKey) { document.getElementById('actionTableTitle').innerText = `โต๊ะ ${tbl}`; const btnContainer = document.getElementById('tableActionButtons'); let html = ""; if(status === 'available') { html = `<button onclick="setTableForOrder('${tbl}', 'Dine-in')" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow active:scale-95"><i class="fa-solid fa-utensils mr-2"></i> เปิดโต๊ะสั่งอาหาร</button><button onclick="bookTableOnly('${tbl}')" class="w-full bg-yellow-400 text-yellow-900 py-3.5 rounded-xl font-bold shadow active:scale-95 mt-3"><i class="fa-solid fa-calendar-plus mr-2"></i> จองโต๊ะ (ยังไม่สั่งอาหาร)</button>`; } else if (status === 'booked') { html = `<p class="text-sm text-yellow-600 mb-3 font-bold text-center">โต๊ะนี้ถูกจองไว้แล้ว</p><button onclick="convertBookingToActive('${tbl}', '${orderKey}')" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow active:scale-95"><i class="fa-solid fa-bell-concierge mr-2"></i> ลูกค้ามาแล้ว (เปิดโต๊ะรับออเดอร์)</button><button onclick="cancelBooking('${orderKey}')" class="w-full bg-red-100 text-red-600 py-3.5 rounded-xl font-bold border border-red-300 active:scale-95 mt-3"><i class="fa-solid fa-ban mr-2"></i> ยกเลิกการจอง</button>`; } else if (status === 'occupied') { html = `<p class="text-sm text-red-600 mb-3 font-bold text-center">โต๊ะนี้มีลูกค้ากำลังทานอยู่</p><button onclick="setTableForOrder('${tbl}', 'Dine-in')" class="w-full bg-blue-100 text-blue-700 border border-blue-300 py-3.5 rounded-xl font-bold shadow active:scale-95"><i class="fa-solid fa-plus mr-2"></i> สั่งอาหารเพิ่ม</button><button onclick="cancelActiveOrder('${orderKey}')" class="w-full bg-red-50 text-red-500 border border-red-200 py-3.5 rounded-xl font-bold shadow active:scale-95 mt-3"><i class="fa-solid fa-trash-can mr-2"></i> ยกเลิกบิลนี้ (ทิ้งออเดอร์)</button>`; } btnContainer.innerHTML = html; document.getElementById('tableActionModal').classList.remove('hidden'); }
        function setTableForOrder(tbl, type) { document.getElementById('tableNo').value = tbl; document.getElementById('orderType').value = type; document.getElementById('tableActionModal').classList.add('hidden'); closeTableModal(); }
        async function bookTableOnly(tbl) { document.getElementById('tableActionModal').classList.add('hidden'); const newBooking = { orderId: "RES-" + Date.now().toString().slice(-5), tableNo: tbl, orderType: "Booking", staffName: currentUser.Name, timestamp: new Date().toISOString(), status: "booked", totalAmount: 0, items: [] }; try { await fetch(`${FIREBASE_URL}ActiveOrders.json`, { method: 'POST', body: JSON.stringify(newBooking) }); alert(`📌 จองโต๊ะ ${tbl} เรียบร้อยแล้ว`); logActivity('NEW_ORDER', `จองโต๊ะล่วงหน้า: ${tbl}`); openTableModal(); } catch (e) {} }
        window.cancelBooking = function(orderKey) { showModal('confirm', 'ยกเลิกการจอง', 'ยืนยันการยกเลิกการจองโต๊ะนี้ใช่หรือไม่?', async () => { document.getElementById('tableActionModal').classList.add('hidden'); try { const tbl = activeOrders[orderKey].tableNo; delete activeOrders[orderKey]; renderTableMap(); await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'DELETE' }); logActivity('CANCEL_ORDER', `ยกเลิกการจองโต๊ะ: ${tbl}`); } catch (e) {} }); };
        window.convertBookingToActive = async function(tbl, orderKey) { document.getElementById('tableActionModal').classList.add('hidden'); try { await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'DELETE' }); delete activeOrders[orderKey]; setTableForOrder(tbl, "Dine-in"); } catch (e) {} };
        window.cancelActiveOrder = function(orderKey) { showModal('confirm', 'ยกเลิกบิล', "⚠️ ยืนยันการ 'ยกเลิกบิล' โต๊ะนี้ใช่หรือไม่?\n(ข้อมูลจะไม่ถูกนำไปคิดยอดขาย)", async () => { document.getElementById('tableActionModal').classList.add('hidden'); if(activeOrders[orderKey]) { const tbl = activeOrders[orderKey].tableNo; activeOrders[orderKey].status = 'canceled'; renderTableMap(); try { await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'PATCH', body: JSON.stringify({ status: 'canceled' }) }); logActivity('CANCEL_ORDER', `ทิ้งออเดอร์ (ยกเลิกบิล) จากผังโต๊ะ: ${tbl}`); fetchActiveOrders(); } catch (e) {} } }); };

        function formatItemNameHTML(name, isCanceledOrDone = false, isKitchen = false) {
            const match = name.match(/^(.*?)\[(.*?)\]$/);
            const lineClass = isCanceledOrDone ? 'line-through opacity-60 text-slate-400 font-normal' : '';
            if (match) {
                const baseName = match[1].trim();
                const subItems = match[2].split(',').map(s => s.trim()).filter(Boolean);
                const baseClass = isKitchen ? 'text-slate-800 font-black text-lg md:text-xl' : 'text-slate-800 font-bold';
                const subClass = isKitchen ? 'text-sm md:text-base text-slate-700 pl-4 font-bold' : 'text-[11px] text-slate-500 pl-3 font-semibold';
                let html = `<b class="${lineClass} ${baseClass}">${baseName}</b>`;
                subItems.forEach(sub => {
                    html += `<br><span class="${subClass} inline-block ${lineClass}">↳ ${sub}</span>`;
                });
                return html;
            }
            const itemClass = isKitchen ? 'text-slate-800 font-black text-lg md:text-xl' : '';
            return `<span class="${lineClass} ${itemClass}">${name}</span>`;
        }

        function addToCart(name, price, note, category) { const existing = cart.find(item => item.name === name && item.note === note); if(existing) { existing.qty++; existing.totalPrice = existing.qty * price; } else { cart.push({ name, price: Number(price), qty: 1, totalPrice: Number(price), note: note, itemStatus: 'pending', category: category }); } updateCartUI(); const cartCountEl = document.getElementById('cartCount'); cartCountEl.classList.add('scale-150'); setTimeout(() => cartCountEl.classList.remove('scale-150'), 200); }
        function updateCartUI() { const count = cart.reduce((sum, item) => sum + item.qty, 0); const total = cart.reduce((sum, item) => sum + item.totalPrice, 0); document.getElementById('cartCount').innerText = count; document.getElementById('totalPrice').innerText = `฿${total.toLocaleString()}`; const modalTotal = document.getElementById('modalTotal'); if(modalTotal) modalTotal.innerText = `฿${total.toLocaleString()}`; }
        function openCart() { 
            if(cart.length === 0) return alert("ตะกร้าว่างเปล่า ลองจิ้มเมนูอาหารก่อนนะครับ 😋"); 
            const cartItems = document.getElementById('cartItems'); 
            cartItems.innerHTML = cart.map((item, index) => `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div class="flex-1 pr-2">
                        <p class="font-bold text-sm text-gray-800 leading-tight">${formatItemNameHTML(item.name)}</p>
                        ${item.note ? `<p class="text-xs text-red-500 font-bold mt-1">📌 ${item.note}</p>` : ''}
                        <button onclick="editCartItemNote(${index})" class="text-[10px] text-blue-600 hover:text-blue-800 mt-1 font-semibold flex items-center gap-1 outline-none">
                            <i class="fa-solid fa-pen text-[9px]"></i> ${item.note ? 'แก้ไขโน้ต' : '+ เพิ่มโน้ตพิเศษ'}
                        </button>
                        <p class="text-xs text-blue-500 font-semibold mt-1">฿${item.price.toLocaleString()}</p>
                    </div>
                    <div class="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm">
                        <button onclick="changeQty(${index}, -1)" class="text-lg font-bold text-gray-400 w-6 active:scale-90">-</button>
                        <span class="font-bold w-4 text-center text-sm">${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)" class="text-lg font-bold text-blue-500 w-6 active:scale-90">+</button>
                    </div>
                </div>
            `).join(''); 
            document.getElementById('cartModal').classList.remove('hidden'); 
        }

        window.editCartItemNote = function(index) {
            if(!cart[index]) return;
            const currentNote = cart[index].note || '';
            const newNote = prompt(`ระบุคำสั่งพิเศษสำหรับ "${cart[index].name}"\n(เช่น เผ็ดน้อย, ไม่ใส่หอม):`, currentNote);
            if (newNote !== null) {
                cart[index].note = newNote.trim();
                openCart();
            }
        };

        function changeQty(index, delta) { cart[index].qty += delta; if(cart[index].qty <= 0) cart.splice(index, 1); else cart[index].totalPrice = cart[index].qty * cart[index].price; updateCartUI(); if(cart.length === 0) closeCart(); else openCart(); }
        function closeCart() { document.getElementById('cartModal').classList.add('hidden'); }
        async function submitOrderToKitchen() { 
            let tableNo = document.getElementById('tableNo').value.trim(); 
            const orderType = document.getElementById('orderType').value; 
            if(!tableNo) { 
                openTablePromptModal(); 
                return; 
            } 
            const btn = document.getElementById('submitBtn'); 
            btn.disabled = true; 
            btn.innerHTML = "⏳ กำลังส่งเข้าครัว..."; 
            const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0); 
            const newOrder = { orderId: "B-" + Date.now().toString().slice(-5), tableNo: tableNo, orderType: orderType, staffName: currentUser.Name, timestamp: new Date().toISOString(), status: "pending", totalAmount: totalAmount, items: cart }; 
            try { 
                await fetch(`${FIREBASE_URL}ActiveOrders.json`, { method: 'POST', body: JSON.stringify(newOrder) }); 
                alert(`✅ ส่งออเดอร์โต๊ะ ${tableNo} สำเร็จ!`); 
                logActivity('NEW_ORDER', `ส่งออเดอร์ใหม่ โต๊ะ: ${tableNo} ยอด: ฿${totalAmount.toLocaleString()}`); 
                cart = []; 
                document.getElementById('tableNo').value = ""; 
                updateCartUI(); 
                closeCart(); 
                fetchActiveOrders(); 
            } catch (e) { 
                alert("❌ เกิดข้อผิดพลาดในการส่งเข้าครัว"); 
            } finally { 
                btn.disabled = false; 
                btn.innerHTML = "<i class='fa-solid fa-paper-plane mr-2'></i> ส่งออเดอร์"; 
            } 
        }

        async function fetchActiveOrders() { try { const res = await fetch(`${FIREBASE_URL}ActiveOrders.json`); const data = await res.json() || {}; activeOrders = {}; for(let key in data) { if(data[key] && !['paid', 'canceled_cleared'].includes(data[key].status)) { activeOrders[key] = data[key]; } } renderKitchen(); renderStatus(); renderCashier(); } catch (e) {} }
        function renderKitchen() { const container = document.getElementById('kitchen-container'); let html = ""; let count = 0; 
        
        let p = currentUser.Permissions || {};
        const isAdmin = p.admin || (currentUser.Role || "").toLowerCase().includes('admin');
        const isBar = (currentUser.Role || "").toLowerCase().includes('bar') || (currentUser.Role || "").toLowerCase().includes('บาร์');
        const isKitchen = (currentUser.Role || "").toLowerCase().includes('kitchen') || (currentUser.Role || "").toLowerCase().includes('ครัว');
        
        for(let key in activeOrders) { const order = activeOrders[key]; if(order.status === 'booked') continue; if(order.status === 'canceled') { count++; html += `<div class="bg-red-50 rounded-2xl shadow-sm border-l-4 border-red-500 p-4 flex flex-col cursor-pointer active:scale-95 transition-transform" onclick="acknowledgeCancel('${key}')"><div class="flex justify-between items-center border-b border-red-200 pb-2 mb-3"><span class="font-black text-xl text-red-800">${order.tableNo} <span class="text-xs font-normal">(${order.orderType})</span></span><span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">ยกเลิกแล้ว</span></div><p class="text-base text-red-600 font-bold text-center"><i class="fa-solid fa-triangle-exclamation text-2xl mb-1 block"></i> ออเดอร์นี้ถูกยกเลิกแล้ว!</p><p class="text-xs text-red-400 text-center mt-2">(แตะกรอบนี้เพื่อลบออกจากจอ)</p></div>`; continue; } if(order.status === 'pending' || order.status === 'cooking') { let filteredItems = (order.items || []).map((item, idx) => ({ ...item, originalIndex: idx })).filter(item => { if (isAdmin) return true; const isDrinkOrDessert = ['Beverage', 'Dessert', 'Desser&Beverage'].includes(item.category); if (isBar && !isKitchen) return isDrinkOrDessert; if (isKitchen && !isBar) return !isDrinkOrDessert; return true; }); if (filteredItems.length === 0) continue; count++; const timeStr = new Date(order.timestamp).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}); const isAllDoneInMyDept = filteredItems.filter(i => i.itemStatus !== 'canceled').every(i => i.itemStatus === 'done'); html += `<div class="bg-white rounded-2xl shadow-md border-l-4 ${isAllDoneInMyDept ? 'border-green-500 opacity-60' : 'border-orange-400'} p-4 flex flex-col"><div class="flex justify-between items-center border-b pb-2 mb-3"><div><span class="font-black text-xl md:text-2xl mr-2 text-slate-800">${order.tableNo}</span><span class="text-xs md:text-sm bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">${order.orderType}</span></div><span class="text-xs md:text-sm text-slate-500 font-semibold"><i class="fa-regular fa-clock"></i> ${timeStr}</span></div><div class="flex-1 space-y-3 mb-3">${filteredItems.map((item) => { const isDone = item.itemStatus === 'done'; const isCanceled = item.itemStatus === 'canceled'; if (isCanceled) { return `<div class="flex justify-between items-center p-3 rounded-xl border bg-red-50 border-red-200 opacity-80"><div class="flex flex-col"><span class="text-base md:text-lg font-bold text-red-500"><span class="text-red-600 mr-1.5 text-lg md:text-xl font-black">${item.qty}x</span> ${formatItemNameHTML(item.name, true, true)}</span></div><span class="text-xs font-bold text-red-600 px-2 py-1 bg-white rounded shadow-sm">ยกเลิกแล้ว</span></div>`; } return `<div onclick="toggleItemDone('${key}', ${item.originalIndex}, '${item.itemStatus || 'pending'}')" class="flex justify-between items-center p-3.5 rounded-xl border cursor-pointer active:scale-95 transition-all ${isDone ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}"><div class="flex-1 flex flex-col"><span class="text-base md:text-lg font-bold"><span class="text-orange-600 mr-1.5 text-lg md:text-xl font-black">${item.qty}x</span> ${formatItemNameHTML(item.name, isDone, true)}</span>${item.note ? `<span class="text-sm md:text-base font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded border border-red-200 mt-2 block shadow-sm"><i class="fa-solid fa-thumbtack mr-1"></i> ${item.note}</span>` : ''}</div><div class="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center border-2 shrink-0 ml-3 ${isDone ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-transparent'}"><i class="fa-solid fa-check text-sm md:text-base"></i></div></div>`; }).join('')}</div></div>`; } } if(count === 0) html = `<div class="text-center py-10 text-gray-400 text-sm col-span-2">ไม่มีออเดอร์ในแผนกของคุณครับ ล้างกระทะรอได้เลย!</div>`; container.innerHTML = html; }
        async function toggleItemDone(orderKey, originalIndex, currentStatus) { const newStatus = currentStatus === 'done' ? 'pending' : 'done'; const order = activeOrders[orderKey]; if(!order.items[originalIndex]) return; order.items[originalIndex].itemStatus = newStatus; const activeItems = order.items.filter(i => i.itemStatus !== 'canceled'); const allDoneGlobal = activeItems.length > 0 && activeItems.every(i => i.itemStatus === 'done'); const anyDoneGlobal = activeItems.some(i => i.itemStatus === 'done'); let newOrderStatus = order.status; if(allDoneGlobal) newOrderStatus = 'done'; else if(anyDoneGlobal) newOrderStatus = 'cooking'; else newOrderStatus = 'pending'; order.status = newOrderStatus; renderKitchen(); try { await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}/items/${originalIndex}.json`, { method: 'PATCH', body: JSON.stringify({ itemStatus: newStatus }) }); await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'PATCH', body: JSON.stringify({ status: newOrderStatus }) }); } catch (e) {} }
        window.acknowledgeCancel = async function(orderKey) { try { delete activeOrders[orderKey]; renderKitchen(); await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'DELETE' }); fetchActiveOrders(); } catch (e) {} };
        function renderStatus() { const container = document.getElementById('status-container'); let html = ""; let count = 0; for(let key in activeOrders) { const order = activeOrders[key]; if(!['paid', 'booked', 'canceled', 'canceled_cleared'].includes(order.status)) { count++; const timeStr = new Date(order.timestamp).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}); let statusColor = "bg-gray-100 text-gray-600 border-gray-200"; let statusText = "รอดำเนินการ"; let serveBtn = ""; if(order.status === 'pending') { statusText = "🕒 รอคิวทำ"; statusColor = "bg-gray-100 text-gray-600"; } else if(order.status === 'cooking') { statusText = "🔥 กำลังทำ"; statusColor = "bg-orange-100 text-orange-600 border-orange-200"; } else if(order.status === 'done') { statusText = "✅ เสร็จแล้ว (รอเสิร์ฟ)"; statusColor = "bg-green-100 text-green-700 border-green-300 shadow-sm"; serveBtn = `<button onclick="markAsServed('${key}')" class="mt-3 w-full bg-green-500 text-white py-2 rounded-lg font-bold shadow active:scale-95"><i class="fa-solid fa-hand-holding-hand mr-1"></i> กดเมื่อเสิร์ฟครบแล้ว</button>`; } else if(order.status === 'served') { statusText = "🍽️ เสิร์ฟแล้ว"; statusColor = "bg-blue-50 text-blue-500"; } let itemsListHtml = `<div class="mt-3 border-t border-gray-100 pt-3 space-y-2">`; (order.items || []).forEach((item, originalIndex) => { let iStatus = item.itemStatus || 'pending'; if(iStatus === 'canceled') { itemsListHtml += `<div class="flex justify-between items-center bg-red-50 p-2 rounded border border-red-100 opacity-70"><span class="text-sm font-semibold text-red-500"><span class="text-red-500 mr-1">${item.qty}x</span> ${formatItemNameHTML(item.name, true)}</span><span class="text-red-500 text-[10px] font-bold">ยกเลิกแล้ว</span></div>`; return; } let iColor = "text-gray-400"; let iIcon = "fa-clock"; let iLabel = "รอคิว"; if(iStatus === 'cooking') { iColor = "text-orange-500"; iIcon = "fa-fire"; iLabel = "กำลังปรุง"; } else if(iStatus === 'done') { iColor = "text-green-500"; iIcon = "fa-check"; iLabel = "เสร็จแล้ว"; } itemsListHtml += `<div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100"><div class="flex-1 pr-2"><span class="text-sm font-semibold"><span class="text-blue-500 mr-1">${item.qty}x</span> ${formatItemNameHTML(item.name, iStatus === 'done')}</span>${item.note ? `<p class="text-xs text-red-500 font-bold mt-0.5">📌 ${item.note}</p>` : ''}</div><div class="flex items-center gap-1 shrink-0"><span class="${iColor} text-[10px] font-bold bg-white px-2 py-1 rounded shadow-sm border"><i class="fa-solid ${iIcon} mr-1"></i> ${iLabel}</span><button onclick="cancelItemFromOrder('${key}', ${originalIndex})" class="text-red-500 hover:text-red-700 py-1.5 px-2 active:scale-90 ml-1 bg-red-50 rounded border border-red-200 shadow-sm flex items-center gap-1"><i class="fa-solid fa-trash-can"></i> <span class="text-[10px] font-bold">ลบ</span></button></div></div>`; }); itemsListHtml += `</div>`; html += `<div class="bg-white rounded-xl shadow-sm border p-4 ${order.status === 'done' ? 'border-2 border-green-400' : ''}"><div class="flex justify-between items-center mb-2"><span class="font-bold text-lg text-gray-800">โต๊ะ: ${order.tableNo}</span><span class="status-badge ${statusColor}">${statusText}</span></div><p class="text-xs text-gray-500 mb-2"><i class="fa-regular fa-clock"></i> สั่งเมื่อ: ${timeStr}</p>${itemsListHtml}${serveBtn}</div>`; } } if(count === 0) html = `<div class="text-center py-10 text-gray-400 text-sm">ไม่มีออเดอร์ในระบบ</div>`; container.innerHTML = html; }
        async function markAsServed(orderKey) { try { await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'PATCH', body: JSON.stringify({ status: 'served' }) }); fetchActiveOrders(); } catch (e) {} }
        window.cancelItemFromOrder = function(orderKey, itemIndex) { showModal('confirm', 'ยกเลิกเมนู', "⚠️ ยืนยันการ 'ยกเลิก' เมนูนี้?", async () => { const order = activeOrders[orderKey]; if(!order || !order.items || !order.items[itemIndex]) return; order.items[itemIndex].itemStatus = 'canceled'; order.totalAmount = order.items.filter(i => i.itemStatus !== 'canceled').reduce((sum, it) => sum + (it.totalPrice || 0), 0); renderStatus(); renderKitchen(); renderCashier(); try { if(order.totalAmount === 0 && order.items.every(i => i.itemStatus === 'canceled')) { order.status = 'canceled'; await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'PATCH', body: JSON.stringify({ status: 'canceled', items: order.items, totalAmount: 0 }) }); } else { await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'PATCH', body: JSON.stringify({ items: order.items, totalAmount: order.totalAmount }) }); } logActivity('CANCEL_ITEM', `ยกเลิกอาหาร: ${order.items[itemIndex].name} (โต๊ะ ${order.tableNo})`); } catch (e) { alert("เกิดข้อผิดพลาด"); } }); };
        window.cancelActiveOrderFromCashier = function(orderKey) { showModal('confirm', 'ยกเลิกบิล', 'ยืนยันการยกเลิกบิลใช่หรือไม่?', async () => { try { const order = activeOrders[orderKey]; if(!order) return; const paidAt = new Date().toISOString(); const canceledOrder = { ...order, status: 'canceled_cleared', canceledAt: paidAt, cashierName: currentUser?.Name || '-' }; const dateKey = getBusinessDateKey(paidAt); await fetch(`${FIREBASE_URL}OrderHistory/${dateKey}/${canceledOrder.orderId}.json`, { method: 'PUT', body: JSON.stringify(canceledOrder) }); await fetch(`${FIREBASE_URL}ActiveOrders/${orderKey}.json`, { method: 'DELETE' }); logActivity('CANCEL_ORDER', `แคชเชียร์ยกเลิกบิล โต๊ะ: ${order.tableNo}`); fetchActiveOrders(); } catch (e) {} }); };
        function canApproveDiscount() {
            const p = currentUser?.Permissions || {};
            const role = String(currentUser?.Role || '').toLowerCase();
            return !!(p.discount || p.admin || role.includes('admin') || role.includes('manager') || role.includes('owner'));
        }

        function getCheckoutDiscount(order) {
            const subtotal = Number(order?.totalAmount || 0);
            const canDiscount = canApproveDiscount();
            const discountType = document.getElementById('discountType')?.value || 'amount';
            const discountValue = Number(document.getElementById('discountValue')?.value || 0);
            const discountReason = (document.getElementById('discountReason')?.value || '').trim();
            if(!canDiscount || !discountValue || discountValue <= 0) {
                return { subtotal, amount: 0, finalTotal: subtotal, type: discountType, value: 0, reason: '' };
            }
            let amount = discountType === 'percent' ? Math.round(subtotal * Math.min(discountValue, 100) / 100) : discountValue;
            amount = Math.max(0, Math.min(subtotal, Number(amount || 0)));
            return { subtotal, amount, finalTotal: subtotal - amount, type: discountType, value: discountValue, reason: discountReason };
        }

        window.calculateDiscountPreview = function() {
            if(!currentCheckoutKey || !activeOrders[currentCheckoutKey]) return;
            const order = activeOrders[currentCheckoutKey];
            const discount = getCheckoutDiscount(order);
            const canDiscount = canApproveDiscount();
            const subtotalEl = document.getElementById('checkoutSubtotal');
            const totalEl = document.getElementById('qrTotalAmount');
            const lineEl = document.getElementById('checkoutDiscountLine');
            const amountEl = document.getElementById('checkoutDiscountAmount');
            const badgeEl = document.getElementById('discountPermissionBadge');
            const hintEl = document.getElementById('discountHint');
            const typeEl = document.getElementById('discountType');
            const valueEl = document.getElementById('discountValue');
            const reasonEl = document.getElementById('discountReason');
            if(subtotalEl) subtotalEl.innerText = `฿${discount.subtotal.toLocaleString()}`;
            if(totalEl) totalEl.innerText = `฿${discount.finalTotal.toLocaleString()}`;
            if(lineEl) lineEl.classList.toggle('hidden', discount.amount <= 0);
            if(amountEl) amountEl.innerText = `-฿${discount.amount.toLocaleString()}`;
            if(badgeEl) {
                badgeEl.innerText = canDiscount ? 'มีสิทธิ์ให้ส่วนลด' : 'ไม่มีสิทธิ์ให้ส่วนลด';
                badgeEl.className = canDiscount ? 'text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700';
            }
            if(hintEl) hintEl.innerText = canDiscount ? 'ถ้าใส่ส่วนลด ต้องกรอกเหตุผลเพื่อเก็บประวัติไว้ตรวจย้อนหลัง' : 'บัญชีนี้เก็บเงินได้ แต่ไม่มีสิทธิ์ใส่ส่วนลดท้ายบิล';
            [typeEl, valueEl, reasonEl].forEach(el => { if(el) el.disabled = !canDiscount; });
            if(!canDiscount && valueEl) valueEl.value = 0;
        };

        function openQRModal(orderKey) {
            currentCheckoutKey = orderKey;
            const order = activeOrders[orderKey];
            document.getElementById('qrTableNo').innerText = order.tableNo;
            const receipt = appSettings.receipt || {};
            const qrImg = document.getElementById('promptPayQrImage');
            const qrLabel = document.getElementById('promptPayQrLabel');
            const qrBox = document.getElementById('promptPayQrBox');
            if(qrImg) qrImg.src = receipt.promptPayQrUrl || "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROMPTPAY_MOCKUP";
            if(qrLabel) qrLabel.innerHTML = `<i class="fa-solid fa-qrcode mr-1"></i> ${receipt.promptPayName ? `PromptPay: ${receipt.promptPayName}` : 'สแกนเพื่อจ่าย'}`;
            if(qrBox) qrBox.classList.remove('hidden');
            
            // ซ่อนกล่องส่วนลดท้ายบิลทั้งหมด หากผู้ใช้ไม่มีสิทธิ์ในการให้ส่วนลด
            const discountBox = document.getElementById('discountBox');
            const canDiscount = canApproveDiscount();
            if(discountBox) {
                discountBox.classList.toggle('hidden', !canDiscount);
            }

            const valueEl = document.getElementById('discountValue');
            const reasonEl = document.getElementById('discountReason');
            if(valueEl) valueEl.value = 0;
            if(reasonEl) reasonEl.value = '';
            calculateDiscountPreview();
            document.getElementById('qrModal').classList.remove('hidden');
        }

        async function confirmPayment(method) {
            if(!currentCheckoutKey) return;
            try {
                const keyToUpdate = currentCheckoutKey;
                const order = activeOrders[keyToUpdate];
                const discount = getCheckoutDiscount(order);
                if(discount.amount > 0 && !canApproveDiscount()) return alert('⚠️ บัญชีนี้ไม่มีสิทธิ์ให้ส่วนลดท้ายบิลครับ');
                if(discount.amount > 0 && !discount.reason) return alert('⚠️ กรุณากรอกเหตุผลของส่วนลดก่อนรับชำระเงินครับ');

                const paidAt = new Date().toISOString();
                const paidOrder = {
                    ...order,
                    status: 'paid',
                    paymentMethod: method,
                    subtotalAmount: discount.subtotal,
                    discount: discount.amount > 0 ? {
                        type: discount.type,
                        value: discount.value,
                        amount: discount.amount,
                        reason: discount.reason,
                        approvedBy: currentUser?.Name || '-',
                        approvedAt: paidAt
                    } : null,
                    totalAmount: discount.finalTotal,
                    paidAt,
                    cashierName: currentUser?.Name || order.staffName || '-'
                };

                const receiptWindow = window.open('', '_blank', 'width=420,height=720');
                delete activeOrders[keyToUpdate];
                currentCheckoutKey = null;
                document.getElementById('qrModal').classList.add('hidden');
                renderCashier(); renderStatus(); renderKitchen();
                const dateKey = getBusinessDateKey(paidAt);
                await fetch(`${FIREBASE_URL}OrderHistory/${dateKey}/${paidOrder.orderId}.json`, { method: 'PUT', body: JSON.stringify(paidOrder) });
                await fetch(`${FIREBASE_URL}ActiveOrders/${keyToUpdate}.json`, { method: 'DELETE' });
                logActivity('PAYMENT', `รับชำระเงิน โต๊ะ ${order.tableNo} ยอดสุทธิ ฿${paidOrder.totalAmount.toLocaleString()}${discount.amount ? ` (ลด ฿${discount.amount.toLocaleString()}: ${discount.reason})` : ''} ด้วย ${method}`);
                printReceipt(paidOrder, receiptWindow);
                alert('💰 รับชำระเงินเรียบร้อยแล้ว! เปิดใบเสร็จให้แล้ว');
            } catch (e) {
                alert('❌ เกิดข้อผิดพลาดตอนรับชำระเงิน');
            }
        }

        function formatItemNameForReceipt(name) {
            const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
            const match = name.match(/^(.*?)\[(.*?)\]$/);
            if (match) {
                const baseName = match[1].trim();
                const subItems = match[2].split(',').map(s => s.trim()).filter(Boolean);
                let html = `<b>${esc(baseName)}</b>`;
                subItems.forEach(sub => {
                    html += `<br><span style="padding-left: 12px; font-size: 11px; color: #555; display: inline-block;">- ${esc(sub)}</span>`;
                });
                return html;
            }
            return esc(name);
        }

        function printReceipt(order, receiptWindow = null) {
            if(!order) return;
            const escReceipt = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
            const receiptSetting = appSettings.receipt || {};
            const validItems = (order.items || []).filter(i => i.itemStatus !== 'canceled');
            const subtotal = Number(order.subtotalAmount ?? validItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0));
            const discountAmount = Number(order.discount?.amount || 0);
            const total = Number(order.totalAmount ?? (subtotal - discountAmount));
            const paidDate = new Date(order.paidAt || new Date()).toLocaleString('th-TH');
            const rows = validItems.map(item => `<tr><td>${escReceipt(item.qty)}x ${formatItemNameForReceipt(item.name)}${item.note ? `<br><small>${escReceipt(item.note)}</small>` : ''}</td><td class="right">฿${Number(item.totalPrice || 0).toLocaleString()}</td></tr>`).join('');
            const logoHtml = receiptSetting.logoUrl ? `<img src="${escReceipt(receiptSetting.logoUrl)}" class="logo" alt="logo">` : `<div class="logoText">bd</div>`;
            const addressLines = [
                receiptSetting.shopName || 'บ้านเดือนฉาย',
                receiptSetting.phone ? `โทร ${receiptSetting.phone}` : '',
                receiptSetting.address || '',
                receiptSetting.facebook ? `Facebook: ${receiptSetting.facebook}` : ''
            ].filter(Boolean).map(line => `<p>${escReceipt(line)}</p>`).join('');
            const qrHtml = receiptSetting.promptPayQrUrl ? `<div class="qr"><img src="${escReceipt(receiptSetting.promptPayQrUrl)}" alt="PromptPay QR"><p>${escReceipt(receiptSetting.promptPayName || 'PromptPay')}</p></div>` : '';
            const html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>Receipt ${escReceipt(order.orderId || '')}</title><style>body{font-family:Arial,'Tahoma',sans-serif;margin:0;background:#f3f4f6;color:#111}.receipt{width:360px;margin:18px auto;background:#fff;padding:18px;border:1px solid #ddd}.header{display:grid;grid-template-columns:90px 1fr;gap:12px;align-items:start;border-bottom:1px solid #ddd;padding-bottom:10px;margin-bottom:10px}.logo{width:86px;max-height:86px;object-fit:contain}.logoText{width:86px;height:86px;border:2px solid #0f3f36;color:#0f3f36;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700}.shop{text-align:right}.shop p{margin:1px 0;font-size:11px}.center{text-align:center}.right{text-align:right}h1{font-size:20px;margin:0 0 4px}p{margin:3px 0;font-size:12px}table{width:100%;border-collapse:collapse;margin:12px 0}td{font-size:12px;padding:6px 0;border-bottom:1px dashed #ddd;vertical-align:top}.total{font-size:18px;font-weight:700}.muted{color:#666}.qr{text-align:center;margin:12px 0}.qr img{width:150px;height:150px;object-fit:contain}.btns{width:360px;margin:0 auto 20px;display:flex;gap:8px}.btns button{flex:1;padding:10px;border:0;border-radius:10px;font-weight:700}.print{background:#16a34a;color:#fff}.close{background:#e5e7eb}@media print{body{background:#fff}.receipt{margin:0;border:0;width:auto}.btns{display:none}}</style></head><body><div class="receipt"><div class="header"><div>${logoHtml}</div><div class="shop">${addressLines}</div></div><div class="center"><h1>ใบเสร็จรับเงิน</h1><p class="muted">เลขที่ ${escReceipt(order.orderId || '-')}</p><p class="muted">วันที่ ${paidDate}</p></div><hr><p><b>โต๊ะ/ลูกค้า:</b> ${escReceipt(order.tableNo || '-')}</p><p><b>ประเภท:</b> ${escReceipt(order.orderType || '-')}</p><p><b>แคชเชียร์:</b> ${escReceipt(order.cashierName || order.staffName || '-')}</p><table>${rows}</table><p class="right">ยอดก่อนส่วนลด: ฿${subtotal.toLocaleString()}</p>${discountAmount ? `<p class="right">ส่วนลด: -฿${discountAmount.toLocaleString()}</p><p class="muted">เหตุผล: ${escReceipt(order.discount?.reason || '-')}</p>` : ''}<p class="right total">ยอดสุทธิ: ฿${total.toLocaleString()}</p><p class="right">ชำระโดย: ${escReceipt(order.paymentMethod === 'cash' ? 'เงินสด' : order.paymentMethod === 'transfer' ? 'โอนเงิน' : order.paymentMethod || '-')}</p>${qrHtml}<hr><p class="center muted">${escReceipt(receiptSetting.note || 'ขอบคุณที่ใช้บริการ')}</p></div><div class="btns"><button class="print" onclick="window.print()">พิมพ์ใบเสร็จ</button><button class="close" onclick="window.close()">ปิด</button></div></body></html>`;
            receiptWindow = receiptWindow || window.open('', '_blank', 'width=420,height=720');
            if(!receiptWindow) return alert('เปิดใบเสร็จไม่สำเร็จ กรุณาอนุญาต popup ใน browser');
            receiptWindow.document.open();
            receiptWindow.document.write(html);
            receiptWindow.document.close();
            receiptWindow.focus();
        }

        window.printPaidReceipt = function(orderId) {
            const order = (window.currentPaidOrders || []).find(o => o.orderId === orderId);
            if(!order) return alert('ไม่พบข้อมูลใบเสร็จนี้ในวันที่เลือกครับ');
            printReceipt(order);
        };

        window.toggleCashierItems = function(id) {
            const panel = document.getElementById(id);
            const icon = document.getElementById(id + '-icon');
            if(!panel) return;
            const isHidden = panel.classList.contains('hidden');
            panel.classList.toggle('hidden', !isHidden);
            if(icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        };

        function renderCashier() {
            const container = document.getElementById('cashier-container');
            container.className = "p-3 cashier-list";
            let html = "";
            let count = 0;
            const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

            for(let key in activeOrders) {
                const order = activeOrders[key];
                if(order.status === 'booked' || order.status === 'canceled_cleared') continue;
                count++;

                const isCanceledOrder = order.status === 'canceled';
                const allItems = order.items || [];
                const activeItems = allItems.filter(i => i.itemStatus !== 'canceled');
                const canceledItems = allItems.filter(i => i.itemStatus === 'canceled');
                const panelId = 'cashier-items-' + key.replace(/[^a-zA-Z0-9_-]/g, '');
                const timeStr = order.timestamp ? new Date(order.timestamp).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : '-';
                const orderTypeLabel = order.orderType === 'Takeaway' ? 'สั่งกลับบ้าน' : order.orderType === 'Delivery' ? 'เดลิเวอรี่' : order.orderType === 'Dine-in' ? 'ทานที่ร้าน' : (order.orderType || '-');
                const isLongTableName = String(order.tableNo || '').length > 5;
                const orderIcon = isCanceledOrder ? 'fa-ban' : order.orderType === 'Delivery' ? 'fa-motorcycle' : order.orderType === 'Takeaway' ? 'fa-bag-shopping' : 'fa-chair';
                const tableTitlePrefix = order.orderType === 'Dine-in' ? 'โต๊ะ:' : 'ลูกค้า:';

                let badgeClass = "bg-slate-100 text-slate-600 border border-slate-200";
                let badgeText = "กำลังทาน";
                if(order.status === 'done' || order.status === 'served') {
                    badgeClass = "bg-teal-50 text-teal-700 border border-teal-200";
                    badgeText = "พร้อมชำระ";
                } else if(order.status === 'pending' || order.status === 'cooking') {
                    badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                    badgeText = "ยังทำไม่ครบ";
                }
                if(isCanceledOrder) {
                    badgeClass = "bg-red-50 text-red-600 border border-red-200";
                    badgeText = "ยกเลิกทั้งบิล";
                }

                const itemSummary = activeItems.length > 0
                    ? activeItems.slice(0, 3).map(i => esc(i.name)).join(', ') + (activeItems.length > 3 ? ` +${activeItems.length - 3}` : '')
                    : 'ไม่มีรายการคิดเงิน';

                const itemRows = allItems.map((item) => {
                    const isCanceled = item.itemStatus === 'canceled';
                    const lineClass = isCanceled ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100';
                    const nameClass = isCanceled ? 'line-through text-red-500' : 'text-slate-800';
                    const statusLabel = isCanceled ? '<span class="text-[10px] font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-100">ยกเลิก</span>' : '';
                    return `<div class="cashier-item-line ${lineClass}">
                        <div class="min-w-0">
                            <p class="text-sm font-bold"><span class="text-teal-600 mr-1">${item.qty || 0}x</span>${formatItemNameHTML(item.name, isCanceled)}</p>
                            ${item.note ? `<p class="text-xs text-red-500 font-bold mt-0.5">📌 ${esc(item.note)}</p>` : ''}
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            ${statusLabel}
                            <span class="text-sm font-bold ${isCanceled ? 'text-red-400 line-through' : 'text-slate-700'}">฿${Number(item.totalPrice || 0).toLocaleString()}</span>
                        </div>
                    </div>`;
                }).join('');

                html += `<div class="cashier-row ${isCanceledOrder ? 'border-red-200 bg-red-50/60' : ''}">
                    <div class="cashier-row-main">
                        <button onclick="toggleCashierItems('${panelId}')" class="text-left min-w-0">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl ${isCanceledOrder ? 'bg-red-100 text-red-600' : 'bg-teal-50 text-teal-700'} flex items-center justify-center font-bold shrink-0">${isLongTableName ? `<i class="fa-solid ${orderIcon}"></i>` : esc(order.tableNo || '-')}</div>
                                <div class="min-w-0">
                                    <p class="cashier-table-title font-bold text-slate-900">${tableTitlePrefix} ${esc(order.tableNo || '-')}</p>
                                    <p class="text-[10px] text-slate-500 flex flex-wrap items-center gap-1"><span><i class="fa-regular fa-clock"></i> ${timeStr}</span><span class="cashier-type-chip bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">${esc(orderTypeLabel)}</span></p>
                                </div>
                            </div>
                        </button>
                        <button onclick="toggleCashierItems('${panelId}')" class="text-left min-w-0">
                            <p class="text-lg font-bold ${isCanceledOrder ? 'text-red-600' : 'text-slate-900'}">฿${Number(order.totalAmount || 0).toLocaleString()}</p>
                            <p class="text-[11px] text-slate-500 truncate">${itemSummary}${canceledItems.length ? ` · ยกเลิก ${canceledItems.length}` : ''}</p>
                        </button>
                        <button onclick="toggleCashierItems('${panelId}')" class="cashier-status-cell text-left">
                            <span class="status-badge ${badgeClass}">${badgeText}</span>
                        </button>
                        <div class="cashier-actions-cell flex gap-2 justify-end">
                            <button onclick="window.cancelActiveOrderFromCashier('${key}')" class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex justify-center items-center active:scale-95 border border-red-100" title="${isCanceledOrder ? 'ลบออกจากจอ' : 'ยกเลิกบิล'}"><i class="fa-solid ${isCanceledOrder ? 'fa-check' : 'fa-trash-can'}"></i></button>
                            ${isCanceledOrder ? `<button onclick="toggleCashierItems('${panelId}')" class="flex-1 min-w-[116px] text-sm bg-slate-100 text-slate-600 py-2 rounded-xl font-bold active:scale-95"><i id="${panelId}-icon" class="fa-solid fa-chevron-down mr-1 transition-transform"></i> ดูรายการ</button>` : `<button onclick="openQRModal('${key}')" class="flex-1 min-w-[116px] text-sm bg-green-600 text-white py-2 rounded-xl font-bold shadow-sm active:scale-95"><i class="fa-solid fa-file-invoice-dollar mr-1"></i> ชำระเงิน</button>`}
                        </div>
                    </div>
                    <div id="${panelId}" class="cashier-items-panel hidden">
                        <div class="flex justify-between items-center mb-2">
                            <p class="text-xs font-bold text-slate-500">รายการในบิล (${allItems.length})</p>
                            ${canceledItems.length ? `<span class="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">มีรายการยกเลิก ${canceledItems.length}</span>` : ''}
                        </div>
                        <div class="space-y-2">${itemRows || '<p class="text-xs text-slate-400 text-center py-3">ไม่มีรายการอาหาร</p>'}</div>
                    </div>
                </div>`;
            }

            if(count === 0) {
                container.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">ยังไม่มีโต๊ะเปิดบิลครับ</div>`;
            } else {
                container.innerHTML = html;
            }
        }

        // ==========================================
        // 🌟 SELECT DESTINATION / TABLE MODAL FOR BLANK ORDERS 🌟
        // ==========================================
        let promptSelectedType = 'Dine-in';
        let promptSelectedTable = '';

        window.openTablePromptModal = function() {
            promptSelectedType = 'Dine-in';
            promptSelectedTable = '';
            document.getElementById('promptManualTable').value = '';
            
            // Highlight Dine-in by default
            selectPromptOrderType('Dine-in');
            
            // Render table grid
            const grid = document.getElementById('promptTableGrid');
            if (grid) {
                grid.innerHTML = allTables.map(tbl => {
                    let isOccupied = false;
                    for (let key in activeOrders) {
                        const order = activeOrders[key];
                        if (order.tableNo === tbl && !['paid', 'canceled', 'canceled_cleared'].includes(order.status)) {
                            isOccupied = true;
                            break;
                        }
                    }
                    const occClass = isOccupied ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700';
                    return `
                    <button type="button" onclick="selectPromptTable('${tbl}', this)" class="prompt-table-btn p-2 border rounded-xl text-center font-bold text-xs active:scale-95 transition-all ${occClass}" data-table="${tbl}">
                        ${tbl}
                    </button>
                    `;
                }).join('');
            }
            
            document.getElementById('tablePromptModal').classList.remove('hidden');
        };

        window.selectPromptOrderType = function(type) {
            promptSelectedType = type;
            
            const buttons = {
                'Dine-in': document.getElementById('btnPromptDineIn'),
                'Takeaway': document.getElementById('btnPromptTakeaway'),
                'Delivery': document.getElementById('btnPromptDelivery')
            };
            
            for (let key in buttons) {
                const btn = buttons[key];
                if (btn) {
                    if (key === type) {
                        btn.className = "p-3 border rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs bg-teal-50 border-teal-500 text-teal-700 ring-2 ring-teal-500 active:scale-95 transition-all";
                    } else {
                        btn.className = "p-3 border rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 active:scale-95 transition-all";
                    }
                }
            }
            
            const tableSec = document.getElementById('promptTableSection');
            if (tableSec) {
                if (type === 'Dine-in') {
                    tableSec.classList.remove('hidden');
                } else {
                    tableSec.classList.add('hidden');
                }
            }
        };

        window.selectPromptTable = function(tableNo, btnElement) {
            promptSelectedTable = tableNo;
            document.getElementById('promptManualTable').value = tableNo;
            
            document.querySelectorAll('.prompt-table-btn').forEach(btn => {
                const tbl = btn.getAttribute('data-table');
                let isOccupied = btn.classList.contains('text-red-700');
                if (tbl === tableNo) {
                    btn.className = `prompt-table-btn p-2 border-2 rounded-xl text-center font-bold text-xs active:scale-95 transition-all border-teal-500 bg-teal-50 text-teal-700`;
                } else {
                    const occClass = isOccupied ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700';
                    btn.className = `prompt-table-btn p-2 border rounded-xl text-center font-bold text-xs active:scale-95 transition-all ${occClass}`;
                }
            });
        };

        window.confirmPromptAndSubmit = function() {
            let finalTable = "";
            if (promptSelectedType === 'Dine-in') {
                const manualVal = document.getElementById('promptManualTable').value.trim();
                finalTable = manualVal || promptSelectedTable;
                if (!finalTable) {
                    return alert("⚠️ กรุณาเลือกโต๊ะ หรือระบุเลขโต๊ะก่อนครับ");
                }
            } else if (promptSelectedType === 'Takeaway') {
                finalTable = "กลับบ้าน";
            } else if (promptSelectedType === 'Delivery') {
                finalTable = "เดลิเวอรี่";
            }
            
            document.getElementById('tableNo').value = finalTable;
            document.getElementById('orderType').value = promptSelectedType;
            
            document.getElementById('tablePromptModal').classList.add('hidden');
            submitOrderToKitchen();
        };
