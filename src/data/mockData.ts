import { realPersonnelData } from './realPersonnel';
import {
  User,
  LeaveRequest,
  OfficialDutyRequest,
  Vehicle,
  VehicleBooking,
  MeetingRoom,
  RoomBooking,
  RepairTicket,
  SubstituteTeaching,
  StaffPortfolio,
  LessonPlan,
  AppNotification,
  SchoolNews,
  SchoolOrder,
  SchoolEvent
} from '../types';

export const mockUsers: User[] = realPersonnelData;
const oldMockUsers: User[] = [
  {
    id: 'u1',
    name: 'ครูสมศรี มีสุข',
    position: 'ครูชำนาญการพิเศษ',
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    role: 'teacher',
    avatar: '👩‍🏫',
    email: 'somsri.m@school.ac.th',
    phone: '081-234-5678',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 2, personal: 1 },
    leaveCount: { sick: 1, personal: 1 }
  },
  {
    id: 'u2',
    name: 'ครูวิชัย ก้าวหน้า',
    position: 'ครูชำนาญการ',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    role: 'teacher',
    avatar: '👨‍🏫',
    email: 'wichai.k@school.ac.th',
    phone: '089-876-5432',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 0, personal: 2 },
    leaveCount: { sick: 0, personal: 1 }
  },
  {
    id: 'u3',
    name: 'นายสมศักดิ์ รักเรียน',
    position: 'ครู',
    department: 'กลุ่มสาระการเรียนรู้การงานอาชีพ',
    role: 'head',
    avatar: '👨‍💼',
    email: 'somsak.r@school.ac.th',
    phone: '086-111-2233',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 1, personal: 0 },
    leaveCount: { sick: 1, personal: 0 }
  },
  {
    id: 'u10',
    name: 'นายอรรถพล โสตพัฒนา',
    position: 'ครูอัตราจ้าง',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี (คอมพิวเตอร์)',
    role: 'head',
    avatar: '🖥️',
    email: 'attapol.it@school.ac.th',
    phone: '085-444-8899',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 0, personal: 0 },
    leaveCount: { sick: 0, personal: 0 }
  },
  {
    id: 'u8',
    name: 'นายชาญชัย วิชาการเด่น',
    position: 'ครูชำนาญการพิเศษ',
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    role: 'academic_affairs',
    avatar: '📚',
    email: 'chanchai.w@school.ac.th',
    phone: '087-777-3344',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 0, personal: 1 },
    leaveCount: { sick: 0, personal: 1 }
  },
  {
    id: 'u7',
    name: 'นางพิมพา บริหารดี',
    position: 'รองผู้อำนวยการสถานศึกษา',
    department: 'ฝ่ายบริหารงานบุคคล',
    role: 'deputy_personnel',
    avatar: '👩‍💼',
    email: 'pimpa.b@school.ac.th',
    phone: '082-999-1122',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 0, personal: 1 },
    leaveCount: { sick: 0, personal: 1 }
  },
  {
    id: 'u9',
    name: 'นายอนันต์ งบประมาณมั่นคง',
    position: 'รองผู้อำนวยการสถานศึกษา',
    department: 'ฝ่ายบริหารงบประมาณและแผนงาน',
    role: 'deputy_budget',
    avatar: '💼',
    email: 'anan.b@school.ac.th',
    phone: '081-333-4455',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 0, personal: 0 },
    leaveCount: { sick: 0, personal: 0 }
  },
  {
    id: 'u4',
    name: 'ดร.วิชาญ เกียรติวิทยา',
    position: 'ผู้อำนวยการสถานศึกษา',
    department: 'ฝ่ายบริหารงานทั่วไป',
    role: 'director',
    avatar: '🏛️',
    email: 'director@school.ac.th',
    phone: '081-999-8888',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 0, personal: 0 },
    leaveCount: { sick: 0, personal: 0 }
  },
  {
    id: 'u5',
    name: 'นายสุพจน์ ซ่อมสร้าง',
    position: 'พนักงานราชการ',
    department: 'ฝ่ายบริหารทั่วไป',
    role: 'technician',
    avatar: '👨‍🔧',
    email: 'supot.m@school.ac.th',
    phone: '084-555-6677',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 1, personal: 1 },
    leaveCount: { sick: 1, personal: 1 }
  },
  {
    id: 'u6',
    name: 'นายสมปอง ขับดี',
    position: 'พนักงานขับรถ',
    department: 'ฝ่ายยานพาหนะ',
    role: 'driver',
    avatar: '🚐',
    email: 'sompong.d@school.ac.th',
    phone: '083-444-3322',
    organization: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
    leaveQuota: { sick: 30, personal: 10 },
    leaveUsed: { sick: 0, personal: 1 },
    leaveCount: { sick: 0, personal: 1 }
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    name: 'รถตู้ Toyota Commuter',
    licensePlate: 'ขค 1456',
    type: 'van',
    capacity: 12,
    driverName: 'นายชาญวุฒน์ ต้องทำกิจ',
    driverPhone: '08-0181-1318',
    status: 'available'
  },
  {
    id: 'v2',
    name: 'รถตู้ Hyundai H-1',
    licensePlate: 'นข 7555',
    type: 'van',
    capacity: 11,
    driverName: 'นายนพรุจ ความเพียร',
    driverPhone: '08-1176-8105',
    status: 'available'
  },
  {
    id: 'v3',
    name: 'รถตู้ Toyota Commuter (สีเงิน)',
    licensePlate: 'นข 3399',
    type: 'van',
    capacity: 12,
    driverName: 'หมุนเวียน',
    driverPhone: '',
    status: 'available'
  }
];

export const mockMeetingRooms: MeetingRoom[] = [
  {
    id: 'room-1',
    name: 'ห้องประชุมราชพฤกษ์',
    location: 'อาคาร 1 ชั้น 2',
    capacity: '80 - 100 ท่าน',
    facilities: ['โปรเจกเตอร์ 4K', 'ระบบเสียงห้องประชุม', 'ระบบถ่ายทอดสด Zoom', 'ไมโครโฟนไร้สาย 4 ตัว'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=60',
    status: 'available',
    managerId: 'MMV03',
    managerName: 'นายไชยวัฒน์ บุญมี',
    managerPosition: 'รองผู้อำนวยการ ชำนาญการพิเศษ',
    managerIds: ['MMV03']
  },
  {
    id: 'room-2',
    name: 'ห้องโสตทัศนศึกษา',
    location: 'อาคาร 2 ชั้น 1',
    capacity: '40 - 50 ท่าน',
    facilities: ['Smart TV 75 นิ้ว', 'ระบบประชุมทางไกล', 'เครื่องปรับอากาศ 4 ทิศทาง'],
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=60',
    status: 'available',
    managerId: 'MMV10',
    managerName: 'นางสาวกาญจนา สมคิด',
    managerPosition: 'ครู',
    managerIds: ['MMV10']
  },
  {
    id: 'room-3',
    name: 'ห้องประชุมเกียรติยศ',
    location: 'อาคารอำนวยการ',
    capacity: '20 - 30 ท่าน',
    facilities: ['โต๊ะประชุม VIP รูปตัว U', 'ไมโครโฟนประจำที่นั่ง', 'จอ LED Display'],
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&auto=format&fit=crop&q=60',
    status: 'available',
    managerId: 'MMV01',
    managerName: 'นางสาวมณฑาทิพย์ เสาวคนธ์',
    managerPosition: 'ผู้อำนวยการ ชำนาญการพิเศษ',
    managerIds: ['MMV01']
  }
];

export const initialLeaveRequests: LeaveRequest[] = [];

export const initialOfficialDuties: OfficialDutyRequest[] = [
  {
    id: 'OD-2567-001',
    userId: 'u1',
    userName: 'ครูสมศรี มีสุข',
    userPosition: 'ครูชำนาญการพิเศษ (คณิตศาสตร์)',
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    title: 'นำนักเรียนเข้าร่วมการแข่งขันคณิตศาสตร์โอลิมปิกระดับภาคกลาง',
    location: 'มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน จ.นครปฐม',
    organizer: 'สมาคมคณิตศาสตร์แห่งประเทศไทยฯ และ สพฐ.',
    startDate: '2026-08-28',
    endDate: '2026-08-29',
    totalDays: 2,
    participants: ['ครูสมศรี มีสุข', 'ครูวิชัย ก้าวหน้า', 'นักเรียนตัวแทน 4 คน'],
    vehicleType: 'school_vehicle',
    budgetType: 'school_budget',
    budgetAmount: 4500,
    status: 'approved',
    currentStage: 'academic_substitute',
    adminReview: {
      approvedBy: 'นายสมศักดิ์ รักเรียน',
      approverRole: 'ผู้ดูแล/หัวหน้ากลุ่มสาระฯ',
      date: '2026-08-14',
      status: 'approved',
      comment: 'ตรวจสอบเอกสารโครงการและรายชื่อนักเรียนถูกต้องตามเกณฑ์'
    },
    deputyApproval: {
      approvedBy: 'นางพิมพา บริหารดี',
      approverRole: 'รองผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย',
      date: '2026-08-15',
      status: 'approved',
      comment: 'เห็นชอบในหลักการ เป็นประโยชน์ต่อการส่งเสริมนักเรียนสู่ความเป็นเลิศ'
    },
    directorApproval: {
      approvedBy: 'ดร.วิชาญ เกียรติวิทยา',
      approverRole: 'ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย',
      date: '2026-08-15',
      status: 'approved',
      comment: 'อนุมัติ ให้เบิกจ่ายตามระเบียบ ส่งต่อไปยังฝ่ายวิชาการเพื่อจัดตารางสอนแทน'
    },
    forwardedToAcademic: true,
    substituteScheduled: false,
    createdAt: '2026-08-14'
  },
  {
    id: 'OD-2567-002',
    userId: 'u2',
    userName: 'ครูวิชัย ก้าวหน้า',
    userPosition: 'ครูชำนาญการ (วิทยาศาสตร์)',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    title: 'เข้ารับการอบรมเชิงปฏิบัติการ การประยุกต์ใช้ AI ในการจัดการเรียนรู้สะเต็มศึกษา (STEM+AI)',
    location: 'โรงแรมเซ็นทารา แกรนด์ ลาดพร้าว กรุงเทพฯ',
    organizer: 'สถาบันส่งเสริมการสอนวิทยาศาสตร์และเทคโนโลยี (สสวท.)',
    startDate: '2026-09-05',
    endDate: '2026-09-06',
    totalDays: 2,
    participants: ['ครูวิชัย ก้าวหน้า'],
    vehicleType: 'public_transport',
    budgetType: 'organizer_budget',
    budgetAmount: 0,
    status: 'pending',
    currentStage: 'deputy_approval',
    adminReview: {
      approvedBy: 'นายสมศักดิ์ รักเรียน',
      approverRole: 'ผู้ดูแล/งานสารบรรณบุคคล',
      date: '2026-08-17',
      status: 'approved',
      comment: 'เอกสารหนังสือเชิญจาก สสวท. แนบครบถ้วน'
    },
    forwardedToAcademic: false,
    substituteScheduled: false,
    createdAt: '2026-08-16'
  }
];

export const initialVehicleBookings: VehicleBooking[] = [];

export const initialRoomBookings: RoomBooking[] = [];

export const initialRepairTickets: RepairTicket[] = [];

export const initialSubstituteLessons: SubstituteTeaching[] = [
  {
    id: 'SUB-2567-001',
    leaveRequestId: 'LR-2567-001',
    originalTeacherId: 'u1',
    originalTeacherName: 'ครูสมศรี มีสุข',
    substituteTeacherId: 'u2',
    substituteTeacherName: 'ครูวิชัย ก้าวหน้า',
    date: '2026-08-20',
    period: 3,
    time: '10:10 - 11:00',
    gradeLevel: 'ม.2/1',
    subjectCode: 'ค22101',
    subjectName: 'คณิตศาสตร์พื้นฐาน 3',
    status: 'completed',
    stage: 'acknowledged',
    acknowledgedAt: '2026-08-18 09:00',
    leaveReason: 'ลาป่วยรักษาตัวไข้หวัดใหญ่',
    createdAt: '2026-08-17'
  },
  {
    id: 'SUB-2567-002',
    officialDutyId: 'OD-2567-001',
    originalTeacherId: 'u1',
    originalTeacherName: 'ครูสมศรี มีสุข',
    substituteTeacherId: 'u3',
    substituteTeacherName: 'นายสมศักดิ์ รักเรียน',
    date: '2026-08-28',
    period: 4,
    time: '11:00 - 11:50',
    gradeLevel: 'ม.5/2',
    subjectCode: 'ค32201',
    subjectName: 'คณิตศาสตร์เพิ่มเติม 3',
    status: 'pending',
    stage: 'pending_ack',
    leaveReason: 'ไปราชการพานักเรียนแข่งขันคณิตศาสตร์โอลิมปิก',
    createdAt: '2026-08-17'
  }
];

export const initialStaffPortfolios: StaffPortfolio[] = [
  {
    id: 'PF-2567-001',
    userId: 'u1',
    userName: 'ครูสมศรี มีสุข',
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    title: 'รางวัลครูผู้สอนดีเด่นกลุ่มสาระการเรียนรู้คณิตศาสตร์ ระดับเขตพื้นที่การศึกษา (สพม.)',
    category: 'teaching_award',
    awardLevel: 'district',
    academicYear: '2567',
    dateReceived: '2026-01-16',
    organizer: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา',
    description: 'ได้รับคัดเลือกเป็นครูผู้สอนยอดเยี่ยมเนื่องในวันครูแห่งชาติ ประจำปี 2567 จากผลงานการพัฒนานวัตกรรมการจัดการเรียนรู้คณิตศาสตร์เชิงรุก (Active Learning)',
    status: 'approved',
    createdAt: '2026-02-01'
  },
  {
    id: 'PF-2567-002',
    userId: 'u1',
    userName: 'ครูสมศรี มีสุข',
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    title: 'การอบรมเชิงลึก: การจัดการเรียนรู้แบบบูรณาการสะเต็มศึกษาและการประเมินสมรรถนะตามแนวทาง PISA',
    category: 'training_plc',
    awardLevel: 'national',
    academicYear: '2567',
    dateReceived: '2026-05-12',
    organizer: 'สสวท. ร่วมกับ จุฬาลงกรณ์มหาวิทยาลัย',
    hoursPLC: 24,
    description: 'ผ่านหลักสูตรพัฒนาศักยภาพครูด้านการสร้างข้อสอบและกิจกรรมการเรียนรู้แบบสมรรถนะ 24 ชั่วโมง พร้อมนำมาขยายผลในชุมชนแห่งการเรียนรู้ทางวิชาชีพ (PLC)',
    status: 'approved',
    createdAt: '2026-05-15'
  }
];

export const initialLessonPlans: LessonPlan[] = [
  {
    id: 'LP-2567-001',
    userId: 'u1',
    userName: 'ครูสมศรี มีสุข',
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    title: 'แผนการจัดการเรียนรู้รายวิชาคณิตศาสตร์พื้นฐาน 3 (ค22101) หน่วยที่ 2 พหุนามและการแยกตัวประกอบ',
    subjectCode: 'ค22101',
    subjectName: 'คณิตศาสตร์พื้นฐาน 3',
    gradeLevel: 'มัธยมศึกษาปีที่ 2',
    semester: '1',
    academicYear: '2567',
    unitCount: 4,
    totalHours: 20,
    fileUrl: '#',
    fileName: 'แผนการจัดการเรียนรู้_ค22101_หน่วยที่2_สมศรี.pdf',
    fileSize: '3.4 MB',
    status: 'approved',
    score: 95,
    reviewerName: 'นายชาญชัย วิชาการเด่น (ฝ่ายวิชาการ)',
    reviewComment: 'แผนการจัดการเรียนรู้มีความละเอียด มีการจัดกิจกรรมแบบ Active Learning ครบถ้วนตามตัวชี้วัดและมาตรฐานหลักสูตรแกนกลางฯ มีเกณฑ์การวัดผลชัดเจน',
    reviewedAt: '2026-08-10',
    createdAt: '2026-08-01'
  },
  {
    id: 'LP-2567-002',
    userId: 'u2',
    userName: 'ครูวิชัย ก้าวหน้า',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    title: 'แผนการจัดการเรียนรู้วิทยาการคำนวณและปัญญาประดิษฐ์เบื้องต้น (ว31103) ภาคเรียนที่ 1',
    subjectCode: 'ว31103',
    subjectName: 'วิทยาการคำนวณ 1',
    gradeLevel: 'มัธยมศึกษาปีที่ 4',
    semester: '1',
    academicYear: '2567',
    unitCount: 3,
    totalHours: 16,
    fileUrl: '#',
    fileName: 'LessonPlan_CS_M4_Wichai.pdf',
    fileSize: '4.8 MB',
    status: 'pending',
    createdAt: '2026-08-14'
  }
];

export const initialNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'มีรายการรอพิจารณาในระบบ',
    message: 'มีคำขอใบลาและคำขอใช้รถส่วนกลางรอการตรวจสอบและจัดสรรในระบบ',
    module: 'leave',
    timestamp: '2026-08-19 08:30',
    read: false
  }
];


export const mockSchoolNews: SchoolNews[] = [
  {
    id: 'news-1',
    title: 'ประกาศผลการคัดเลือกนวัตกรรมการจัดการเรียนรู้เชิงรุก (Active Learning) ระดับโรงเรียน ประจำปี 2567',
    content: 'ขอแสดงความยินดีกับคณะครูที่ผ่านการประเมินนวัตกรรมการสอนยอดเยี่ยม เพื่อเป็นตัวแทนโรงเรียนมกุฎเมืองราชวิทยาลัย เข้าร่วมการประกวดระดับเขตพื้นที่การศึกษา สพม.ชลบุรี ระยอง',
    category: 'academic',
    author: 'กลุ่มบริหารงานวิชาการ',
    department: 'ฝ่ายวิชาการ',
    date: '2026-08-19',
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
    isPinned: true,
    viewCount: 142
  },
  {
    id: 'news-2',
    title: 'กำหนดการประชุมคณะครูและบุคลากรทางการศึกษา ประจำเดือนสิงหาคม 2567',
    content: 'ขอเชิญคณะครูและบุคลากรทุกท่านเข้าร่วมการประชุมประจำเดือน ณ ห้องประชุมราชพฤกษ์ ในวันศุกร์ที่ 28 ส.ค. 2567 เวลา 13.00 น. เพื่อรับฟังนโยบายการเตรียมความพร้อมการประเมินคุณภาพภายนอก',
    category: 'general',
    author: 'ฝ่ายบริหารงานทั่วไป',
    department: 'งานสารบรรณ',
    date: '2026-08-18',
    imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=60',
    isPinned: true,
    viewCount: 285
  },
  {
    id: 'news-3',
    title: 'แนวปฏิบัติการส่งแผนการจัดการเรียนรู้และการประเมินวิทยฐานะ ว.PA ประจำปีงบประมาณ 2567',
    content: 'แจ้งคุณครูทุกกลุ่มสาระการเรียนรู้ ดำเนินการอัปโหลดไฟล์แผนการจัดการเรียนรู้ ภาคเรียนที่ 1 เข้าสู่ระบบคลังแผนการสอนของโรงเรียน ภายในวันที่ 31 สิงหาคม 2567',
    category: 'personnel',
    author: 'นายชาญชัย วิชาการเด่น',
    department: 'กลุ่มบริหารงานวิชาการ',
    date: '2026-08-16',
    viewCount: 198
  }
];

export const mockSchoolOrders: SchoolOrder[] = [
  {
    id: 'ord-1',
    orderNumber: 'คำสั่งที่ 184/2567',
    title: 'แต่งตั้งคณะกรรมการดำเนินงานจัดกิจกรรมสัปดาห์วิทยาศาสตร์และคณิตศาสตร์ ประจำปีการศึกษา 2567',
    category: 'academic',
    signDate: '2026-08-15',
    signedBy: 'ดร.วิชาญ เกียรติวิทยา (ผู้อำนวยการโรงเรียน)',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    fileUrl: '#',
    fileName: 'คำสั่งที่_184_2567_สัปดาห์วิทย์.pdf',
    fileSize: '1.8 MB'
  },
  {
    id: 'ord-2',
    orderNumber: 'คำสั่งที่ 183/2567',
    title: 'แต่งตั้งคณะกรรมการตรวจรับพัสดุและควบคุมงานปรับปรุงอาคารเรียน 3 และห้องปฏิบัติการคอมพิวเตอร์',
    category: 'budget',
    signDate: '2026-08-12',
    signedBy: 'ดร.วิชาญ เกียรติวิทยา (ผู้อำนวยการโรงเรียน)',
    department: 'ฝ่ายบริหารงบประมาณและแผนงาน',
    fileUrl: '#',
    fileName: 'คำสั่งที่_183_2567_ตรวจรับพัสดุ.pdf',
    fileSize: '2.4 MB'
  },
  {
    id: 'ord-3',
    orderNumber: 'คำสั่งที่ 180/2567',
    title: 'มอบหมายหน้าที่การปฏิบัติงานเวรยามรักษาความปลอดภัยสถานที่ราชการ ประจำเดือนกันยายน 2567',
    category: 'committee',
    signDate: '2026-08-10',
    signedBy: 'ดร.วิชาญ เกียรติวิทยา (ผู้อำนวยการโรงเรียน)',
    department: 'ฝ่ายบริหารงานทั่วไป',
    fileUrl: '#',
    fileName: 'คำสั่งที่_180_2567_เวรยามกันยายน.pdf',
    fileSize: '3.1 MB'
  },
  {
    id: 'ord-4',
    orderNumber: 'คำสั่งที่ 176/2567',
    title: 'แต่งตั้งคณะกรรมการนิเทศ กำกับ ติดตามการจัดการเรียนรู้เชิงรุก (Active Learning) ภาคเรียนที่ 1/2567',
    category: 'academic',
    signDate: '2026-08-01',
    signedBy: 'ดร.วิชาญ เกียรติวิทยา (ผู้อำนวยการโรงเรียน)',
    department: 'กลุ่มบริหารงานวิชาการ',
    fileUrl: '#',
    fileName: 'คำสั่งที่_176_2567_นิเทศการสอน.pdf',
    fileSize: '2.0 MB'
  }
];

export const mockSchoolEvents: SchoolEvent[] = [
  {
    id: 'evt-1',
    title: 'การประชุมคณะกรรมการสถานศึกษาขั้นพื้นฐาน',
    date: '2026-08-24',
    time: '09:00 - 12:00 น.',
    location: 'ห้องประชุมราชพฤกษ์',
    type: 'meeting',
    organizer: 'ฝ่ายบริหารงานทั่วไป'
  },
  {
    id: 'evt-2',
    title: 'อบรมเชิงปฏิบัติการพัฒนาข้อสอบมาตรฐาน PISA',
    date: '2026-08-26',
    time: '13:00 - 16:30 น.',
    location: 'ห้องประชุมรวงผึ้ง',
    type: 'academic',
    organizer: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์'
  },
  {
    id: 'evt-3',
    title: 'กำหนดส่งแผนการจัดการเรียนรู้ ภาคเรียนที่ 1',
    date: '2026-08-31',
    time: 'ภายใน 16.30 น.',
    location: 'ระบบคลังแผนการสอนออนไลน์',
    type: 'academic',
    organizer: 'ฝ่ายวิชาการ'
  }
];
