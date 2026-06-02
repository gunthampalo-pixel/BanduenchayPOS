        // ==========================================
        // 🛍️ ORDER & CART SYSTEM 
        // ==========================================
        let activeCategory = 'All'; 
        let activeSubCategory = 'All';

        function renderCategories() {
            // ดึงเฉพาะหมวดหมู่หลัก (ส่วนก่อนหน้าเครื่องหมาย /)
            const categories = ['All', ...new Set(allMenu.map(item => {
                if (!item.Category) return null;
                return item.Category.split('/')[0].trim();
            }).filter(Boolean))];
            
            const bar = document.getElementById('category-bar');
            if (bar) {
                bar.innerHTML = categories.map(cat => 
                    `<button onclick="filterMenu('${cat}', this)" class="category-pill px-4 py-1.5 rounded-full border bg-white text-xs whitespace-nowrap ${cat === 'All' ? 'active' : ''}">${cat === 'All' ? 'ทั้งหมด' : cat}</button>`
                ).join('');
            }
        }
        
        function filterMenu(cat, btnElement) { 
            activeCategory = cat;
            activeSubCategory = 'All'; // รีเซ็ตหมวดหมู่ย่อยใหม่ทุกครั้งที่กดหมวดหมู่หลัก
            
            if(btnElement) { 
                document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active')); 
                btnElement.classList.add('active'); 
            } 
            
            // ล้างช่องค้นหาเมื่อคลิกเปลี่ยนหมวดหมู่
            const searchInput = document.getElementById('menuSearchInput');
            if(searchInput && searchInput.value) {
                searchInput.value = '';
                document.getElementById('clearMenuSearchBtn')?.classList.add('hidden');
                document.getElementById('menuSearchSuggestions')?.classList.add('hidden');
            }
            
            // ตรวจสอบและแสดงแถบหมวดหมู่ย่อย
            renderSubCategories(cat);
            
            renderMenuItems(cat, '');
        }

        function renderSubCategories(mainCat) {
            const subBar = document.getElementById('sub-category-bar');
            if (!subBar) return;
            
            if (mainCat === 'All') {
                subBar.classList.add('hidden');
                subBar.innerHTML = '';
                return;
            }
            
            // ดึงหมวดหมู่ย่อยของหมวดหมู่หลักนี้
            const subCats = ['All', ...new Set(allMenu.filter(item => {
                if (!item.Category) return false;
                const parts = item.Category.split('/');
                return parts[0].trim() === mainCat && parts.length > 1;
            }).map(item => item.Category.split('/')[1].trim()))];
            
            if (subCats.length > 1) { // มีหมวดหมู่ย่อยนอกจาก 'All'
                subBar.classList.remove('hidden');
                subBar.innerHTML = subCats.map(sub => 
                    `<button onclick="filterSubMenu('${sub}', this)" class="sub-category-pill px-3 py-1.5 rounded-full border bg-white text-[10px] whitespace-nowrap transition-all shadow-sm ${sub === 'All' ? 'border-teal-600 text-teal-600 font-bold bg-teal-50' : 'border-slate-200 text-slate-500'}">${sub === 'All' ? 'ทั้งหมด' : sub}</button>`
                ).join('');
            } else {
                subBar.classList.add('hidden');
                subBar.innerHTML = '';
            }
        }

        window.filterSubMenu = function(subCat, btnElement) {
            activeSubCategory = subCat;
            if (btnElement) {
                document.querySelectorAll('.sub-category-pill').forEach(btn => {
                    btn.className = "sub-category-pill px-3 py-1.5 rounded-full border bg-white text-[10px] whitespace-nowrap border-slate-200 text-slate-500 transition-all shadow-sm";
                });
                btnElement.className = "sub-category-pill px-3 py-1.5 rounded-full border text-[10px] whitespace-nowrap transition-all shadow-sm border-teal-600 text-teal-600 font-bold bg-teal-50";
            }
            renderMenuItems(activeCategory, '');
        }

        function renderMenuItems(cat, query) {
            const grid = document.getElementById('menu-grid'); 
            let filtered = allMenu;
            
            // กรองตามหมวดหมู่หลัก (cat หรือ activeCategory)
            if (activeCategory !== 'All') {
                filtered = filtered.filter(item => {
                    if (!item.Category) return false;
                    const mainPart = item.Category.split('/')[0].trim();
                    return mainPart === activeCategory;
                });
                
                // กรองตามหมวดหมู่ย่อย (activeSubCategory)
                if (activeSubCategory !== 'All') {
                    filtered = filtered.filter(item => {
                        if (!item.Category) return false;
                        const parts = item.Category.split('/');
                        return parts.length > 1 && parts[1].trim() === activeSubCategory;
                    });
                }
            }
            
            if (query) {
                const q = query.toLowerCase().trim();
                filtered = filtered.filter(item => 
                    (item.Name || '').toLowerCase().includes(q) || 
                    (item.Category || '').toLowerCase().includes(q)
                );
            }
            
            if(filtered.length === 0) {
                grid.innerHTML = `<div class="col-span-2 sm:col-span-3 text-center py-10 text-gray-400 text-sm">🔍 ไม่พบเมนูที่ตรงกับ "${query}"</div>`;
                return;
            }

            grid.innerHTML = filtered.map((item) => { 
                let fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop'; 
                if (item.Category && item.Category.toLowerCase().includes('beverage')) fallbackImg = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=300&fit=crop'; 
                else if (item.Category && item.Category.toLowerCase().includes('dessert')) fallbackImg = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=300&fit=crop'; 
                else if (item.Category && item.Category.toLowerCase().includes('food')) fallbackImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop'; 
                
                let imgUrl = item.ImageURL ? appAdmin.convertDriveLink(item.ImageURL) : fallbackImg; 
                let displayPrice = item.Price || 0;
                if(item.Variants && item.Variants.length > 0) displayPrice = item.Variants[0].price;

                let hasOpt = (item.Variants && item.Variants.length > 1) || (item.OptionSets && item.OptionSets.length > 0) || item.OptionGroup; 
                
                return `<div class="menu-card bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col cursor-pointer animate-fade-in" onclick='handleMenuClick(${JSON.stringify(item).replace(/'/g, "&#39;")})'><div class="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden relative"><img src="${imgUrl}" class="w-full h-full object-cover" onerror="this.src='${fallbackImg}'"><div class="absolute bottom-1 right-1 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 shadow-sm border border-white">฿${displayPrice}</div></div><p class="font-semibold text-gray-800 text-xs px-1 line-clamp-2">${item.Name}</p>${hasOpt ? '<span class="text-[9px] text-gray-400 px-1 mt-1"><i class="fa-solid fa-list-check"></i> มีตัวเลือก</span>' : ''}</div>`; 
            }).join(''); 
        }

        window.searchMenu = function() {
            const input = document.getElementById('menuSearchInput');
            const clearBtn = document.getElementById('clearMenuSearchBtn');
            const sugBox = document.getElementById('menuSearchSuggestions');
            if(!input) return;
            
            const q = input.value.trim();
            if(q) {
                clearBtn?.classList.remove('hidden');
                renderMenuItems(activeCategory, q);
                renderSearchSuggestions(q);
            } else {
                clearBtn?.classList.add('hidden');
                sugBox?.classList.add('hidden');
                renderMenuItems(activeCategory, '');
            }
        }

        window.clearMenuSearch = function() {
            const input = document.getElementById('menuSearchInput');
            if(input) input.value = '';
            searchMenu();
        }

        function renderSearchSuggestions(q) {
            const sugBox = document.getElementById('menuSearchSuggestions');
            if(!sugBox) return;
            
            const query = q.toLowerCase().trim();
            if(!query) {
                sugBox.classList.add('hidden');
                return;
            }
            
            const matches = allMenu.filter(item => (item.Name || '').toLowerCase().includes(query)).slice(0, 5);
            if(matches.length === 0) {
                sugBox.classList.add('hidden');
                return;
            }
            
            sugBox.innerHTML = matches.map(item => {
                const name = item.Name;
                const idx = name.toLowerCase().indexOf(query);
                let highlighted = name;
                if(idx >= 0) {
                    highlighted = name.substring(0, idx) + `<b class="text-blue-600 bg-blue-50 font-bold px-0.5 rounded">` + name.substring(idx, idx + query.length) + `</b>` + name.substring(idx + query.length);
                }
                
                let p = item.Price || 0;
                if(item.Variants && item.Variants.length > 0) p = item.Variants[0].price;
                
                return `<button onclick='selectSuggestion(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="w-full text-left p-2.5 text-xs text-slate-700 hover:bg-blue-50 rounded-xl flex justify-between items-center transition-all border-b border-slate-50 last:border-0 active:scale-[0.99]">
                    <span class="truncate font-semibold"><i class="fa-solid fa-wand-magic-sparkles text-blue-500 mr-2"></i>${highlighted}</span>
                    <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold shrink-0 ml-2">฿${p}</span>
                </button>`;
            }).join('');
            
            sugBox.classList.remove('hidden');
        }

        window.selectSuggestion = function(item) {
            const input = document.getElementById('menuSearchInput');
            if(input) input.value = item.Name;
            
            document.getElementById('menuSearchSuggestions')?.classList.add('hidden');
            handleMenuClick(item);
            
            setTimeout(() => {
                clearMenuSearch();
            }, 100);
        }
        
        function handleMenuClick(item) { 
            // ซ่อนกล่องคำแนะนำการค้นหาเมื่อมีการคลิกเลือกเมนู
            document.getElementById('menuSearchSuggestions')?.classList.add('hidden');
            
            let hasComplexData = (item.Variants && item.Variants.length > 1) || (item.OptionSets && item.OptionSets.length > 0) || item.OptionGroup;
            if(hasComplexData) { openOptionModal(item); } else { let p = item.Price || 0; if(item.Variants && item.Variants.length > 0) p = item.Variants[0].price; addToCart(item.Name, p, "", item.Category); }
        }

        // 🌟 ปิดกล่องคำแนะนำการค้นหาเมื่อคลิกนอกพื้นที่ค้นหา
        document.addEventListener('click', function(e) {
            const sugBox = document.getElementById('menuSearchSuggestions');
            const searchInput = document.getElementById('menuSearchInput');
            const clearBtn = document.getElementById('clearMenuSearchBtn');
            if (sugBox && !sugBox.classList.contains('hidden')) {
                if (e.target !== searchInput && !sugBox.contains(e.target) && e.target !== clearBtn && !clearBtn?.contains(e.target)) {
                    sugBox.classList.add('hidden');
                }
            }
        });

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

