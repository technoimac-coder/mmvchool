# 🏫 MMV Smart MIS - โรงเรียนมกุฎเมืองราชวิทยาลัย
> ระบบสารสนเทศบริหารงานโรงเรียนและบริการอิเล็กทรอนิกส์ (School Smart MIS & e-Service Portal)
> สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/technoimac-coder/mmvchool)
[![Website](https://img.shields.io/badge/Live-mmvschool.ac.th-success)](https://mmvschool.ac.th)
[![Framework](https://img.shields.io/badge/Next.js-16.3.1-black?logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/MariaDB-10.11-teal?logo=mariadb)](https://mariadb.org/)

---

## 🌟 จุดเด่นและระบบงานหลัก (Key Features)

1. 🔐 **ระบบเข้าสู่ระบบ (Authentication & Security)**:
   - ล็อกอินด้วย **เลขประจำตัวประชาชน 13 หลัก** ของบุคลากรทั้ง 99 ท่าน
   - ตรวจสอบรหัสผ่านฝั่ง PHP API ด้วย `password_hash` / `password_verify`
   - บังคับเปลี่ยนรหัสผ่านครั้งแรกและเก็บ session ในคุกกี้ HttpOnly
   - ระบบบังคับตั้งรหัสผ่านใหม่ส่วนตัวในการเข้าใช้งานครั้งแรก (Forced Password Reset)
   - ภาพพื้นหลังถ่ายทางอากาศโรงเรียนมกุฎเมืองราชวิทยาลัยมุมสูงแบบเต็มจอ

2. 🎛️ **ศูนย์ควบคุมผู้ดูแลระบบ (Admin Console - Self-Service)**:
   - กำหนดผู้อนุมัติ (Approver), ผู้ตรวจสอบ (Checker), และผู้ปฏิบัติงาน (Operator) รายภารกิจ
   - จัดการข้อมูลยานพาหนะ 3 คัน (`ขค 1456`, `นข 7555`, `นข 3399`) และพนักงานขับรถประจำคัน
   - จัดการห้องประชุม 3 ห้องหลัก และผู้ถือกุญแจประจำห้อง
   - จัดการบัญชีผู้ใช้ 99 ท่าน, รีเซ็ตรหัสผ่าน, และปุ่ม 1-Click มอบสิทธิ์ผู้ดูแลระบบ (Admin)
   - ตั้งค่าข้อมูลสถานศึกษา ปีการศึกษา (2567 / 2568) และภาคเรียน (1 / 2)
   - สำรองข้อมูลทั้งระบบเป็นไฟล์ Full JSON Backup

3. 🚗 **ระบบขอใช้รถส่วนกลาง (Vehicle Booking & Dispatch)**:
   - ฟอร์มขอใช้รถ, ค้นหาผู้โดยสาร, ติ๊กผู้ขอร่วมเดินทาง, คำนวณผู้โดยสารรวมอัตโนมัติ
   - ปฏิทินการใช้รถยนต์ และพิมพ์ใบขอใช้รถทางการ (PDF มาตรฐานราชการ)

4. 👥 **ระบบทำเนียบบุคลากร (Personnel Directory)**:
   - รายชื่อครูและบุคลากรจริง 99 ท่าน 16 กลุ่มสาระ/ฝ่ายงาน
   - ผังตำแหน่งแบบ Top-Center และระบบอัปโหลดรูปภาพครู

5. 📋 **ระบบการลาออนไลน์ & ไปราชการ (Leave & Official Duty)**:
   - เวิร์กโฟลว์เสนอ-ตรวจทาน-อนุมัติ 3 ระดับ
   - พิมพ์ใบลาครุฑทางการ A4 และบันทึกข้อความขอไปราชการ A4

6. 🗄️ **ฐานข้อมูลและ Backend API (HostAtom Plesk)**:
   - MariaDB / MySQL: `mmvsc_mmv_school_db` (User: `mmvsc_mmv_user`)
   - PHP 8.3 REST API ในโฟลเดอร์ `public/api/`

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
school-mis/
├── public/
│   ├── api/                  # PHP REST API สำหรับโฮสติ้ง
│   │   ├── db.php            # การเชื่อมต่อฐานข้อมูล MariaDB
│   │   └── vehicles.php      # API ข้อมูลยานพาหนะ
│   ├── .htaccess             # Apache Web Server & Cache Control Config
│   ├── mmv_database.sql      # สคริปต์สร้างตารางและ Seed ข้อมูล 99 ท่าน
│   ├── school-logo.png       # ตราประจำโรงเรียนมกุฎเมืองราชวิทยาลัย
│   └── school-bg.jpg         # ภาพถ่ายมุมสูงโรงเรียน (Login Background)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # รูทเลย์เอาต์ ฟอนต์ Prompt & Sarabun
│   │   ├── page.tsx          # หน้าหลัก & Auth Guard
│   │   └── globals.css       # สไตล์ Tailwind CSS
│   ├── components/
│   │   ├── LoginScreen.tsx   # หน้าจอเข้าสู่ระบบ 13 หลัก + บังคับเปลี่ยนรหัส
│   │   ├── Sidebar.tsx       # แถบเมนูนำทางหลัก
│   │   ├── Header.tsx        # แถบส่วนหัว แสดงตรา รร. และปุ่มออกจากระบบ
│   │   ├── Dashboard.tsx     # แดชบอร์ดภาพรวม ข่าวสาร และคำสั่งโรงเรียน
│   │   └── modules/
│   │       ├── AdminConsoleModule.tsx    # ศูนย์ควบคุมผู้ดูแลระบบ (Admin)
│   │       ├── VehicleModule.tsx         # ระบบขอใช้รถยนต์ส่วนกลาง
│   │       ├── PersonnelModule.tsx       # ทำเนียบบุคลากร
│   │       ├── LeaveModule.tsx           # ระบบการลาออนไลน์
│   │       ├── OfficialDutyModule.tsx    # ระบบขอไปราชการ
│   │       ├── RoomBookingModule.tsx     # ระบบจองห้องประชุม
│   │       ├── RepairModule.tsx          # ระบบแจ้งซ่อมบำรุง
│   │       ├── SubstituteModule.tsx      # ระบบจัดครูสอนแทน
│   │       ├── PortfolioModule.tsx       # แฟ้มผลงาน & ว.PA
│   │       └── LessonPlanModule.tsx      # คลังแผนการสอน
│   ├── context/
│   │   └── AppContext.tsx    # Global State Management & Persistence
│   ├── data/
│   │   ├── realPersonnel.json# ข้อมูลบุคลากรจริง 99 ท่าน
│   │   └── mockData.ts       # ข้อมูลยานพาหนะและห้องประชุม
│   └── types/
│       └── index.ts          # TypeScript Type Definitions
├── next.config.ts            # Next.js Static Export Configuration
├── package.json
└── tsconfig.json
```

---

## 💻 การติดตั้งและรันในเครื่อง (Local Development)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เริ่มรัน Dev Server
npm run dev

# 3. เปิดเบราว์เซอร์
# http://localhost:3000
```

---

## 🚀 การ Build และ Deploy ขึ้น HostAtom Plesk

> ก่อน deploy ระบบ production ให้อ่าน `HOSTATOM_DEPLOY.md` และทำ database/auth migration ให้ครบ ห้ามฝังรหัสฐานข้อมูลหรือเลขประจำตัวประชาชนใน source code

```bash
# Build สำหรับ Static Export
npm run build

# ไฟล์ที่ได้จะอยู่ในโฟลเดอร์ out/
# สามารถบีบอัดเป็น .zip และนำไปแตกไฟล์ (Extract) ในโฟลเดอร์ httpdocs บน Plesk
```

---

## 👤 ผู้ดูแลระบบ (Super Admin)
* **ผู้ดูแลระบบสูงสุด**: **นายนาริน** (คุณครูนาริน)
* **การจัดการสิทธิ์**: สามารถมอบสิทธิ์ Admin ให้คุณครูท่านอื่นได้แบบ 1-Click ในศูนย์ควบคุมผู้ดูแลระบบ
