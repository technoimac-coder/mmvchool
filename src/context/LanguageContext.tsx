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
  'สรุปการลา': 'Leave Summary',
  'ขออนุญาตไปราชการ': 'Official Duty Request',
  'ขอใช้รถส่วนกลาง': 'School Vehicle Request',
  'ขอใช้อาคารสถานที่': 'Facility Request',
  'จองห้องประชุม': 'Meeting Room Booking',
  'แจ้งซ่อมบำรุง': 'Repair Request',
  'การอนุมัติและติดตาม': 'Approvals & Tracking',
  'จัดครูสอนแทน': 'Substitute Teacher Assignment',
  'ผลงาน&รางวัล': 'Achievements & Awards',
  'ระบบทะเบียนผลงานและรางวัลบุคลากร': 'Personnel Achievements and Awards Registry',
  'แผนการจัดการเรียนรู้': 'Lesson Plans',
  'ส่งเอกสาร/ลงนามออนไลน์': 'Online Documents & Signatures',
  'ส่งเอกสารและลงนามออนไลน์': 'Online Document Submission & Signing',
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

  // Shared reporting, filtering and responsive data views
  'ข้อมูลภาคเรียน': 'Academic Period',
  'ปีการศึกษา': 'Academic Year',
  'เลือกปีการศึกษา': 'Select Academic Year',
  'เลือกภาคเรียน': 'Select Semester',
  'ทุกปีการศึกษา': 'All Academic Years',
  'ทุกภาคเรียน': 'All Semesters',
  'ภาคเรียนที่ 1': 'Semester 1',
  'ภาคเรียนที่ 2': 'Semester 2',
  'สรุปสถิติการลาของบุคลากร': 'Personnel Leave Statistics',
  'รายงานสถิติการลาของบุคลากร แยกตามประเภทและช่วงเวลาที่เลือก': 'Personnel leave statistics by type and selected date range',
  'จำนวนวันคิดจากรายการที่อนุมัติแล้ว': 'Approved requests are counted by leave days',
  'เลือกช่วงวันที่รายงาน': 'Select Report Date Range',
  'ค้นหาบุคลากร': 'Search Personnel',
  'ค้นหาชื่อหรือกลุ่มงาน': 'Search by Name or Work Group',
  'พิมพ์สรุปการลา': 'Print Leave Summary',
  'บุคลากรที่มีรายการ': 'Personnel with Requests',
  'คำขอทั้งหมด': 'Total Requests',
  'รวมวันอนุมัติ': 'Total Approved Days',
  'บุคลากร / กลุ่มงาน': 'Personnel / Work Group',
  'กลุ่มงาน': 'Work Group',
  'ลากิจ': 'Personal Leave',
  'ลาคลอด': 'Maternity Leave',
  'ลาอื่น ๆ': 'Other Leave',
  'รวมอนุมัติ': 'Total Approved',
  'ไม่พบข้อมูลสถิติในรอบที่เลือก': 'No statistics found for the selected period',
  'ข้อมูลอัปเดตจากรายการใบลาในระบบตามปีการศึกษาและภาคเรียนที่เลือก': 'Data is updated from leave requests in the selected academic year and semester',
  'แสดงเครื่องมือเลือกวันที่': 'Open Date Picker',
  'ล้างช่วงเวลา': 'Clear Date Range',
  'วันนี้': 'Today',
  'คน': 'People',
  'รายการ': 'Items',

  // Personnel directory
  'ทำเนียบครูและบุคลากร': 'Teacher and Personnel Directory',
  'ข้อมูลครูและบุคลากรในโรงเรียน': 'School Teacher and Personnel Information',
  'ค้นหาชื่อ ตำแหน่ง หรือกลุ่มงาน': 'Search by Name, Position or Work Group',
  'ทุกกลุ่มงาน': 'All Work Groups',
  'บุคลากรทั้งหมด': 'All Personnel',
  'รายละเอียดข้อมูลบุคลากร': 'Personnel Details',
  'ข้อมูลส่วนตัว': 'Personal Information',
  'ข้อมูลการปฏิบัติงาน': 'Employment Information',
  'ประวัติการศึกษา': 'Education History',
  'ประวัติการทำงาน': 'Employment History',
  'ภาระงาน': 'Assigned Duties',
  'งานที่รับผิดชอบ': 'Responsibilities',
  'รูปประจำตัว': 'Profile Photo',
  'เลขบัญชีผู้ใช้ 13 หลัก': '13-Digit User ID',
  'อีเมล': 'Email',
  'เบอร์โทรศัพท์': 'Phone Number',
  'วันเดือนปีเกิด': 'Date of Birth',
  'วันที่เริ่มปฏิบัติงาน': 'Employment Start Date',
  'วุฒิการศึกษา': 'Educational Qualification',
  'วิชาเอก': 'Major',
  'ใบอนุญาตประกอบวิชาชีพ': 'Professional License',
  'ยังไม่มีข้อมูล': 'No Data Available',
  'ไม่พบข้อมูลบุคลากร': 'No Personnel Found',

  // Leave workflow
  'ประวัติและสถานะคำขอลา': 'Leave Request History and Status',
  'รายละเอียดใบลา': 'Leave Request Details',
  'เหตุผลการลา': 'Reason for Leave',
  'สถานที่ติดต่อระหว่างลา': 'Contact Location During Leave',
  'ผู้ตรวจสอบใบลา': 'Leave Reviewer',
  'ผู้พิจารณาอนุญาต': 'Approving Officer',
  'ผู้อำนวยการอนุมัติขั้นสุดท้าย': 'Final Approval by Director',
  'รอตรวจสอบ': 'Awaiting Review',
  'อยู่ระหว่างเสนอ': 'Under Review',
  'อนุมัติใบลา': 'Approve Leave Request',
  'พิจารณาใบลา': 'Review Leave Request',
  'ความเห็นผู้ตรวจสอบ': 'Reviewer Comments',
  'ความเห็นผู้อนุมัติ': 'Approver Comments',
  'ลงลายมือชื่อผู้อนุมัติ': "Approver's Signature",
  'พิมพ์ใบลา': 'Print Leave Form',
  'กรุณาระบุเหตุผลการลา': 'Please provide a reason for leave.',
  'กรุณาเลือกวันที่ลาให้ครบถ้วน': 'Please select the complete leave date range.',
  'ระบุเหตุผลการลา...': 'Enter the reason for leave...',

  // Official duty
  'คำขอไปราชการทั้งหมด': 'All Official Duty Requests',
  'รายการไปราชการของฉัน': 'My Official Duty Requests',
  'รายละเอียดคำขอไปราชการ': 'Official Duty Request Details',
  'วันที่และเวลาเดินทาง': 'Travel Date and Time',
  'ผู้ร่วมเดินทาง': 'Participants',
  'งบประมาณ': 'Budget',
  'จำนวนเงิน': 'Amount',
  'แหล่งงบประมาณ': 'Funding Source',
  'เลขทะเบียนรถ': 'Vehicle Registration',
  'ลายมือชื่อผู้พิจารณา': "Reviewer's Signature",
  'ลงลายมือชื่อผู้พิจารณา': 'Sign as Reviewer',
  'พิจารณา': 'Review',
  'ตรวจสอบและรับทราบ': 'Review and Acknowledge',
  'พิมพ์ใบขออนุญาตไปราชการ': 'Print Official Duty Request',
  'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน': 'Please complete all required information.',
  'กำลังส่งคำขอ...': 'Submitting Request...',
  'บาท': 'THB',

  // Vehicle requests and fleet
  'ระบบขอใช้รถยนต์ส่วนกลาง': 'School Vehicle Request System',
  'รายการขอใช้รถ': 'Vehicle Requests',
  'ปฏิทินการใช้รถยนต์': 'Vehicle Use Calendar',
  'ข้อมูลรถยนต์': 'Vehicle Information',
  'รถยนต์ทั้งหมด': 'All Vehicles',
  'รถพร้อมใช้งาน': 'Available Vehicles',
  'ติดภารกิจเดินทาง': 'On Assignment',
  'ซ่อมบำรุง': 'Under Maintenance',
  'รถตู้': 'Van',
  'รถบัส': 'Bus',
  'รถกระบะ': 'Pickup Truck',
  'ความจุ': 'Capacity',
  'ที่นั่ง': 'Seats',
  'พนักงานขับรถประจำ': 'Assigned Driver',
  'งานที่ได้รับมอบหมายสำหรับพนักงานขับรถ': 'Driver Mission Assignments',
  'กดรับทราบงาน': 'Acknowledge Assignment',
  'พนักงานขับรถรับทราบแล้ว': 'Driver Acknowledged',
  'แจ้งพนักงานขับรถแล้ว': 'Driver Notified',
  'รอพนักงานขับรถรับทราบ': 'Awaiting Driver Acknowledgement',
  'ข้อมูลผู้ขอใช้รถ (ผู้รับผิดชอบการเดินทาง)': 'Requester Information (Trip Coordinator)',
  'ผู้ขอใช้รถร่วมเดินทางไปด้วย': 'Requester Will Join the Trip',
  'เพิ่มครู/บุคลากรผู้ร่วมเดินทาง': 'Add Teacher / Personnel Participant',
  'เพิ่มนักเรียนผู้ร่วมเดินทาง': 'Add Student Participant',
  'รวมผู้ร่วมเดินทางทั้งหมด': 'Total Participants',
  'หนังสือขออนุมัติ / คำสั่งอ้างอิง (ถ้ามี)': 'Approval Letter / Reference Order (optional)',
  'พิจารณาและจัดสรรยานพาหนะ': 'Review and Allocate Vehicle',
  'เลือกประเภทยานพาหนะและการจัดสรร': 'Select Vehicle Type and Allocation',
  'ใช้รถยนต์ของโรงเรียน': 'Use a School Vehicle',
  'จ้างเหมารถเช่าภายนอก': 'Hire an External Vehicle',
  'เลือกยานพาหนะ': 'Select Vehicle',
  'มอบหมายพนักงานขับรถ': 'Assign Driver',
  'พนักงานขับรถประจำคัน': 'Assigned Vehicle Driver',
  'ความเห็น / คำสั่งการของฝ่ายบริหาร': 'Management Comments / Instructions',
  'อนุมัติและจัดสรรรถ': 'Approve and Allocate Vehicle',
  'รายละเอียดคำขอใช้รถ': 'Vehicle Request Details',
  'ผู้ขอใช้รถ': 'Vehicle Requester',
  'วันเดินทาง': 'Departure Date',
  'วันกลับ': 'Return Date',
  'ผู้โดยสารทั้งหมด': 'Total Passengers',
  'คณะครูผู้ร่วมเดินทาง': 'Participating Teachers',
  'นักเรียนผู้ร่วมเดินทาง': 'Participating Students',
  'ใบขออนุญาตใช้รถยนต์ส่วนกลาง': 'School Vehicle Request Form',

  // Facility and room booking
  'ระบบจองห้องประชุมและขอใช้อาคารสถานที่': 'Meeting Room and Facility Booking System',
  'รายการจองสถานที่': 'Facility Bookings',
  'ปฏิทินการจอง': 'Booking Calendar',
  'ยื่นคำขอใช้สถานที่': 'Submit Facility Request',
  'หัวข้อการประชุม / กิจกรรม': 'Meeting / Activity Title',
  'เลือกอาคาร/ห้องที่ต้องการใช้': 'Select Building / Room',
  'วันที่ขอใช้': 'Requested Date',
  'เวลาเริ่ม': 'Start Time',
  'เวลาสิ้นสุด': 'End Time',
  'จำนวนผู้เข้าร่วม': 'Number of Participants',
  'อุปกรณ์ที่ต้องการ': 'Required Equipment',
  'ระบบเครื่องเสียง': 'Sound System',
  'เครื่องฉายโปรเจกเตอร์': 'Projector',
  'ไมโครโฟน': 'Microphone',
  'ผู้ดูแลสถานที่': 'Facility Coordinator',
  'รอผู้ดูแลสถานที่ยืนยัน': 'Awaiting Facility Coordinator Confirmation',
  'ผู้ดูแลสถานที่ยืนยันแล้ว': 'Facility Coordinator Confirmed',
  'พร้อมใช้งาน': 'Ready for Use',
  'รายละเอียดการจอง': 'Booking Details',
  'ยืนยันการใช้สถานที่': 'Confirm Facility Use',

  // Repair requests
  'รายการแจ้งซ่อม': 'Repair Tickets',
  'แจ้งซ่อมใหม่': 'New Repair Request',
  'รายละเอียดงานซ่อม': 'Repair Details',
  'หัวข้องานซ่อม': 'Repair Subject',
  'โสตทัศนูปกรณ์ / โปรเจกเตอร์ / ลำโพง': 'Audiovisual Equipment / Projector / Speakers',
  'อาคารสถานที่ / ประตูหน้าต่าง': 'Facilities / Doors / Windows',
  'ระบบไฟฟ้า': 'Electrical System',
  'ระบบประปา': 'Plumbing System',
  'รูปจุดที่ชำรุด': 'Damage Photo',
  'รูปงานที่ดำเนินการแก้ไข': 'Completed Repair Photo',
  'รับแจ้ง & มอบหมายผู้รับผิดชอบ': 'Accept and Assign Technician',
  'รับแจ้ง & เริ่มดำเนินการ': 'Accept and Start Repair',
  'กำลังดำเนินการซ่อมบำรุง': 'Repair in Progress',
  'บันทึกผลการซ่อม': 'Record Repair Result',
  'ผลการดำเนินงาน': 'Work Result',
  'แนบรูปหลังดำเนินการ': 'Attach Completion Photo',
  'รอผู้แจ้งตรวจรับงานและให้คะแนนความพึงพอใจ': 'Awaiting Reporter Acceptance and Satisfaction Rating',
  'ตรวจรับงาน': 'Accept Completed Work',
  'ให้คะแนนความพึงพอใจ': 'Rate Satisfaction',
  'ปิดงาน': 'Close Ticket',

  // Substitute teacher assignment
  'รายการสอนแทน': 'Substitute Assignments',
  'จัดตารางสอนแทน': 'Create Substitute Assignment',
  'ครูผู้ขอจัดแทน': 'Requesting Teacher',
  'ครูเจ้าของวิชา': 'Original Teacher',
  'ครูสอนแทน': 'Substitute Teacher',
  'เลือกครูผู้รับสอนแทน': 'Select Substitute Teacher',
  'ลาไปราชการ / ลาป่วย': 'Official Duty / Leave',
  'เหตุผลกรณีไม่สะดวก (ไม่บังคับ)': 'Reason if Unavailable (optional)',
  'ยืนยันรับสอนแทน': 'Acknowledge Substitute Assignment',
  'รอรับทราบ': 'Awaiting Acknowledgement',
  'รับทราบแล้ว': 'Acknowledged',
  'รายงานจัดตารางสอน': 'Teaching Schedule Report',
  'สรุปรายวัน': 'Daily Summary',
  'สรุปรายสัปดาห์': 'Weekly Summary',
  'พิมพ์รายงาน': 'Print Report',
  'รายการที่เกี่ยวข้องกับฉัน': 'Assignments Related to Me',

  // Portfolio and awards
  'บันทึกผลงานและรางวัลบุคลากร': 'Record Personnel Achievements and Awards',
  'บันทึกผลงานใหม่': 'Add New Achievement',
  'ผลงานทั้งหมดในระบบ': 'Total Achievements',
  'แฟ้มบุคลากร': 'Personnel Portfolios',
  'กำลังแสดงข้อมูล': 'Showing Data',
  'รางวัล/ผลงาน': 'Awards / Achievements',
  'อบรม': 'Training',
  'วิทยากร/ครูผู้ฝึกซ้อม': 'Trainer / Coach',
  'เกียรติบัตร/อื่นๆ': 'Certificates / Others',
  'ผลงานโรงเรียน': 'School Achievements',
  'ผลงานฝ่ายบริหาร': 'Administration Achievements',
  'ชื่อผลงาน / รางวัล / หลักสูตร': 'Achievement / Award / Course Title',
  'ประเภทผลงาน': 'Achievement Type',
  'วัน เดือน ปี ที่ได้รับ': 'Date Received',
  'หน่วยงานที่มอบรางวัล / ผู้จัด': 'Awarding / Organizing Agency',
  'อธิบายรายละเอียดและผลลัพธ์ที่ได้รับ': 'Describe the details and outcomes',
  'แนบรูปภาพและเอกสาร': 'Attach Images and Documents',
  'เลือกไฟล์รูปภาพหรือเอกสาร': 'Choose Images or Documents',
  'บันทึกผลงาน': 'Save Achievement',
  'ค้นหาและกรองข้อมูล': 'Search and Filter',
  'เลือกกลุ่มสาระหรือกลุ่มงาน': 'Select Department or Work Group',
  'เลือกบุคลากรที่ต้องการตรวจสอบ': 'Select Personnel to Review',
  'ส่งออก Excel': 'Export to Excel',
  'ยังไม่มีข้อมูลในแฟ้มนี้': 'No Items in This Portfolio',
  'ไม่มีไฟล์แนบ': 'No Attachments',
  'รูปภาพและเอกสารแนบ': 'Images and Attachments',

  // Lesson plans
  'คลังแผนการจัดการเรียนรู้': 'Lesson Plan Repository',
  'ส่งแผนการจัดการเรียนรู้': 'Submit Lesson Plan',
  'แผนการสอนของฉัน': 'My Lesson Plans',
  'แผนการสอนทั้งหมด': 'All Lesson Plans',
  'รายวิชา (ชื่อวิชา)': 'Subject',
  'ชื่อหน่วยการเรียนรู้': 'Learning Unit',
  'จำนวนชั่วโมง': 'Number of Hours',
  'ไฟล์แผนการสอน': 'Lesson Plan File',
  'เลือกไฟล์แผนการสอน': 'Choose Lesson Plan File',
  'บันทึกหลังแผน': 'Post-Lesson Reflection',
  'ส่งฝ่ายวิชาการ': 'Submit to Academic Affairs',
  'วันที่ส่ง': 'Submission Date',
  'ไม่พบแผนการสอน': 'No Lesson Plans Found',

  // Online document workflow and signing
  'แผนการสอน (บันทึกหลังแผน)': 'Lesson Plan (Post-Lesson Reflection)',
  'กิจกรรมชุมชนการเรียนรู้ทางวิชาชีพ (PLC)': 'Professional Learning Community (PLC)',
  'SAR รายบุคคล': 'Individual SAR',
  'เอกสารทั้งหมด': 'All Documents',
  'รอฉันลงนาม': 'Awaiting My Signature',
  'กำลังดำเนินการ': 'In Progress',
  'เสร็จสิ้น': 'Completed',
  'ส่งกลับแก้ไข': 'Returned for Revision',
  'รอฉันเซ็น': 'Awaiting My Signature',
  'เอกสารในรอบที่เลือก': 'Documents in Selected Period',
  'รอฉันตรวจและลงนาม': 'Awaiting My Review and Signature',
  'เอกสารที่ฉันส่ง': 'Documents I Sent',
  'รอบจัดเก็บเอกสาร': 'Document Filing Period',
  'หมวดหมู่เอกสารลงนาม': 'Document Categories',
  'ค้นหาชื่อเรื่อง ไฟล์ ผู้ส่ง หรือประเภท': 'Search by Title, File, Sender or Type',
  'เอกสารที่ฉันต้องตรวจและลงนาม': 'Documents Requiring My Review and Signature',
  'เอกสารที่ฉันอัปโหลดและส่งต่อ': 'Documents I Uploaded and Forwarded',
  'ส่งเอกสารใหม่': 'Send New Document',
  'แนบไฟล์และกำหนดผู้ลงนามตามลำดับ': 'Attach a File and Set the Signing Order',
  'ชื่อเรื่องเอกสาร': 'Document Title',
  'รายละเอียดเพิ่มเติม (ถ้ามี)': 'Additional Details (optional)',
  'เลือกไฟล์ PDF หรือเอกสาร': 'Choose PDF or Document',
  'PDF, Word, Excel, PowerPoint หรือรูปภาพ': 'PDF, Word, Excel, PowerPoint or Image',
  'เลือกผู้ลงนามตามลำดับ': 'Select Signers in Order',
  'ไม่พบรายชื่อที่ตรงกัน': 'No Matching Personnel Found',
  '+ เลือก': '+ Select',
  'ลำดับที่เลือก': 'Selected Order',
  'นำออก': 'Remove',
  'ส่งเข้าลำดับการลงนาม': 'Send for Sequential Signing',
  'ไฟล์': 'File',
  'ผู้ส่ง': 'Sender',
  'รอลงนาม': 'Awaiting Signature',
  'อ่านและลงนามเอกสารออนไลน์': 'Review and Sign Document Online',
  'ดาวน์โหลด PDF': 'Download PDF',
  'ส่งกลับ': 'Return',
  'ยืนยันและส่งต่อ': 'Confirm and Forward',
  'ลายมือบนเอกสาร': 'Document Annotations',
  'ข้อความบนเอกสาร': 'Document Text',
  'เพิ่มข้อความ': 'Add Text',
  'เลือกตำแหน่งข้อความบน PDF': 'Select Text Position on PDF',
  'เลือกตำแหน่งลายเซ็นบน PDF': 'Select Signature Position on PDF',
  'ขนาดตัวอักษร': 'Font Size',
  'ขนาดลายเซ็น': 'Signature Size',
  'ความหนาของลายมือ': 'Pen Thickness',
  'อัปโหลดรูปลายเซ็น': 'Upload Signature Image',
  'กระดานวาดลายเซ็น': 'Signature Drawing Pad',
  'ล้างลายเซ็น': 'Clear Signature',
  'ใช้ลายเซ็นนี้': 'Use This Signature',

  // Common actions and states used throughout every module
  'เปิด': 'Open',
  'ปิด': 'Close',
  'เพิ่ม': 'Add',
  'แก้ไข': 'Edit',
  'บันทึก': 'Save',
  'กำลังบันทึก...': 'Saving...',
  'กำลังโหลด...': 'Loading...',
  'ไม่พบข้อมูลตามเงื่อนไขที่เลือก': 'No Data Matches the Selected Criteria',
  'เลือก': 'Select',
  'เลือกแล้ว': 'Selected',
  'ชื่อ': 'Name',
  'ประเภท': 'Type',
  'หัวข้อ': 'Subject',
  'ผลการค้นหา': 'Search Results',
  'เริ่มต้น': 'Start',
  'สิ้นสุด': 'End',
  'ก่อนหน้า': 'Previous',
  'ถัดไป': 'Next',
  'รีเฟรช': 'Refresh',
  'ตรวจสอบ': 'Review',
  'รับทราบ': 'Acknowledge',
  'ไม่พบรายการ': 'No Items Found',

  // Complete labels verified across staff-facing system screens
  'ครูอัตราจ้าง': 'Contract Teacher',
  'ครูผู้ช่วย': 'Assistant Teacher',
  'ข้าราชการครู': 'Government Teacher',
  'ระบบขออนุญาตไปราชการ (พิจารณา 2 ลำดับขั้น & ส่งต่อฝ่ายวิชาการ)': 'Official Duty Request (Two-Stage Approval & Academic Dispatch)',
  'เส้นทางเอกสาร: รอง ผอ. ตรวจสอบงบประมาณและเสนอความเห็น ➔ ผู้อำนวยการ ➔ ฝ่ายวิชาการจัดตารางสอนแทน': 'Workflow: Deputy Director reviews the budget and comments ➔ Director approves ➔ Academic Affairs arranges substitute teaching',
  'เส้นทางเอกสาร:': 'Workflow:',
  'รอง ผอ. ตรวจสอบงบประมาณและเสนอความเห็น ➔ ผู้อำนวยการ ➔ ฝ่ายวิชาการจัดตารางสอนแทน': 'Deputy Director reviews the budget and comments ➔ Director approves ➔ Academic Affairs arranges substitute teaching',
  'ยื่นขอไปราชการ': 'Submit Official Duty Request',
  'สายการอนุมัติและการแจกจ่ายเอกสารราชการ (MULTI-STAGE APPROVAL & ACADEMIC DISPATCH)': 'MULTI-STAGE APPROVAL & ACADEMIC DISPATCH',
  'สายการอนุมัติและการแจกจ่ายเอกสารราชการ (Multi-stage Approval & Academic Dispatch)': 'Multi-stage Approval & Academic Dispatch',
  'รองผู้อำนวยการ': 'Deputy Director',
  'ตรวจสอบงบประมาณ ความเหมาะสม และเสนอความเห็น': 'Review the budget, suitability and provide comments',
  'ผู้อำนวยการโรงเรียน': 'School Director',
  'พิจารณาลงนามอนุมัติขั้นสุดท้าย': 'Review and provide final approval',
  'ฝ่ายบริหารงานวิชาการ': 'Academic Affairs',
  'จัดตารางสอนแทนรายคาบอัตโนมัติ': 'Automatically arrange substitute teaching by period',
  'ตัวกรองคำขอ': 'Request Filters',
  'รอฉันพิจารณา / จัดการ': 'Awaiting My Review / Action',
  '🔔 รอฉันพิจารณา / จัดการ': '🔔 Awaiting My Review / Action',
  'ผู้ขอไปราชการ': 'Official Duty Requester',
  'หัวข้อราชการ / โครงการ': 'Official Assignment / Project',
  'วันที่เดินทาง': 'Travel Date',
  'ขั้นตอนปัจจุบัน': 'Current Stage',
  'การจัดสอนแทน': 'Substitute Arrangement',
  'ไม่พบรายการขอไปราชการ': 'No Official Duty Requests Found',
  'ระบบขอใช้รถและยานพาหนะโรงเรียน (Vehicle Booking & Fleet Dispatch)': 'School Vehicle Booking & Fleet Dispatch',
  'จัดสรรรถตู้ รถกระบะ และรถบัสส่วนกลาง': 'Allocate school vans, pickup trucks and buses',
  '+ ยื่นคำขอใช้รถยนต์': '+ Submit Vehicle Request',
  'คำขอใช้รถทั้งหมด': 'All Vehicle Requests',
  'รอการอนุมัติ / ตรวจสอบ': 'Awaiting Approval / Review',
  'ภารกิจที่อนุมัติแล้ว': 'Approved Trips',
  'ยานพาหนะพร้อมใช้งาน': 'Available Vehicles',
  'รายการคำขอทั้งหมด': 'All Requests',
  'ปฏิทินตารางการใช้รถ': 'Vehicle Schedule Calendar',
  'ยานพาหนะของโรงเรียน': 'School Vehicles',
  'งานพนักงานขับรถ': 'Driver Assignments',
  'ทุกสถานะ': 'All Statuses',
  'วัตถุประสงค์ & สถานที่': 'Purpose & Destination',
  'ผู้โดยสาร': 'Passengers',
  'ยานพาหนะ / คนขับ': 'Vehicle / Driver',
  'ยังไม่มีรายการคำขอใช้รถยนต์ในขณะนี้': 'There are no vehicle requests at this time',
  'กดปุ่ม + ยื่นคำขอใช้รถยนต์ ด้านบน เพื่อเริ่มต้นสร้างคำขอใหม่': 'Select + Submit Vehicle Request above to create a new request',
  'ระบบขอใช้อาคารสถานที่ (กำหนดผู้ดูแลรายบุคคล & ซิงก์ Google ปฏิทิน)': 'Facility Request System (Assigned Coordinators & Google Calendar Sync)',
  'ห้องประชุมราชพฤกษ์, ห้องประชุมรวงผึ้ง, ห้องประชุมโสตทัศนูปกรณ์ | เส้นทาง: ผู้ขอ ➔ รองฝ่ายทั่วไป ➔ ผู้ดูแลสถานที่/เครื่องเสียง ➔ แจ้งกลับผู้ขอ': 'Ratchaphruek Hall, Ruang Phueng Room and Audiovisual Room | Workflow: Requester ➔ General Affairs Deputy ➔ Facility / Sound Coordinator ➔ Requester Notification',
  'ขอใช้ห้องประชุม': 'Request a Meeting Room',
  'ห้องประชุมรวงผึ้ง': 'Ruang Phueng Meeting Room',
  'ห้องโสตทัศนศึกษา': 'Audiovisual Room',
  'หอประชุมราชพฤกษ์': 'Ratchaphruek Auditorium',
  'โรงอาหาร': 'Cafeteria',
  'ผู้ดูแลห้อง': 'Room Coordinator',
  'ยังไม่ได้อัปโหลดรูปภาพ': 'No Image Uploaded',
  'ตารางปฏิทินการใช้อาคารสถานที่ประจำเดือน': 'Monthly Facility Use Calendar',
  'เช็คคิวว่างเพื่อป้องกันเวลาจองชนกัน หรือคลิกดูรายละเอียดการประชุม': 'Check availability to avoid scheduling conflicts, or select an item to view meeting details',
  'เดือนก่อนหน้า': 'Previous Month',
  'เดือนถัดไป': 'Next Month',
  'ตัวกรองรายการขอใช้สถานที่': 'Facility Request Filters',
  'รอฉันอนุมัติ': 'Awaiting My Approval',
  'อนุมัติพร้อมใช้': 'Approved and Ready',
  'อาคาร/สถานที่ & ผู้ดูแล': 'Facility & Coordinator',
  'ผู้ขอ / กลุ่มงาน': 'Requester / Work Group',
  'วันและเวลา': 'Date and Time',
  'ผู้เข้าร่วม': 'Participants',
  'ไม่พบรายการขอใช้อาคารสถานที่ตามเงื่อนไข': 'No Facility Requests Match the Selected Filters',
  'ฟอร์มกระชับ กรอกง่าย ส่งตรงถึงผู้รับผิดชอบ 2 สายงาน (โสตทัศนูปกรณ์/ไอที และ อาคารสถานที่)': 'A simple form routed directly to two service teams: Audiovisual / IT and Facilities',
  'งานโสตฯ & ไอที': 'Audiovisual & IT',
  'อาคาร & ไฟฟ้า/ประปา': 'Facilities & Electrical / Plumbing',
  'รอรับแจ้ง': 'Awaiting Acceptance',
  'รหัสแจ้งซ่อม': 'Repair Ticket ID',
  'หมวดหมู่ & ผู้รับแจ้ง': 'Category & Receiving Officer',
  'ห้อง / สถานที่': 'Room / Location',
  'รูปถ่าย': 'Photo',
  'ไม่พบรายการแจ้งซ่อมตามเงื่อนไข': 'No Repair Tickets Match the Selected Filters',
  'เส้นทางการทำงาน: ผู้จัดตารางสอนแทน ➔ แจ้งครูผู้รับมอบหมายสอนแทนและรองผู้อำนวยการฝ่ายวิชาการทราบ': 'Workflow: Substitute Coordinator ➔ Notify the assigned substitute teacher and Academic Affairs Deputy Director',
  'ตัวกรอง': 'Filters',
  'รอฉันรับทราบ': 'Awaiting My Acknowledgement',
  'ฉันเป็นผู้สอนแทน': 'I Am the Substitute Teacher',
  'ปฏิเสธแล้ว': 'Declined',
  'ครูประจำวิชา (ฉันลา/ไปราชการ)': 'Original Teacher (My Leave / Official Duty)',
  'รายงานตามช่วงเวลา': 'Report by Date Range',
  'รายงานรายบุคคล PDF': 'Individual PDF Report',
  'วันที่ / คาบ': 'Date / Period',
  'ครูประจำวิชา (ผู้ลา/ไปราชการ)': 'Original Teacher (Leave / Official Duty)',
  'วิชา / ระดับชั้น': 'Subject / Grade Level',
  'ขั้นตอน': 'Stage',
  'ไม่พบรายการจัดสอนแทน': 'No Substitute Assignments Found',
  'Staff Portfolio & ว.PA': 'Staff Portfolio & Professional Performance Assessment',
  'รวบรวมรางวัล ผลงานบุคลากร ผลงานโรงเรียน ผลงานฝ่ายบริหาร การอบรม งานวิทยากร/ครูผู้ฝึกซ้อม และเกียรติบัตร ค้นหาและตรวจสอบย้อนหลังได้ง่าย': 'Collect personnel awards, school and administration achievements, training, coaching work and certificates for easy searching and review',
  'เลือกช่วงเวลา ประเภท กลุ่มงาน หรือรายชื่อบุคลากร': 'Filter by period, type, work group or personnel name',
  'กลับสู่ 1/2569': 'Return to Current Period',
  'ทุกกลุ่มสาระ/กลุ่มงาน': 'All Departments / Work Groups',
  'บุคลากรทุกคนในกลุ่ม': 'All Personnel in This Group',
  'เลือก “บันทึกผลงานใหม่” เพื่อเพิ่มข้อมูลและเอกสารประกอบ หรือเปลี่ยนตัวกรองเพื่อดูข้อมูลช่วงอื่น': 'Select “Add New Achievement” to add information and supporting documents, or change the filters to view another period',
  'คลังเก็บแผนการจัดการเรียนรู้ (ส่งฝ่ายบริหารงานวิชาการ)': 'Lesson Plan Repository (Submitted to Academic Affairs)',
  'สิทธิ์ฝ่ายวิชาการ/ผู้บริหาร: สามารถดูและดาวน์โหลดแผนการสอนของครูทุกคนในโรงเรียน': 'Academic Affairs / Management: May view and download every teacher’s lesson plans',
  'ส่งแผนการสอนเข้าคลัง': 'Submit Lesson Plan to Repository',
  'แผนการสอนทั้งหมดในคลัง': 'All Lesson Plans in Repository',
  'สถานะการจัดเก็บ': 'Repository Status',
  'ครบถ้วน': 'Complete',
  'แผนของทุกคน': 'All Teachers’ Plans',
  'แผนที่ฉันส่งเอง': 'Plans I Submitted',
  'รหัสแผน': 'Plan ID',
  'ครูผู้จัดทำ (กลุ่มสาระฯ)': 'Prepared by Teacher (Department)',
  'รายวิชา (รหัสวิชา)': 'Subject (Subject Code)',
  'ระดับชั้น / ภาคเรียน': 'Grade Level / Semester',
  'วันที่ส่งมอบ': 'Submission Date',
  'ไม่พบรายการแผนการสอนในคลัง': 'No Lesson Plans Found in the Repository',
  'ส่งต่อเอกสารตามลำดับ ลงนามในระบบ และจัดเก็บเป็นแฟ้มประวัติที่ตรวจสอบย้อนหลังได้': 'Route documents in order, sign online and retain a searchable audit history',
  'เอกสารใหม่บันทึกอัตโนมัติในภาคเรียน': 'New documents are filed automatically in semester',
  'เลือกปีการศึกษาเอกสาร': 'Select Document Academic Year',
  'เลือกภาคเรียนเอกสาร': 'Select Document Semester',
  'รายการที่ส่งถึงฉัน รวมทั้งงานรอคิวและประวัติที่ดำเนินการแล้ว': 'Documents sent to me, including queued work and completed history',
  'ติดตามสถานะไฟล์ที่ฉันเป็นผู้ส่งและตรวจสอบย้อนหลัง': 'Track documents I sent and review their history',
  'ยังไม่มีเอกสารที่ฉันอัปโหลด': 'I Have Not Uploaded Any Documents Yet',
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

const normalizedTranslations = new Map(
  Object.entries(translations).map(([thai, english]) => [thai.replace(/\s+/g, ' ').trim(), english]),
);

// Only these identity/context phrases are safe to replace inside a larger text
// node. Every other label is translated by exact match so Thai words are never
// partially replaced (for example “พิมพ์บันทึกข้อความ”).
const safeInlinePhrases = [
  'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
  'โรงเรียนมกุฎเมืองราชวิทยาลัย',
  'ระบบสารสนเทศบริหารงานโรงเรียน',
  'ศูนย์ข้อมูลข่าวสารและคำสั่งโรงเรียน',
  'ภาคเรียนที่',
  'รูปประจำตัว',
  'กลุ่มงาน',
  '🔔 รอฉันพิจารณา / จัดการ',
].sort((a, b) => b.length - a.length);

export const translateThaiText = (value: string): string => {
  const trimmed = value.trim();
  const exact = translations[trimmed];
  if (exact !== undefined) {
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${exact}${value.slice(start + trimmed.length)}`;
  }

  const normalized = trimmed.replace(/\s+/g, ' ');
  const normalizedExact = normalizedTranslations.get(normalized);
  if (normalizedExact !== undefined) {
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${normalizedExact}${value.slice(start + trimmed.length)}`;
  }

  // React often renders a changing number and its Thai unit in one text node.
  // Translate only strict UI count patterns so names and user-entered Thai data
  // are never modified.
  const countMatch = value.match(/^(\s*[\d./]+\s*)(รายการ|คน|ไฟล์|รายวิชา|วิชา|ทริป|คัน|วัน)(\s*)$/);
  if (countMatch) {
    const units: Record<string, string> = {
      'รายการ': 'Items', 'คน': 'People', 'ไฟล์': 'Files', 'รายวิชา': 'Subjects',
      'วิชา': 'Subjects', 'ทริป': 'Trips', 'คัน': 'Vehicles', 'วัน': 'Days',
    };
    return `${countMatch[1]}${units[countMatch[2]]}${countMatch[3]}`;
  }

  const semesterMatch = value.match(/^(\s*)ภาคเรียน(\s+[\d/]+.*)$/);
  if (semesterMatch) return `${semesterMatch[1]}Semester${semesterMatch[2]}`;

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
