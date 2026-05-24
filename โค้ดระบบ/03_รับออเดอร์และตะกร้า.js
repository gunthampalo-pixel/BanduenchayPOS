        // ==========================================
        // 🛍️ ORDER & CART SYSTEM 
        // ==========================================
        function renderCategories() { const categories = ['All', ...new Set(allMenu.map(item => item.Category).filter(Boolean))]; const bar = document.getElementById('category-bar'); bar.innerHTML = categories.map(cat => `<button onclick="filterMenu('${cat}', this)" class="category-pill px-4 py-1.5 rounded-full border bg-white text-xs whitespace-nowrap ${cat === 'All' ? 'active' : ''}">${cat === 'All' ? 'ทั้งหมด' : cat}</button>`).join(''); }
        
        function filterMenu(cat, btnElement) { 
            if(btnElement) { document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active')); btnElement.classList.add('active'); } 
            const grid = document.getElementById('menu-grid'); const filtered = cat === 'All' ? allMenu : allMenu.filter(item => item.Category === cat); 
            grid.innerHTML = filtered.map((item) => { 
                let fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop'; 
                if (item.Category && item.Category.toLowerCase().includes('beverage')) fallbackImg = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=300&fit=crop'; 
                else if (item.Category && item.Category.toLowerCase().includes('dessert')) fallbackImg = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=300&fit=crop'; 
                else if (item.Category && item.Category.toLowerCase().includes('food')) fallbackImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop'; 
                
                let imgUrl = item.ImageURL ? appAdmin.convertDriveLink(item.ImageURL) : fallbackImg; 
                let displayPrice = item.Price || 0;
                if(item.Variants && item.Variants.length > 0) displayPrice = item.Variants[0].price;

                let hasOpt = (item.Variants && item.Variants.length > 1) || (item.OptionSets && item.OptionSets.length > 0) || item.OptionGroup; 
                
                return `<div class="menu-card bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col cursor-pointer" onclick='handleMenuClick(${JSON.stringify(item).replace(/'/g, "&#39;")})'><div class="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden relative"><img src="${imgUrl}" class="w-full h-full object-cover" onerror="this.src='${fallbackImg}'"><div class="absolute bottom-1 right-1 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 shadow-sm border border-white">฿${displayPrice}</div></div><p class="font-semibold text-gray-800 text-xs px-1 line-clamp-2">${item.Name}</p>${hasOpt ? '<span class="text-[9px] text-gray-400 px-1 mt-1"><i class="fa-solid fa-list-check"></i> มีตัวเลือก</span>' : ''}</div>`; 
            }).join(''); 
        }
        
        function handleMenuClick(item) { 
            let hasComplexData = (item.Variants && item.Variants.length > 1) || (item.OptionSets && item.OptionSets.length > 0) || item.OptionGroup;
            if(hasComplexData) { openOptionModal(item); } else { let p = item.Price || 0; if(item.Variants && item.Variants.length > 0) p = item.Variants[0].price; addToCart(item.Name, p, "", item.Category); }
        }

        function openOptionModal(item) {
            currentSelectingItem = item; document.getElementById('optItemName').innerText = item.Name;
            let basePrice = item.Price || 0; if(item.Variants && item.Variants.length > 0) basePrice = item.Variants[0].price; document.getElementById('optItemPrice').innerText = `฿${basePrice}`;
            
            let html = "";
            if(item.Variants && item.Variants.length > 1) {
                html += `<div class="mb-4"><p class="text-sm font-bold text-slate-800 mb-2 bg-slate-100 px-3 py-2 rounded-xl flex justify-between"><span>รูปแบบ/ไซส์</span><span class="text-xs text-amber-600 font-normal mt-0.5">บังคับเลือก 1 อย่าง</span></p><div class="space-y-2">`;
                item.Variants.forEach((v, idx) => { html += `<label class="flex justify-between items-center bg-white p-3 rounded-xl border active:bg-blue-50 cursor-pointer shadow-sm"><div class="flex items-center gap-3"><input type="radio" name="opt_variant" value="${v.name}" data-price="${v.price}" ${idx===0?'checked':''} class="w-5 h-5 text-blue-600 cursor-pointer" onchange="document.getElementById('optItemPrice').innerText = '฿'+this.dataset.price"><span class="text-sm font-semibold text-slate-700">${v.name}</span></div><span class="text-sm font-bold text-blue-600">฿${v.price}</span></label>`; }); html += `</div></div>`;
            }
            if(item.OptionSets && item.OptionSets.length > 0) {
                item.OptionSets.forEach(optId => { const optSet = globalOptions.find(o => o.id === optId); if(optSet) {
                        let isMulti = (optSet.type || '').includes('หลาย'); let badgeColor = isMulti ? 'text-emerald-600' : 'text-amber-600'; html += `<div class="mb-4"><p class="text-sm font-bold text-slate-800 mb-2 bg-slate-100 px-3 py-2 rounded-xl flex justify-between"><span>${optSet.name}</span><span class="text-xs ${badgeColor} font-normal mt-0.5">${optSet.type || ''}</span></p><div class="space-y-2">`;
                        if (!isMulti) { html += `<label class="flex justify-between items-center bg-white p-3 rounded-xl border active:bg-blue-50 cursor-pointer shadow-sm"><div class="flex items-center gap-3"><input type="radio" name="optset_${optSet.id}" value="NONE" checked class="w-5 h-5 text-blue-600 cursor-pointer"><span class="text-sm font-semibold text-slate-700">ไม่ระบุ / ตามปกติ</span></div></label>`; }
                        (optSet.items || []).forEach(i => { let inType = isMulti ? 'checkbox' : 'radio'; let pText = i.price > 0 ? `+฿${i.price}` : 'ฟรี'; let pColor = i.price > 0 ? 'text-blue-600' : 'text-slate-400'; html += `<label class="flex justify-between items-center bg-white p-3 rounded-xl border active:bg-blue-50 cursor-pointer shadow-sm"><div class="flex items-center gap-3"><input type="${inType}" name="optset_${optSet.id}" value="${i.name}" data-price="${i.price}" class="w-5 h-5 text-blue-600 cursor-pointer rounded"><span class="text-sm font-semibold text-slate-700">${i.name}</span></div><span class="text-sm font-bold ${pColor}">${pText}</span></label>`; }); html += `</div></div>`;
                    } });
            }
            if(item.OptionGroup && (!item.OptionSets || item.OptionSets.length === 0)) { html += `<div class="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl mb-3 border border-amber-200">พบข้อมูลท็อปปิ้งแบบเก่า (${item.OptionGroup}) กรุณาเข้าไปกดผูกเซ็ตท็อปปิ้งแบบใหม่ในหน้าการจัดการครับ</div>`; }
            html += `<div class="mb-4"><p class="text-sm font-bold text-slate-800 mb-2 bg-slate-100 px-3 py-2 rounded-xl">หมายเหตุเพิ่มเติม</p><input type="text" id="optNote" placeholder="เช่น เผ็ดน้อย, ไม่ใส่ผัก, แยกน้ำ..." class="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>`;
            document.getElementById('optionsContainer').innerHTML = html; document.getElementById('optionModal').classList.remove('hidden');
        }

        function closeOptionModal() { document.getElementById('optionModal').classList.add('hidden'); currentSelectingItem = null; }
        function confirmOptionsAndAdd() {
            if(!currentSelectingItem) return;
            let finalName = currentSelectingItem.Name; let finalPrice = currentSelectingItem.Price || 0; let addonTexts = [];  let optionsTotalPrice = 0;
            let selectedVar = document.querySelector('input[name="opt_variant"]:checked');
            if(selectedVar) { if(selectedVar.value !== 'ปกติ' && selectedVar.value !== '') { finalName += ` (${selectedVar.value})`; } finalPrice = Number(selectedVar.dataset.price); } 
            else if (currentSelectingItem.Variants && currentSelectingItem.Variants.length > 0) { finalPrice = currentSelectingItem.Variants[0].price; }
            document.querySelectorAll('#optionsContainer input[type="checkbox"]:checked, #optionsContainer input[type="radio"]:checked').forEach(el => { if (el.value !== "NONE" && el.name !== "opt_variant") { addonTexts.push(el.value); optionsTotalPrice += Number(el.dataset.price); } });
            let noteText = document.getElementById('optNote').value.trim(); if(addonTexts.length > 0) { finalName += ` [${addonTexts.join(', ')}]`; }
            addToCart(finalName, finalPrice + optionsTotalPrice, noteText, currentSelectingItem.Category); closeOptionModal();
        }

