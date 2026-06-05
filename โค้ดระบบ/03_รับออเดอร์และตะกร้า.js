        // ==========================================
        // 🛍️ ORDER & CART SYSTEM 
        // ==========================================
        let activeCategory = 'All'; 
        let activeSubCategory = 'All';
        
        let currentComboItem = null;
        let comboCurrentStepIndex = 0;
        let comboSelectedStepsData = [];

        let currentOptionQty = 1;
        let currentCustomItemQty = 1;

        window.changeOptionQty = function(diff) {
            currentOptionQty = Math.max(1, currentOptionQty + diff);
            const el = document.getElementById('optQtyDisplay');
            if(el) el.innerText = currentOptionQty;
        };

        window.changeCustomItemQty = function(diff) {
            currentCustomItemQty = Math.max(1, currentCustomItemQty + diff);
            const el = document.getElementById('customItemQtyDisplay');
            if(el) el.innerText = currentCustomItemQty;
        };

        function renderCategories() {
            const categories = [
                { id: 'All', label: 'ทั้งหมด' },
                { id: 'อาหาร', label: '🍲 อาหาร' },
                { id: 'เครื่องดื่ม', label: '🥤 เครื่องดื่ม' },
                { id: 'ของหวาน', label: '🍰 ของหวาน' },
                { id: 'เซ็ตเมนู', label: '🍱 เซ็ตเมนู' },
                { id: 'อีเว้นต์', label: '🎉 อีเว้นต์' },
                { id: 'Special', label: '✨ เมนูกันเหนียว' }
            ];
            
            const bar = document.getElementById('category-bar');
            if (bar) {
                bar.innerHTML = categories.map(cat => 
                    `<button onclick="filterMenu('${cat.id}', this)" class="category-pill px-4 py-1.5 rounded-full border bg-white text-xs whitespace-nowrap ${cat.id === activeCategory ? 'active' : ''}">${cat.label}</button>`
                ).join('');
            }
        }
        
        function filterMenu(cat, btnElement) { 
            activeCategory = cat;
            activeSubCategory = 'All'; // Reset subcategory when changing broad category
            
            if(btnElement) { 
                document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active')); 
                btnElement.classList.add('active'); 
            } 
            
            // Clear search input on category change
            const searchInput = document.getElementById('menuSearchInput');
            if(searchInput && searchInput.value) {
                searchInput.value = '';
                document.getElementById('clearMenuSearchBtn')?.classList.add('hidden');
                document.getElementById('menuSearchSuggestions')?.classList.add('hidden');
            }
            
            renderSubCategories(cat);
            renderMenuItems(cat, '');
        }

        function renderSubCategories(broadCat) {
            const subBar = document.getElementById('sub-category-bar');
            if (!subBar) return;
            
            if (broadCat === 'All' || broadCat === 'Special') {
                subBar.classList.add('hidden');
                subBar.innerHTML = '';
                return;
            }
            
            // Gather all items under this broad category
            const matchingItems = allMenu.filter(item => getBroadMainCategory(item.Category) === broadCat);
            const subCats = ['All', ...new Set(matchingItems.map(item => getItemSubCategory(item)))];
            
            if (subCats.length > 1) {
                subBar.classList.remove('hidden');
                subBar.innerHTML = subCats.map(sub => {
                    const displayName = sub === 'All' ? 'ทั้งหมด' : sub;
                    const isActive = sub === activeSubCategory;
                    return `<button onclick="filterSubMenu('${sub}', this)" class="sub-category-pill px-3 py-1.5 rounded-full border bg-white text-[10px] whitespace-nowrap transition-all shadow-sm ${isActive ? 'border-teal-600 text-teal-600 font-bold bg-teal-50' : 'border-slate-200 text-slate-500'}">${displayName}</button>`;
                }).join('');
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
            
            // Filter by broad main category
            if (activeCategory !== 'All') {
                if (activeCategory === 'Special') {
                    filtered = [];
                } else {
                    filtered = filtered.filter(item => getBroadMainCategory(item.Category) === activeCategory);
                    
                    // Filter by subcategory
                    if (activeSubCategory !== 'All') {
                        filtered = filtered.filter(item => getItemSubCategory(item) === activeSubCategory);
                    }
                }
            }
            
            if (query) {
                const q = query.toLowerCase().trim();
                filtered = filtered.filter(item => 
                    (item.Name || '').toLowerCase().includes(q) || 
                    (item.Category || '').toLowerCase().includes(q)
                );
            }
            
            let itemsHtml = '';
            if (filtered.length === 0) {
                if (activeCategory === 'Special') {
                    itemsHtml = `<div class="col-span-2 sm:col-span-3 text-center py-6 text-slate-500 text-xs font-semibold bg-teal-50/50 rounded-2xl border border-teal-100 mb-2 p-4">
                        💡 หน้านี้ใช้สำหรับสั่งเมนูป้อนมือ (Special Item)<br>
                        กดที่ปุ่ม "เมนูกันเหนียว" ด้านล่างเพื่อพิมพ์ชื่อและราคาได้เลยครับ
                    </div>`;
                } else {
                    itemsHtml = `<div class="col-span-2 sm:col-span-3 text-center py-6 text-slate-400 text-xs font-semibold">🔍 ไม่พบเมนูที่ตรงกับ "${query}"</div>`;
                }
            } else {
                itemsHtml = filtered.map((item) => { 
                    let fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop'; 
                    if (item.Category && item.Category.toLowerCase().includes('beverage')) fallbackImg = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=300&fit=crop'; 
                    else if (item.Category && item.Category.toLowerCase().includes('dessert')) fallbackImg = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=300&fit=crop'; 
                    else if (item.Category && item.Category.toLowerCase().includes('food')) fallbackImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop'; 
                    
                    let imgUrl = item.ImageURL ? appAdmin.convertDriveLink(item.ImageURL) : fallbackImg; 
                    let displayPrice = item.Price || 0;
                    if(item.Variants && item.Variants.length > 0) displayPrice = item.Variants[0].price;

                    let hasOpt = (item.Variants && item.Variants.length > 1) || (item.OptionSets && item.OptionSets.length > 0) || item.OptionGroup; 
                    
                    return `<div class="menu-card bg-white p-2.5 sm:p-2 rounded-xl shadow-sm border border-gray-100 flex flex-row sm:flex-col items-center sm:items-stretch cursor-pointer animate-fade-in active:scale-95 transition-all gap-3 sm:gap-0" onclick='handleMenuClick(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
                        <div class="w-14 h-14 sm:w-full sm:aspect-square bg-gray-100 rounded-lg sm:mb-2 overflow-hidden relative shrink-0">
                            <img src="${imgUrl}" class="w-full h-full object-cover" onerror="this.src='${fallbackImg}'">
                            <div class="hidden sm:block absolute bottom-1 right-1 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 shadow-sm border border-white">฿${displayPrice}</div>
                        </div>
                        <div class="flex-1 min-w-0 sm:contents flex flex-col justify-between py-0.5">
                            <p class="font-bold sm:font-semibold text-slate-800 text-sm sm:text-xs sm:px-1 sm:line-clamp-2 truncate">${item.Name}</p>
                            ${hasOpt ? '<span class="text-[10px] sm:text-[9px] text-gray-400 sm:px-1 mt-0.5 sm:mt-1"><i class="fa-solid fa-list-check"></i> มีตัวเลือก</span>' : ''}
                            <p class="sm:hidden font-bold text-teal-700 text-sm mt-0.5">฿${displayPrice}</p>
                        </div>
                    </div>`; 
                }).join('');
            }

            // เพิ่มการ์ด "เมนูกันเหนียว (กำหนดเอง)" ต่อท้ายลิสต์เสมอ เพื่อให้ใช้ได้ทุกเมื่อ
            const customCardHtml = `
            <div class="menu-card bg-gradient-to-br from-teal-50 to-emerald-50 p-2.5 sm:p-2 rounded-xl shadow-sm border border-teal-200 flex flex-row sm:flex-col items-center sm:items-stretch cursor-pointer animate-fade-in active:scale-95 transition-all gap-3 sm:gap-0" onclick="window.openCustomItemModal()">
                <div class="w-14 h-14 sm:w-full sm:aspect-square bg-teal-100/50 rounded-lg sm:mb-2 overflow-hidden flex flex-col items-center justify-center text-teal-600 text-2xl shrink-0">
                    <i class="fa-solid fa-circle-plus"></i>
                </div>
                <div class="flex-1 min-w-0 sm:contents flex flex-col justify-between py-0.5">
                    <p class="font-bold text-teal-800 text-sm sm:text-xs sm:px-1 sm:line-clamp-2 truncate">เมนูกันเหนียว</p>
                    <span class="text-[10px] sm:text-[9px] text-teal-600 sm:px-1 mt-0.5 sm:mt-1 font-semibold"><i class="fa-solid fa-keyboard"></i> กำหนดเอง</span>
                </div>
            </div>`;

            grid.innerHTML = itemsHtml + customCardHtml; 
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
            
            // ซ่อนหรือปิดการทำงานกล่องช่วยพิมพ์บนจอมือถือเพื่อหลีกเลี่ยงการบดบังเมนูหลัก
            if (window.innerWidth < 768) {
                sugBox.classList.add('hidden');
                return;
            }
            
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
            
            let suggestionsHtml = matches.map(item => {
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
            
            suggestionsHtml += `<button onclick="document.getElementById('menuSearchSuggestions').classList.add('hidden')" class="w-full text-center p-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl mt-1.5 border border-dashed border-red-200 active:scale-95 transition-all"><i class="fa-solid fa-chevron-up mr-1"></i> ย่อกล่องช่วยพิมพ์ (ดูรายการด้านหลัง)</button>`;
            
            sugBox.innerHTML = suggestionsHtml;
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
            
            if (item.IsCombo) {
                openComboModal(item);
                return;
            }
            
            // เปิดหน้าต่างตัวเลือกและหมายเหตุพิเศษเสมอ
            openOptionModal(item);
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

        // 🌟 ปิดกล่องคำแนะนำการค้นหาเมื่อมีการเลื่อนหน้าจอ (สไลด์เลื่อนดูเมนูด้านหลัง)
        window.addEventListener('scroll', function() {
            document.getElementById('menuSearchSuggestions')?.classList.add('hidden');
        }, { capture: true, passive: true });

        function openOptionModal(item) {
            currentOptionQty = 1;
            const displayEl = document.getElementById('optQtyDisplay');
            if (displayEl) displayEl.innerText = 1;
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
            
            // เพิ่มกล่องแอดออนพิเศษ (กำหนดเอง)
            html += `<div class="mb-4 bg-teal-50/50 p-3 rounded-2xl border border-teal-100">
                <p class="text-xs font-bold text-teal-800 mb-2 flex justify-between">
                    <span>✨ เพิ่มตัวเลือกพิเศษ (กำหนดเอง)</span>
                    <span class="text-[10px] text-teal-600 font-normal">ใช้เมื่อตัวเลือกในระบบไม่ตรง/ไม่ครบ</span>
                </p>
                <div class="grid grid-cols-[1.5fr_1fr] gap-2">
                    <input type="text" id="customAddonName" placeholder="ระบุชื่อ (เช่น เพิ่มวิปครีม, เพิ่มไข่ดาว)" class="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-teal-500">
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">฿</span>
                        <input type="number" id="customAddonPrice" placeholder="ราคาเสริม" min="0" class="w-full pl-6 pr-2 p-2.5 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-teal-500">
                    </div>
                </div>
            </div>`;
            
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
            
            // อ่านแอดออนพิเศษ (กำหนดเอง)
            const customAddonName = document.getElementById('customAddonName')?.value.trim();
            const customAddonPrice = Number(document.getElementById('customAddonPrice')?.value) || 0;
            if (customAddonName) {
                addonTexts.push(customAddonPrice > 0 ? `${customAddonName}: ฿${customAddonPrice}` : customAddonName);
                optionsTotalPrice += customAddonPrice;
            }

            let noteText = document.getElementById('optNote').value.trim(); if(addonTexts.length > 0) { finalName += ` [${addonTexts.join(', ')}]`; }
            addToCart(finalName, finalPrice + optionsTotalPrice, noteText, currentSelectingItem.Category, currentOptionQty); closeOptionModal();
        }

        // ==========================================
        // 🌟 COMBO SET STEPPER MODAL FUNCTIONS 🌟
        // ==========================================
        window.openComboModal = function(item) {
            currentComboItem = item;
            comboCurrentStepIndex = 0;
            comboSelectedStepsData = [];
            
            // Pre-initialize steps
            item.ComboSteps.forEach((step, idx) => {
                const stepType = step.type || (step.items.length === 1 ? 'fixed_all' : 'pick_one');
                
                if (stepType === 'fixed_all') {
                    comboSelectedStepsData[idx] = step.items.map(fixedItem => {
                        const refMenu = allMenu.find(m => m._key === fixedItem.menuKey);
                        const name = refMenu ? refMenu.Name : fixedItem.name;
                        return {
                            stepId: step.id,
                            menuKey: fixedItem.menuKey,
                            name: name,
                            extraPrice: Number(fixedItem.extraPrice) || 0,
                            variant: (refMenu && refMenu.Variants && refMenu.Variants[0]) ? refMenu.Variants[0].name : '',
                            options: [],
                            addonPrice: 0,
                            note: ''
                        };
                    });
                } else {
                    comboSelectedStepsData[idx] = [];
                }
            });

            document.getElementById('comboSetName').innerText = item.Name;
            document.getElementById('comboModal').classList.remove('hidden');
            
            renderComboCurrentStep();
            calculateComboTotalPrice();
        };

        window.closeComboModal = function() {
            document.getElementById('comboModal').classList.add('hidden');
            currentComboItem = null;
        };

        window.renderComboCurrentStep = function() {
            const container = document.getElementById('comboStepItemsContainer');
            if (!container) return;
            container.innerHTML = '';
            
            const step = currentComboItem.ComboSteps[comboCurrentStepIndex];
            const totalSteps = currentComboItem.ComboSteps.length;
            const stepType = step.type || (step.items.length === 1 ? 'fixed_all' : 'pick_one');
            
            document.getElementById('comboStepIndicator').innerText = `ขั้นตอนที่ ${comboCurrentStepIndex + 1} / ${totalSteps}`;
            document.getElementById('comboProgressBar').style.width = `${((comboCurrentStepIndex + 1) / totalSteps) * 100}%`;
            
            let typeDesc = "";
            if (stepType === 'fixed_all') {
                typeDesc = " (บังคับเลือกทั้งหมด)";
            } else if (stepType === 'pick_one') {
                typeDesc = " (เลือก 1 อย่าง)";
            } else if (stepType === 'pick_many') {
                const limitText = step.limit ? `ไม่เกิน ${step.limit} อย่าง` : "หลายอย่าง";
                typeDesc = ` (เลือกได้${limitText})`;
            }
            document.getElementById('comboStepTitle').innerText = step.title + typeDesc + (step.required ? " * (จำเป็น)" : "");

            const backBtn = document.getElementById('comboBackStepBtn');
            if (comboCurrentStepIndex > 0) {
                backBtn.classList.remove('hidden');
            } else {
                backBtn.classList.add('hidden');
            }

            const nextBtn = document.getElementById('comboNextStepBtn');
            if (comboCurrentStepIndex === totalSteps - 1) {
                nextBtn.innerText = "ยืนยันเพิ่มลงตะกร้า";
            } else {
                nextBtn.innerText = "ขั้นตอนถัดไป";
            }

            const currentSelection = comboSelectedStepsData[comboCurrentStepIndex] || [];

            step.items.forEach(stepItem => {
                const refMenu = allMenu.find(m => m._key === stepItem.menuKey);
                if (!refMenu) return;

                const isSelected = currentSelection.some(sel => sel.menuKey === stepItem.menuKey);
                const itemSelectionDetails = currentSelection.find(sel => sel.menuKey === stepItem.menuKey);
                const extraText = stepItem.extraPrice > 0 ? ` (+฿${stepItem.extraPrice})` : '';
                
                let cardClass = "p-4 rounded-2xl border transition-all cursor-pointer shadow-sm relative ";
                if (isSelected) {
                    cardClass += "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500";
                } else {
                    cardClass += "border-slate-200 bg-white hover:border-blue-300";
                }

                let clickAction = "";
                if (stepType !== 'fixed_all') {
                    clickAction = `onclick="selectComboStepItem('${stepItem.menuKey}', ${stepItem.extraPrice}, '${refMenu.Name.replace(/'/g, "\\'")}')"`;
                }

                let itemHtml = `
                <div class="${cardClass}" ${clickAction}>
                    <div class="flex justify-between items-start">
                        <div class="flex gap-3">
                            <div class="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                <img src="${refMenu.ImageURL ? appAdmin.convertDriveLink(refMenu.ImageURL) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}" class="w-full h-full object-cover">
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-sm">${refMenu.Name}${extraText}</h4>
                                <p class="text-[10px] text-slate-400 font-bold">${refMenu.Category || 'ทั่วไป'}</p>
                            </div>
                        </div>
                        <div>
                `;

                if (stepType === 'fixed_all') {
                    itemHtml += `<span class="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold shadow-sm"><i class="fa-solid fa-lock mr-1"></i> บังคับในเซ็ต</span>`;
                } else if (isSelected) {
                    itemHtml += `<span class="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm"><i class="fa-solid fa-check mr-1"></i> เลือกแล้ว</span>`;
                }
                
                itemHtml += `
                        </div>
                    </div>
                `;

                if (isSelected && itemSelectionDetails) {
                    itemHtml += `<div class="mt-4 pt-3 border-t border-dashed border-slate-200 space-y-3" onclick="event.stopPropagation()">`;

                    if (refMenu.Variants && refMenu.Variants.length > 1) {
                        const isVarLocked = stepItem.variant && stepItem.variant !== "";
                        
                        if (isVarLocked) {
                            itemSelectionDetails.variant = stepItem.variant;
                            itemHtml += `
                            <div class="bg-slate-100/80 p-2.5 rounded-xl border border-slate-200">
                                <p class="text-[10px] font-bold text-slate-500 mb-0.5">รูปแบบบังคับในเซ็ต</p>
                                <p class="text-xs font-bold text-slate-700"><i class="fa-solid fa-lock mr-1 text-slate-400"></i> ${stepItem.variant}</p>
                            </div>
                            `;
                        } else {
                            itemHtml += `
                            <div>
                                <label class="text-[10px] font-bold text-slate-500 mb-1.5 block">รูปแบบ / ขนาด (เลือก 1 อย่าง)</label>
                                <div class="grid grid-cols-2 gap-2">
                            `;
                            refMenu.Variants.forEach((v, idx) => {
                                const varSelected = itemSelectionDetails.variant === v.name || (!itemSelectionDetails.variant && idx === 0);
                                if (varSelected && !itemSelectionDetails.variant) {
                                    itemSelectionDetails.variant = v.name;
                                }
                                const vClass = varSelected ? 'border-blue-500 bg-white font-bold text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-600';
                                itemHtml += `
                                <button type="button" onclick="updateComboSubItemVariant('${stepItem.menuKey}', '${v.name}')" class="p-2 border text-xs rounded-xl text-center active:scale-95 transition-all truncate ${vClass}">
                                    ${v.name} (+฿${v.price})
                                </button>
                                `;
                            });
                            itemHtml += `
                                </div>
                            </div>
                            `;
                        }
                    }

                    if (refMenu.OptionSets && refMenu.OptionSets.length > 0) {
                        refMenu.OptionSets.forEach(optId => {
                            const optSet = globalOptions.find(o => o.id === optId);
                            if (optSet) {
                                const isMulti = (optSet.type || '').includes('หลาย');
                                itemHtml += `
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 mb-1.5 block">${optSet.name} (${optSet.type})</label>
                                    <div class="grid grid-cols-2 gap-2">
                                `;
                                
                                if (!isMulti) {
                                    const noneSelected = !itemSelectionDetails.options.some(o => o.optSetId === optId);
                                    const optClass = noneSelected ? 'border-blue-500 bg-white font-bold text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-600';
                                    itemHtml += `
                                    <button type="button" onclick="updateComboSubItemRadioOption('${stepItem.menuKey}', '${optId}', 'NONE', 0)" class="p-2 border text-xs rounded-xl text-center active:scale-95 transition-all truncate ${optClass}">
                                        ปกติ / ไม่เลือก
                                    </button>
                                    `;
                                }

                                (optSet.items || []).forEach(i => {
                                    const isOptSelected = itemSelectionDetails.options.some(o => o.optSetId === optId && o.name === i.name);
                                    const optClass = isOptSelected ? 'border-blue-500 bg-white font-bold text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-600';
                                    const handlerStr = isMulti 
                                        ? `toggleComboSubItemCheckboxOption('${stepItem.menuKey}', '${optId}', '${i.name}', ${i.price})`
                                        : `updateComboSubItemRadioOption('${stepItem.menuKey}', '${optId}', '${i.name}', ${i.price})`;
                                    
                                    itemHtml += `
                                    <button type="button" onclick="${handlerStr}" class="p-2 border text-xs rounded-xl text-center active:scale-95 transition-all truncate ${optClass}">
                                        ${i.name} (+฿${i.price})
                                    </button>
                                    `;
                                });

                                itemHtml += `
                                    </div>
                                </div>
                                `;
                            }
                        });
                    }

                    itemHtml += `
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 mb-1 block">หมายเหตุคำสั่งพิเศษสำหรับรายการนี้</label>
                        <input type="text" class="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 text-xs outline-none focus:ring-1 focus:ring-blue-500" value="${itemSelectionDetails.note || ''}" oninput="updateComboSubItemNote('${stepItem.menuKey}', this.value)" placeholder="เช่น ไม่ผัก, หวานน้อย, แยกน้ำ...">
                    </div>
                    `;

                    itemHtml += `</div>`;
                }

                itemHtml += `</div>`;
                container.insertAdjacentHTML('beforeend', itemHtml);
            });
        };

        window.selectComboStepItem = function(menuKey, extraPrice, name) {
            const step = currentComboItem.ComboSteps[comboCurrentStepIndex];
            const refMenu = allMenu.find(m => m._key === menuKey);
            const stepItem = step.items.find(i => i.menuKey === menuKey);
            const stepType = step.type || (step.items.length === 1 ? 'fixed_all' : 'pick_one');
            
            let selections = comboSelectedStepsData[comboCurrentStepIndex] || [];
            
            const initialVariant = (stepItem && stepItem.variant) 
                ? stepItem.variant 
                : ((refMenu && refMenu.Variants && refMenu.Variants[0]) ? refMenu.Variants[0].name : '');

            if (stepType === 'pick_one') {
                const isSelected = selections.some(sel => sel.menuKey === menuKey);
                if (isSelected) {
                    if (!step.required) {
                        selections = [];
                    }
                } else {
                    selections = [{
                        stepId: step.id,
                        menuKey: menuKey,
                        name: name,
                        extraPrice: Number(extraPrice) || 0,
                        variant: initialVariant,
                        options: [],
                        addonPrice: 0,
                        note: ''
                    }];
                }
            } else if (stepType === 'pick_many') {
                const idx = selections.findIndex(sel => sel.menuKey === menuKey);
                if (idx >= 0) {
                    selections.splice(idx, 1);
                } else {
                    if (step.limit && selections.length >= step.limit) {
                        alert(`⚠️ ขั้นตอนนี้เลือกได้สูงสุดไม่เกิน ${step.limit} รายการครับ`);
                        return;
                    }
                    selections.push({
                        stepId: step.id,
                        menuKey: menuKey,
                        name: name,
                        extraPrice: Number(extraPrice) || 0,
                        variant: initialVariant,
                        options: [],
                        addonPrice: 0,
                        note: ''
                    });
                }
            }
            
            comboSelectedStepsData[comboCurrentStepIndex] = selections;
            renderComboCurrentStep();
            calculateComboTotalPrice();
        };

        window.updateComboSubItemVariant = function(menuKey, variantName) {
            const selections = comboSelectedStepsData[comboCurrentStepIndex] || [];
            const sel = selections.find(o => o.menuKey === menuKey);
            if (sel) {
                sel.variant = variantName;
                calculateComboAddonPrice(sel);
                renderComboCurrentStep();
                calculateComboTotalPrice();
            }
        };

        window.updateComboSubItemRadioOption = function(menuKey, optSetId, optionName, optionPrice) {
            const selections = comboSelectedStepsData[comboCurrentStepIndex] || [];
            const sel = selections.find(o => o.menuKey === menuKey);
            if (sel) {
                sel.options = sel.options.filter(o => o.optSetId !== optSetId);
                if (optionName !== 'NONE') {
                    sel.options.push({
                        optSetId: optSetId,
                        name: optionName,
                        price: Number(optionPrice) || 0
                    });
                }
                calculateComboAddonPrice(sel);
                renderComboCurrentStep();
                calculateComboTotalPrice();
            }
        };

        window.toggleComboSubItemCheckboxOption = function(menuKey, optSetId, optionName, optionPrice) {
            const selections = comboSelectedStepsData[comboCurrentStepIndex] || [];
            const sel = selections.find(o => o.menuKey === menuKey);
            if (sel) {
                const existsIdx = sel.options.findIndex(o => o.optSetId === optSetId && o.name === optionName);
                if (existsIdx >= 0) {
                    sel.options.splice(existsIdx, 1);
                } else {
                    sel.options.push({
                        optSetId: optSetId,
                        name: optionName,
                        price: Number(optionPrice) || 0
                    });
                }
                calculateComboAddonPrice(sel);
                renderComboCurrentStep();
                calculateComboTotalPrice();
            }
        };

        window.updateComboSubItemNote = function(menuKey, value) {
            const selections = comboSelectedStepsData[comboCurrentStepIndex] || [];
            const sel = selections.find(o => o.menuKey === menuKey);
            if (sel) {
                sel.note = value;
            }
        };

        function calculateComboAddonPrice(sel) {
            let addon = 0;
            const refMenu = allMenu.find(m => m._key === sel.menuKey);
            if (refMenu) {
                if (refMenu.Variants && refMenu.Variants.length > 0) {
                    const basePrice = refMenu.Variants[0].price;
                    const chosenVar = refMenu.Variants.find(v => v.name === sel.variant);
                    if (chosenVar) {
                        addon += Math.max(0, chosenVar.price - basePrice);
                    }
                }
                if (sel.options && sel.options.length > 0) {
                    sel.options.forEach(o => {
                        addon += o.price;
                    });
                }
            }
            sel.addonPrice = addon;
        }

        window.calculateComboTotalPrice = function() {
            if (!currentComboItem) return 0;
            let base = Number(currentComboItem.Price) || 0;
            let total = base;
            
            comboSelectedStepsData.forEach(selections => {
                if (selections && Array.isArray(selections)) {
                    selections.forEach(sel => {
                        total += (sel.extraPrice || 0) + (sel.addonPrice || 0);
                    });
                }
            });

            document.getElementById('comboTotalLabel').innerText = `฿${total}`;
            return total;
        };

        window.comboPrevStep = function() {
            if (comboCurrentStepIndex > 0) {
                comboCurrentStepIndex--;
                renderComboCurrentStep();
            }
        };

        window.comboNextStep = function() {
            if (!currentComboItem) return;
            const step = currentComboItem.ComboSteps[comboCurrentStepIndex];
            const selections = comboSelectedStepsData[comboCurrentStepIndex] || [];
            
            if (step.required && selections.length === 0) {
                return alert(`⚠️ กรุณาเลือกรายการสำหรับขั้นตอน "${step.title}" ก่อนครับ`);
            }
            
            const totalSteps = currentComboItem.ComboSteps.length;
            if (comboCurrentStepIndex < totalSteps - 1) {
                comboCurrentStepIndex++;
                renderComboCurrentStep();
            } else {
                const totalPrice = calculateComboTotalPrice();
                const parts = [];
                
                comboSelectedStepsData.forEach(selections => {
                    if (selections && Array.isArray(selections)) {
                        selections.forEach(sel => {
                            let s = sel.name;
                            if (sel.variant && sel.variant !== 'ปกติ' && sel.variant !== '') {
                                s += ` (${sel.variant})`;
                            }
                            if (sel.options && sel.options.length > 0) {
                                s += ` (${sel.options.map(o => o.name).join(', ')})`;
                            }
                            if (sel.note) {
                                s += ` *${sel.note}*`;
                            }
                            parts.push(s);
                        });
                    }
                });
                
                const combinedName = `${currentComboItem.Name} [${parts.join(', ')}]`;
                addToCart(combinedName, totalPrice, "", currentComboItem.Category);
                closeComboModal();
            }
        };

        // ==========================================
        // 🌟 CUSTOM FALLBACK ITEM (เมนูกันเหนียว) 🌟
        // ==========================================
        window.openCustomItemModal = function() {
            document.getElementById('customItemName').value = '';
            document.getElementById('customItemPrice').value = '';
            document.getElementById('customItemNote').value = '';
            document.getElementById('customItemCategory').value = 'Food';
            
            currentCustomItemQty = 1;
            const displayEl = document.getElementById('customItemQtyDisplay');
            if (displayEl) displayEl.innerText = 1;

            document.getElementById('customItemModal').classList.remove('hidden');
            
            setTimeout(() => {
                document.getElementById('customItemName').focus();
            }, 100);
        };

        window.closeCustomItemModal = function() {
            document.getElementById('customItemModal').classList.add('hidden');
        };

        window.confirmCustomItemAndAdd = function() {
            const nameInput = document.getElementById('customItemName');
            const priceInput = document.getElementById('customItemPrice');
            const catSelect = document.getElementById('customItemCategory');
            const noteInput = document.getElementById('customItemNote');

            const name = nameInput.value.trim();
            const priceVal = priceInput.value.trim();
            const category = catSelect.value;
            const note = noteInput.value.trim();

            if (!name) {
                return alert("⚠️ กรุณาระบุชื่อรายการเมนูครับ");
            }
            if (priceVal === '' || isNaN(priceVal) || Number(priceVal) < 0) {
                return alert("⚠️ กรุณาระบุราคาต่อชิ้นให้ถูกต้องครับ");
            }

            const price = Number(priceVal);
            addToCart(name, price, note, category, currentCustomItemQty);
            window.closeCustomItemModal();
        };

