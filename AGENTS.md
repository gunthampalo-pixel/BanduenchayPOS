# Global Rules & Architecture Standards for POS BDC

## 1. End-to-End Autonomous Execution (Fully Autonomous)
1. **Deliver Completed Results Directly:** Focus on executing the task and delivering a completed, working product directly (e.g., live Vercel URL, GitHub repository link, active database setup).
2. **Handle Deployment and Database Setup:** Automate Git commits, pushes, and deployment configurations.
3. **Cross-Project Navigation:** Authorized to work across project directories as needed.
4. **Group Terminal Commands:** Group sequential commands to minimize prompts.

## 2. 📁 Modular Project Architecture (โครงสร้างโฟลเดอร์มาตรฐาน)
ทุกครั้งที่สร้างหรือพัฒนาเว็บแอปพลิเคชัน ต้องจัดวางโฟลเดอร์ตามมาตรฐานนี้เสมอ:
```text
📁 Project/
├── 📄 index.html                      # หน้าเว็บหลัก (SPA Entry Point)
├── 📄 README.md                       # สรุปภาพรวมของโปรเจกต์
├── 📄 .gitignore                      # กรองไฟล์ขยะ Mac (.DS_Store) และไฟล์ชั่วคราว
├── 📁 โค้ดระบบ/ (src/)                  # ⚙️ โค้ดแยกตามหน้าที่ (01_Config, 02_Auth, 03_Core, 04_Admin, 05_Reports)
├── 📁 หน้าตาแอพ/ (styles/)             # 🎨 CSS และ Custom Styles
├── 📁 สื่อและรูปภาพ/ (assets/)          # 🖼️ รูปภาพ ไอคอน โลโก้ ไฟล์เสียง
└── 📁 คู่มือ/ (docs/)                  # 📖 เอกสารอธิบายระบบและคู่มือใช้งาน
```

## 3. 🧠 Project Memory & Visual Diagrams (On-Demand & Maintenance)
1. เมื่อมีการขอ Flowchart หรือภาพรวมระบบ ให้สร้าง Mermaid Diagram แสดงภาพรวมสถาปัตยกรรม (Frontend -> Function -> Database) และ Data Flow เสมอ
2. ไม่สร้างโฟลเดอร์สำรองไฟล์แบบ Copy-Paste ในเครื่อง ให้พึ่งพา Git/GitHub Commit History และ Vercel Deployment Rollback เป็นระบบสำรองเวอร์ชันหลัก
