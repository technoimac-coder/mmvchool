'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'th' | 'en';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (thai: string, english?: string) => string;
}

const STORAGE_KEY = 'mmv_school_language';

const translations: Record<string, string> = {
  'โรงเรียนมกุฎเมืองราชวิทยาลัย': 'Makudmuang Rachawitthayalai School',
  'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง': 'The Secondary Educational Service Area Office Chonburi Rayong',
  'ระบบสารสนเทศบริหารงานโรงเรียน': 'School Management Information System',
  'หน้าหลักของฉัน': 'My Dashboard',
  'ทำเนียบบุคลากร': 'Personnel Directory',
  'ระบบงานโรงเรียน': 'School Services',
  'ระบบการลา': 'Leave Management',
  'ขออนุญาตไปราชการ': 'Official Duty Request',
  'ขอใช้รถส่วนกลาง': 'School Vehicle Request',
  'ขอใช้อาคารสถานที่': 'Facility Request',
  'จองห้องประชุม': 'Meeting Room Booking',
  'แจ้งซ่อมบำรุง': 'Repair Request',
  'การอนุมัติและติดตาม': 'Approvals & Tracking',
  'จัดครูสอนแทน': 'Substitute Teacher Assignment',
  'ผลงาน & ว.PA': 'Portfolio & Performance Agreement',
  'แผนการจัดการเรียนรู้': 'Lesson Plans',
  'ศูนย์ควบคุมผู้ดูแลระบบ': 'Admin Console',
  'ภาพรวม': 'Overview',
  'เปิดเมนูหลัก': 'Open main menu',
  'ปิดเมนูด้านข้าง': 'Close sidebar',
  'ตราโรงเรียน': 'School emblem',
  'ตราโรงเรียนมกุฎเมืองราชวิทยาลัย': 'Makudmuang Rachawitthayalai School emblem',
  'ตราประจำโรงเรียนมกุฎเมืองราชวิทยาลัย': 'Makudmuang Rachawitthayalai School emblem',
  'รหัสประจำตัวบุคลากร 12–13 หลัก': '12–13 Digit Personnel ID',
  '* ป้อนเลขประจำตัวประชาชน หรือรหัสบุคลากรต่างชาติ': '* Enter a Thai citizen ID or foreign personnel ID.',
  'รหัสผ่าน (Password)': 'Password',
  'เข้าสู่ระบบ (Sign In)': 'Sign In',
  'รหัสผ่าน': 'Password',
  'กรอกรหัสผ่าน...': 'Enter your password...',
  'เข้าสู่ระบบ': 'Sign In',
  'กรุณากรอกรหัสประจำตัวให้ครบ 12 หรือ 13 หลัก': 'Please enter a valid 12- or 13-digit personnel ID.',
  'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่': 'Sign-in failed. Please try again.',
  'ตั้งรหัสผ่านใหม่สำหรับการใช้งานครั้งแรก': 'Set a New Password for First-Time Access',
  'รหัสผ่านใหม่': 'New Password',
  'ยืนยันรหัสผ่านใหม่อีกครั้ง': 'Confirm New Password',
  'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร': 'Password must contain at least 6 characters.',
  'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน': 'The new passwords do not match.',
  'บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ': 'Save New Password and Sign In',
  'คำแนะนำการตั้งรหัสผ่าน': 'Password Guidance',
  'ความยาวอย่างน้อย 6 ตัวอักษร': 'Use at least 6 characters.',
  'หลีกเลี่ยงข้อมูลส่วนตัวหรือรหัสที่เดาง่าย': 'Avoid personal information and easy-to-guess passwords.',
  'ออกจากระบบ': 'Sign Out',
  'ออกจากระบบไม่สำเร็จ กรุณาลองใหม่': 'Unable to sign out. Please try again.',
  'การแจ้งเตือน & เวิร์กโฟลว์': 'Notifications & Workflow',
  'การแจ้งเตือน': 'Notifications',
  'ไม่มีการแจ้งเตือนในขณะนี้': 'No notifications at this time',
  'ยังไม่มีการแจ้งเตือน': 'No notifications yet',
  'เชื่อมต่อ LINE': 'Connect LINE',
  'เชื่อมต่อบัญชี LINE': 'Connect LINE Account',
  'เชื่อมบัญชี LINE': 'Connect LINE Account',
  'ปิดเมนู': 'Close menu',
  'ออกจากระบบ (Log Out)': 'Sign Out',
  'คัดลอกรหัส': 'Copy Code',
  'ปิดหน้าต่าง': 'Close',
  'ยกเลิก': 'Cancel',
  'บันทึกข้อมูล': 'Save',
  'แก้ไขข้อมูล': 'Edit',
  'ดูรายละเอียด': 'View Details',
  'ค้นหา': 'Search',
  'ทั้งหมด': 'All',
  'ของฉัน': 'My Requests',
  'รออนุมัติ': 'Pending Approval',
  'อนุมัติแล้ว': 'Approved',
  'ไม่อนุมัติ': 'Rejected',
  'รอดำเนินการ': 'Pending',
  'สถานะ': 'Status',
  'การจัดการ': 'Actions',
  'ผู้ยื่นคำขอ': 'Requester',
  'ผู้แจ้ง': 'Reporter',
  'ผู้รับผิดชอบ': 'Assignee',
  'วันที่': 'Date',
  'เวลา': 'Time',
  'สถานที่': 'Location',
  'รายละเอียด': 'Details',
  'หมายเหตุ': 'Notes',
  'แนบเอกสาร': 'Attach Documents',
  'อัปโหลดไฟล์': 'Upload File',
  'เลือกไฟล์': 'Choose File',
  'ส่งคำขอ': 'Submit Request',
  'ยืนยัน': 'Confirm',
  'พิมพ์ PDF': 'Print PDF',
  'เปิดเอกสาร': 'Open Document',
  'ดาวน์โหลด': 'Download',
  'ข่าวประชาสัมพันธ์ & ข่าวสารโรงเรียน': 'School News & Announcements',
  'คำสั่งโรงเรียน & หนังสือราชการ': 'School Orders & Official Documents',
  'ศูนย์ข้อมูลข่าวสารและคำสั่งโรงเรียน': 'School News and Orders Center',
  'ภาคเรียนที่': 'Semester',
  'ปฏิทินกิจกรรมสำคัญ': 'Important Events Calendar',
  'ภารกิจโรงเรียนวันนี้': "Today's School Operations",
  'ประกาศข่าว': 'Publish News',
  'เพิ่มคำสั่ง': 'Add School Order',
  'เขียนใบลา': 'Submit Leave Request',
  'ขอไปราชการ': 'Official Duty Request',
  'พิมพ์บันทึกข้อความ': 'Print Memorandum',
  'ระบบลาออนไลน์': 'Online Leave Management',
  'ระบบลาออนไลน์ (แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร)': 'Online Leave Management (Sick, Personal and Maternity Leave)',
  'โรงเรียนมกุฎเมืองราชวิทยาลัย สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง': 'Makudmuang Rachawitthayalai School — The Secondary Educational Service Area Office Chonburi Rayong',
  'ตัวกรองรายการ': 'Request Filters',
  'ทั้งหมดในระบบ': 'All Requests',
  'รายการของฉัน': 'My Requests',
  'คำขอของฉัน': 'My Requests',
  'รายการรอดำเนินการ': 'Pending Requests',
  'รอฉันพิจารณา': 'Awaiting My Review',
  'รหัสคำขอ': 'Request ID',
  'ช่วงเวลาลา': 'Leave Period',
  'จำนวน': 'Duration',
  'สถิติสะสม': 'Cumulative Record',
  'ไม่พบรายการใบลาตามเงื่อนไขที่เลือก': 'No leave requests match the selected filters',
  'ยื่นแบบใบลาออนไลน์': 'Submit Leave Request',
  'แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร': 'Sick, Personal and Maternity Leave Form',
  'ระบบดึงข้อมูลประวัติการลาและข้อมูลผู้ขอให้อัตโนมัติ': 'Applicant details and leave history are retrieved automatically',
  'ข้าพเจ้า (ผู้ขอ)': 'Applicant',
  'ตำแหน่ง (ตำแหน่งครู/วิทยฐานะ)': 'Position / Academic Rank',
  'สังกัด': 'Affiliation',
  'ขอลา (เลือกประเภทการลา)': 'Leave Type',
  'ขอลา (เลือกประเภทการลา):': 'Select Leave Type:',
  'ลาป่วย': 'Sick Leave',
  'ลากิจส่วนตัว': 'Personal Leave',
  'ลาคลอดบุตร': 'Maternity Leave',
  'ป่วยเนื่องจาก...': 'Reason for sick leave...',
  'กิจส่วนตัวเนื่องจาก...': 'Reason for personal leave...',
  'คลอดบุตร': 'Maternity leave',
  'ระบุเพิ่มเติม...': 'Please specify...',
  'อื่นๆ (ระบุ)': 'Other (please specify)',
  'โปรดระบุประเภทการลาอื่น ๆ (เช่น ลาอุปสมบท, ลาช่วยภริยาคลอดบุตร)': 'Please specify the other leave type (for example, ordination or spouse maternity support leave)',
  'ระบุประเภทการลา...': 'Specify leave type...',
  'เนื่องจาก (เหตุผลการลา)': 'Reason for Leave',
  'ตั้งแต่วันที่': 'From Date',
  'ถึงวันที่': 'To Date',
  'มีกำหนด (วัน)': 'Duration (Days)',
  'เบอร์โทรศัพท์ติดต่อ': 'Contact Number',
  'เอกสารแนบประกอบใบลา (เพิ่มได้หลายรายการ)': 'Supporting Documents (multiple files allowed)',
  '📎 เอกสารแนบประกอบใบลา (เพิ่มได้หลายรายการ)': '📎 Supporting Documents (multiple files allowed)',
  'แนบใบรับรองแพทย์': 'Attach Medical Certificate',
  '+ แนบ': '+ Attach',
  'ใบรับรองแพทย์': 'Medical Certificate',
  '+ แนบใบรับรองแพทย์': '+ Attach Medical Certificate',
  'แนบใบแลกคาบ': 'Attach Class Exchange Form',
  'ใบแลกคาบ': 'Class Exchange Form',
  '+ แนบใบแลกคาบ': '+ Attach Class Exchange Form',
  'แนบเอกสารอื่น ๆ': 'Attach Other Document',
  'เอกสารอื่น ๆ': 'Other Document',
  '+ แนบเอกสารอื่น ๆ': '+ Attach Other Document',
  'ลายมือชื่อผู้ขอลา': "Applicant's Signature",
  '✍️ ลายมือชื่อผู้ขอลา (เซ็นสด หรือ อัปโหลดรูปภาพ)': "✍️ Applicant's Signature (draw or upload an image)",
  '+ เซ็นชื่อ / อัปโหลดรูปลายเซ็น': '+ Draw / Upload Signature',
  '✏️ เปลี่ยนลายเซ็น': '✏️ Change Signature',
  '✓ มีลายเซ็นแล้ว': '✓ Signature added',
  'คลิกที่นี่เพื่อวาดลายเซ็นสด หรืออัปโหลดไฟล์รูปลายเซ็น': 'Click here to draw or upload your signature',
  'ลงลายมือชื่อผู้ขอลา (Signature)': "Applicant's Signature",
  'ประวัติการลาครั้งสุดท้าย (ดึงข้อมูลอัตโนมัติจากฐานข้อมูล)': 'Most Recent Leave Record (retrieved automatically)',
  'ระบบดึงให้อัตโนมัติ': 'Retrieved Automatically',
  '✓ ยังไม่มีประวัติการลาที่ได้รับอนุมัติในรอบปีงบประมาณนี้ (ยื่นขอลาเป็นครั้งแรก)': '✓ No approved leave record exists for this fiscal year (first leave request)',
  'ในระหว่างการลาจะติดต่อข้าพเจ้าได้ที่ (ที่อยู่/สถานที่)': 'Contact Address / Location During Leave',
  'บันทึกและส่งแบบใบลา': 'Save and Submit Leave Request',
  'ระบบขออนุญาตไปราชการ': 'Official Duty Request System',
  'ยื่นแบบขออนุญาตไปราชการ': 'Submit Official Duty Request',
  'หัวข้อราชการ / ชื่องาน / โครงการ': 'Official Assignment / Activity / Project',
  'สถานที่ไปราชการ': 'Destination',
  'หน่วยงานผู้จัด': 'Organizing Agency',
  'พาหนะเดินทาง': 'Mode of Transportation',
  'รถยนต์ราชการ': 'School Vehicle',
  'รถยนต์ส่วนตัว': 'Private Vehicle',
  'พาหนะอื่น ๆ': 'Other Transportation',
  'การขอเบิกงบประมาณ': 'Expense Reimbursement',
  'ไม่ขอเบิกค่าใช้จ่าย': 'No Reimbursement Requested',
  'ลายมือชื่อผู้ขอไปราชการ': "Applicant's Signature",
  'ส่งคำขอไปราชการ': 'Submit Official Duty Request',
  'ระบบขอใช้รถและยานพาหนะโรงเรียน': 'School Vehicle Booking & Fleet Dispatch',
  'ยื่นคำขอใช้รถยนต์': 'Submit Vehicle Request',
  'แบบฟอร์มขออนุญาตใช้รถยนต์ส่วนกลาง': 'School Vehicle Request Form',
  'ข้อมูลผู้ขอใช้รถ': 'Requester Information',
  'วัตถุประสงค์ในการขอใช้รถ': 'Purpose of Travel',
  'สถานที่ปลายทาง': 'Destination',
  'วันและเวลาเดินทางไป': 'Departure Date and Time',
  'วันและเวลากลับถึงโรงเรียน': 'Return Date and Time',
  'รายชื่อผู้ร่วมเดินทางทั้งหมด': 'All Passengers',
  'ส่งคำขอใช้รถยนต์': 'Submit Vehicle Request',
  'ระบบแจ้งซ่อมบำรุงและโสตทัศนูปกรณ์': 'Maintenance, AV and IT Repair System',
  'หมวดหมู่งานซ่อม': 'Repair Category',
  'ระบุห้อง / สถานที่ที่ชำรุด': 'Room / Location',
  'รายการและอาการที่ชำรุด': 'Item and Problem Description',
  'แนบรูปถ่ายจุดที่ชำรุด (ถ้ามี)': 'Attach a Photo (optional)',
  'ส่งแจ้งซ่อม': 'Submit Repair Request',
  'ระบบขอใช้อาคารสถานที่': 'Facility and Meeting Room Request System',
  'ระบบจัดครูสอนแทน': 'Substitute Teacher Assignment System',
  'ครูผู้จัดสอนแทน': 'Substitute Schedule Coordinator',
  'ครูผู้รับมอบหมายสอนแทน': 'Assigned Substitute Teacher',
  'วันที่สอนแทน': 'Substitute Date',
  'คาบเรียนที่': 'Period',
  'ช่วงเวลา': 'Time',
  'ระดับชั้น / ห้อง': 'Class / Room',
  'รหัสวิชา': 'Subject Code',
  'ชื่อวิชา': 'Subject',
  'บันทึกและส่งแจ้งเตือน': 'Save and Send Notification',
  'จัดการบัญชีบุคลากร': 'Personnel Account Management',
  'เพิ่มบัญชี': 'Add Account',
  'เพิ่มบัญชีบุคลากร': 'Add Personnel Account',
  'บัญชีผู้ใช้ (12–13 หลัก)': '12–13 Digit Login ID',
  'กรุณากรอกบัญชีผู้ใช้เป็นตัวเลข 12 หรือ 13 หลัก': 'Please enter a 12- or 13-digit numeric login ID.',
  'รหัสบุคลากร': 'Personnel ID',
  'ชื่อ-นามสกุล': 'Full Name',
  'ตำแหน่ง': 'Position',
  'กลุ่มสาระ / ฝ่ายงาน': 'Department / Work Group',
  'สิทธิ์ในระบบ': 'System Role',
  'สถานะรหัสผ่าน': 'Password Status',
  'รีเซ็ต': 'Reset',
  'ลบ': 'Delete',
  'กำหนดขั้นตอนการอนุมัติแต่ละระบบงาน': 'Configure Approval Workflows',
  'ผู้รับผิดชอบปัจจุบัน': 'Current Assignee',
  'ส่งการแจ้งเตือนอัตโนมัติ': 'Notification Sent Automatically',
  'ดำเนินการอัตโนมัติ': 'Automatic Step',
  'ฐานข้อมูล': 'Database',
  'ตารางครบ': 'All Tables Available',
  'ตั้งค่าพร้อม': 'Configured',
  'ตรวจสอบระบบ': 'Run System Check',
  'ทดสอบแจ้งเตือนบัญชีของฉัน': 'Test Notification to My Account',
  'แบบขออนุญาตไปราชการ (พิมพ์เอกสารราชการขนาด A4)': 'Official Duty Request Form (A4)',
  'แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร (เส้นประเดี่ยวเรียบร้อย)': 'Sick, Personal and Maternity Leave Form (A4)',
  'พิมพ์เอกสาร / บันทึกเป็น PDF': 'Print / Save as PDF',
  'เลขที่คำขอ': 'Request No.',
  'เขียนที่': 'Written at',
  'เดือน': 'Month',
  'พ.ศ.': 'B.E.',
  'เรื่อง': 'Subject',
  'เรียน': 'To',
  'ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย': 'Director, Makudmuang Rachawitthayalai School',
  'ข้าพเจ้า': 'I,',
  'สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง': 'under The Secondary Educational Service Area Office Chonburi Rayong',
  'พร้อมด้วย': 'accompanied by',
  'ขออนุญาตไปราชการเพื่อ': 'request permission to attend official duty for',
  'ตั้งแต่เวลา': 'from',
  'ถึงเวลา': 'to',
  'รวมไปราชการครั้งนี้': 'Total official duty duration',
  'โดยขออนุมัติเบิกค่าใช้จ่ายในการเดินทางไปราชการจากเงินงบประมาณ': 'I request approval to reimburse official travel expenses from the following budget:',
  'การเดินทางไปราชการครั้งนี้ ขออนุญาตเดินทางโดยพาหนะ': 'For this official duty, permission is requested to travel by:',
  'รถยนต์ราชการหมายเลขทะเบียน': 'School vehicle registration no.',
  'พนักงานขับรถยนต์': 'Driver',
  'ผู้ควบคุม': 'Trip Supervisor',
  'รถยนต์ส่วนตัว หมายเลขทะเบียน': 'Private vehicle registration no.',
  'พาหนะอื่น ๆ รถโดยสารประจำทางและรับจ้าง': 'Other transportation: public or hired vehicle',
  'ขอแสดงความนับถือ': 'Yours sincerely,',
  'ลงชื่อ': 'Signed',
  'ประเภทการลา': 'Leave Type',
  'ลามาแล้ว': 'Previous Leave',
  'ลาครั้งนี้': 'Current Leave',
  'รวมเป็น': 'Total',
  'ครั้ง': 'Time(s)',
  'วัน': 'Day(s)',
  'ป่วย (ทำการ)': 'Sick Leave (Working Days)',
  'ลากิจส่วนตัว (ทำการ)': 'Personal Leave (Working Days)',
  'อนุญาต': 'Approved',
  'ไม่อนุญาต': 'Not Approved',
  'ความเห็น': 'Comments',
  'บันทึกข้อความ': 'MEMORANDUM',
  'ส่วนราชการ': 'Division',
  'ที่': 'Reference No.',
  'ขออนุมัติจัดข้าราชการครูและบุคลากรปฏิบัติการสอนแทน': 'Request for Approval of Substitute Teacher Assignment',
  'คาบเรียน': 'Period',
  'ระดับชั้น': 'Class Level',
  'วิชา (รหัส/ชื่อ)': 'Subject (Code / Title)',
  'ครูผู้สอนแทน (ลายมือชื่อ/สถานะ)': 'Substitute Teacher (Signature / Status)',
  'สถานะในระบบ': 'System Status',
  'ยืนยันรับสอนแทนแล้ว': 'Assignment Acknowledged',
  'รอการยืนยัน': 'Awaiting Acknowledgement',
  'ผู้ขอจัดแทน': 'Requesting Teacher',
  'ผู้จัดตาราง': 'Schedule Coordinator',
  'ความเห็นของรองผู้อำนวยการกลุ่มบริหารวิชาการ': "Deputy Director of Academic Affairs' Comments",
  'คำสั่งการ / ผู้อำนวยการโรงเรียน': "Director's Decision",
  'อนุมัติตามเสนอ': 'Approved as Proposed',
  'มกราคม': 'January',
  'กุมภาพันธ์': 'February',
  'มีนาคม': 'March',
  'เมษายน': 'April',
  'พฤษภาคม': 'May',
  'มิถุนายน': 'June',
  'กรกฎาคม': 'July',
  'สิงหาคม': 'August',
  'กันยายน': 'September',
  'ตุลาคม': 'October',
  'พฤศจิกายน': 'November',
  'ธันวาคม': 'December',
  'ภาษาไทย': 'Thai',
  'ภาษาอังกฤษ': 'English',
};

// Only these identity/context phrases are safe to replace inside a larger text
// node. Every other label is translated by exact match so Thai words are never
// partially replaced (for example “พิมพ์บันทึกข้อความ”).
const safeInlinePhrases = [
  'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
  'โรงเรียนมกุฎเมืองราชวิทยาลัย',
  'ระบบสารสนเทศบริหารงานโรงเรียน',
  'ศูนย์ข้อมูลข่าวสารและคำสั่งโรงเรียน',
  'ภาคเรียนที่',
].sort((a, b) => b.length - a.length);

export const translateThaiText = (value: string): string => {
  const trimmed = value.trim();
  const exact = translations[trimmed];
  if (exact !== undefined) {
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${exact}${value.slice(start + trimmed.length)}`;
  }

  let translated = value;
  for (const thai of safeInlinePhrases) {
    if (translated.includes(thai)) translated = translated.split(thai).join(translations[thai]);
  }
  return translated;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ['placeholder', 'title', 'aria-label', 'alt'];

function translateTree(root: Node, language: AppLanguage) {
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const previousSource = originalText.get(textNode);
      if (previousSource === undefined || (textNode.data !== previousSource && textNode.data !== translateThaiText(previousSource))) {
        originalText.set(textNode, textNode.data);
      }
      const source = originalText.get(textNode) ?? textNode.data;
      const next = language === 'en' ? translateThaiText(source) : source;
      if (textNode.data !== next) textNode.data = next;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.closest('[data-no-auto-translate="true"]')) return;

    let attrs = originalAttributes.get(element);
    if (!attrs) {
      attrs = new Map<string, string>();
      originalAttributes.set(element, attrs);
    }
    for (const attribute of translatedAttributes) {
      const current = element.getAttribute(attribute);
      const previousSource = attrs.get(attribute);
      if (current !== null && (previousSource === undefined || (current !== previousSource && current !== translateThaiText(previousSource)))) {
        attrs.set(attribute, current);
      }
      const source = attrs.get(attribute);
      if (source !== undefined) {
        const next = language === 'en' ? translateThaiText(source) : source;
        if (current !== next) element.setAttribute(attribute, next);
      }
    }
    Array.from(element.childNodes).forEach(visit);
  };
  visit(root);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('th');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const timer = window.setTimeout(() => {
      if (saved === 'en' || saved === 'th') setLanguageState(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage may be unavailable */ }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'th' ? 'en' : 'th');
  }, [language, setLanguage]);

  const t = useCallback((thai: string, english?: string) => {
    if (language === 'th') return thai;
    return english ?? translateThaiText(thai);
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
    translateTree(document.body, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTree(mutation.target, language);
        mutation.addedNodes.forEach(node => translateTree(node, language));
        if (mutation.type === 'attributes') translateTree(mutation.target, language);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatedAttributes });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, setLanguage, toggleLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/95 p-0.5 text-[10px] font-extrabold shadow-sm" role="group" aria-label="Language selection" data-no-auto-translate="true">
      <button type="button" onClick={() => setLanguage('th')} aria-pressed={language === 'th'} className={`${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} rounded-lg transition-colors ${language === 'th' ? 'bg-[#0b1f3a] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>TH</button>
      <button type="button" onClick={() => setLanguage('en')} aria-pressed={language === 'en'} className={`${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} rounded-lg transition-colors ${language === 'en' ? 'bg-[#0b1f3a] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>EN</button>
    </div>
  );
}
