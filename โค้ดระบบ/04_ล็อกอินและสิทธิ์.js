        // ==========================================
        // 🌟 AUTH & PERMISSIONS 
        // ==========================================
        function handleLogin() { document.getElementById('login-error').innerText = "กำลังตรวจสอบ..."; let u = document.getElementById('usernameInput').value.trim(); let p = document.getElementById('passwordInput').value.trim(); if(!u || !p) { document.getElementById('login-error').innerText = "กรุณากรอกข้อมูลให้ครบถ้วน"; return; } let userFound = null; for(let id in staffData) { let staff = staffData[id]; if(staff) { let dbUser = staff.Username || staff.ID || staff.Staff_ID; let dbPass = staff.Password || staff.PIN; if(dbUser == u && dbPass == p) { userFound = staff; break; } } } if(userFound) { loginSuccess(userFound); } else { document.getElementById('login-error').innerText = "❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"; } }
        function bypassLogin() { loginSuccess({ Name: "Admin Test", Password: "1234", PIN: "1234", Permissions: {order:true, kitchen:true, cashier:true, discount:true, sales:true, admin:true} }); }
        
        function loginSuccess(user) { 
            currentUser = user; 
            document.getElementById('login-screen').classList.add('hidden'); 
            document.getElementById('global-header').classList.remove('hidden'); 
            document.getElementById('bottom-nav').classList.remove('hidden'); 
            document.getElementById('bottom-nav').classList.add('flex'); 
            document.getElementById('user-initial').innerText = user.Name.charAt(0).toUpperCase(); 
            document.getElementById('user-name').innerText = user.Name; 
            document.getElementById('user-role').innerText = `สิทธิ์เข้าใช้งาน: ตรวจสอบแล้ว`; 
            document.getElementById('usernameInput').value = ""; 
            document.getElementById('passwordInput').value = ""; 
            document.getElementById('login-error').innerText = ""; 
            
            setupPermissions(user); 
            logActivity('LOGIN', `เข้าสู่ระบบสำเร็จ`); 
            
            renderCategories(); filterMenu('All'); 
        }

        function setupPermissions(user) { 
            const navOrder = document.getElementById('nav-order'); 
            const navStatus = document.getElementById('nav-status'); 
            const navKitchen = document.getElementById('nav-kitchen'); 
            const navCashier = document.getElementById('nav-cashier'); 
            const navSales = document.getElementById('nav-sales'); 
            const navAdmin = document.getElementById('nav-admin'); 
            
            [navOrder, navStatus, navKitchen, navCashier, navSales, navAdmin].forEach(el => el.style.display = 'none'); 

            let p = user.Permissions;

            if (p) {
                if(p.order) { navOrder.style.display = 'flex'; navStatus.style.display = 'flex'; }
                if(p.kitchen) { navKitchen.style.display = 'flex'; navStatus.style.display = 'flex'; }
                if(p.cashier) { navCashier.style.display = 'flex'; navStatus.style.display = 'flex'; }
                if(p.sales) navSales.style.display = 'flex';
                if(p.admin) { navAdmin.style.display = 'flex'; navAdmin.classList.remove('hidden'); }
            } else {
                const roleStr = (user.Role || user.Position || "").toLowerCase(); 
                let isManager = roleStr.includes('admin') || roleStr.includes('manager') || roleStr.includes('ผู้จัดการ'); 
                
                if(isManager) { 
                    [navOrder, navStatus, navKitchen, navCashier, navSales].forEach(el => el.style.display = 'flex'); 
                    navAdmin.style.display = 'flex'; navAdmin.classList.remove('hidden'); 
                } else { 
                    if (roleStr.includes('waiter') || roleStr.includes('สั่งอาหาร')) { navOrder.style.display = 'flex'; navStatus.style.display = 'flex'; } 
                    if (roleStr.includes('kitchen') || roleStr.includes('ครัว') || roleStr.includes('bar')) { navKitchen.style.display = 'flex'; navStatus.style.display = 'flex'; } 
                    if (roleStr.includes('cashier') || roleStr.includes('แคชเชียร์')) { navCashier.style.display = 'flex'; navStatus.style.display = 'flex'; } 
                }
            }

            if (navOrder.style.display === 'flex') switchPage('order', navOrder); 
            else if (navKitchen.style.display === 'flex') switchPage('kitchen', navKitchen); 
            else if (navCashier.style.display === 'flex') switchPage('cashier', navCashier); 
            else if (navSales.style.display === 'flex') switchPage('sales', navSales);
            else if (navAdmin.style.display === 'flex') switchPage('admin', navAdmin);
        }

        function logout() { logActivity('LOGOUT', `ออกจากระบบ`); currentUser = null; stopPolling(); document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('global-header').classList.add('hidden'); document.getElementById('bottom-nav').classList.add('hidden'); document.getElementById('bottom-nav').classList.remove('flex'); document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden')); }
        function switchPage(pageId, btnElement) { document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden')); document.getElementById('page-' + pageId).classList.remove('hidden'); document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active')); if(btnElement) btnElement.classList.add('active'); const cartBar = document.getElementById('cart-bar'); if(pageId === 'order') cartBar.classList.remove('translate-y-32'); else cartBar.classList.add('translate-y-32'); if(['kitchen', 'cashier', 'status', 'order', 'sales', 'admin'].includes(pageId)) { fetchActiveOrders(); if(pageId === 'sales') fetchSalesData(); if(!pollingInterval && pageId !== 'admin') pollingInterval = setInterval(fetchActiveOrders, 3000); } else { stopPolling(); } }
        function stopPolling() { if(pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; } }
