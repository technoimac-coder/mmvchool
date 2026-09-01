export type Role = 'teacher' | 'head' | 'deputy_personnel' | 'deputy_budget' | 'deputy_general' | 'director' | 'academic_affairs' | 'technician' | 'driver' | 'admin';

export interface UserAssignment {
  group?: string;       // กลุ่มงานใหญ่ เช่น กลุ่มบริหารวิชาการ, กลุ่มบริหารงานบุคคล, กลุ่มบริหารงานทั่วไป, กลุ่มบริหารงบประมาณ
  role: string;        // หน้าที่ที่ได้รับมอบหมาย
  duty?: string;       // ชื่องานที่ได้รับมอบหมาย
  description?: string; // คำอธิบายขอบเขตงาน
  orderNo?: string;     // คำสั่งอ้างอิง
  orderRef?: string;
}

export interface User {
  id: string;
  name: string;
  prefix?: string;
  position: string;
  academicPosition?: string;
  department: string;
  role: Role;
  avatar: string;
  photoUrl?: string;
  assignments?: UserAssignment[];
  email: string;
  phone: string;
  organization: string;
  signatureUrl?: string;
  citizenId?: string;
  password?: string;
  mustChangePassword?: boolean;
  personnelType?: string;
  status?: string;
  leaveQuota: {
    sick: number;
    personal: number;
  };
  leaveUsed: {
    sick: number;
    personal: number;
    maternity?: number;
  };
  leaveCount: {
    sick: number;
    personal: number;
    maternity?: number;
  };
}

export type LeaveType = 'personal' | 'sick' | 'maternity' | 'other';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
export type ApprovalStage = 'admin_review' | 'deputy_approval' | 'director_approval' | 'academic_substitute' | 'completed' | 'rejected';

export interface ApprovalStep {
  approvedBy: string;
  approverRole: string;
  date: string;
  comment?: string;
  status: 'approved' | 'rejected';
  signatureUrl?: string;
}

export interface LastLeaveRecord {
  hasHistory: boolean;
  type?: LeaveType;
  startDate?: string;
  endDate?: string;
  days?: number;
}

export interface LeaveTypeSummary {
  pastCount: number;
  pastDays: number;
  currentCount: number;
  currentDays: number;
  totalCount: number;
  totalDays: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userPosition: string;
  department: string;
  organization: string;
  writtenAt: string;
  leaveType: LeaveType;
  otherLeaveDetails?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  contactAddress?: string;
  contactPhone?: string;
  attachments?: Array<{ type: string; name: string; dataUrl: string }>;
  lastLeave?: LastLeaveRecord;
  leaveStats?: {
    pastCount: number;
    pastDays: number;
    currentDays: number;
    totalDays: number;
  };
  leaveSummary?: {
    sick: LeaveTypeSummary;
    personal: LeaveTypeSummary;
    maternity: LeaveTypeSummary;
  };
  substituteTeacherId?: string;
  substituteTeacherName?: string;
  signatureUrl?: string;
  status: RequestStatus;
  currentStage: ApprovalStage;
  adminReview?: ApprovalStep;
  deputyApproval?: ApprovalStep;
  directorApproval?: ApprovalStep;
  forwardedToAcademic?: boolean;
  substituteScheduled?: boolean;
  createdAt: string;
  academicYear?: string;
  semester?: '1' | '2';
}

export interface OfficialDutyRequest {
  id: string;
  userId: string;
  userName: string;
  userPosition: string;
  department: string;
  title: string;
  location: string;
  organizer: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  participants: string[];
  vehicleType: 'school_vehicle' | 'public_transport' | 'personal_car';
  vehicleId?: string;
  vehicleName?: string;
  licensePlate?: string;
  driverName?: string;
  supervisorName?: string;
  personalLicensePlate?: string;
  budgetType: 'school_budget' | 'organizer_budget' | 'none';
  budgetAmount: number;
  budgetCustomText?: string;
  signatureUrl?: string;
  attachments?: Array<{ type: string; name: string; dataUrl: string }>;
  status: RequestStatus;
  currentStage: ApprovalStage;
  adminReview?: ApprovalStep;
  deputyApproval?: ApprovalStep;
  directorApproval?: ApprovalStep;
  forwardedToAcademic: boolean;
  substituteScheduled: boolean;
  createdAt: string;
  academicYear?: string;
  semester?: '1' | '2';
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  status: 'available' | 'maintenance' | 'in_use';
  province?: string;
  model?: string;
  driverId?: string;
}

export type VehicleBookingStage = 
  | 'admin_review'
  | 'deputy_budget_allocation'
  | 'driver_ack'
  | 'completed'
  | 'rejected';

export interface VehicleBooking {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  department: string;
  destination: string;
  purpose: string;
  passengerCount: number;
  approvalLetterNo?: string;
  teachersList?: string[];
  studentsList?: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  vehicleId?: string;
  vehicleName?: string;
  licensePlate?: string;
  isExternalRental?: boolean;
  rentalDetails?: string;
  rentalCost?: number;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  bookingStage: VehicleBookingStage;
  status: RequestStatus;
  adminReview?: {
    approvedBy: string;
    date: string;
    comment?: string;
  };
  deputyAllocation?: {
    approvedBy: string;
    date: string;
    comment?: string;
    isRental: boolean;
    allocatedVehicle: string;
    allocatedDriver: string;
  };
  driverAck?: {
    driverName: string;
    date: string;
    comment?: string;
  };
  createdAt: string;
  academicYear?: string;
  semester?: '1' | '2';
}

export interface MeetingRoom {
  id: string;
  name: string;
  location: string;
  capacity: number | string;
  facilities: string[];
  image: string;
  status: 'available' | 'maintenance';
  managerId?: string;
  managerName?: string;
  managerPosition?: string;
  managerIds?: string[];
}

export type RoomBookingStage = 'pending_deputy' | 'pending_manager' | 'approved_ready' | 'completed' | 'rejected';

export interface RoomBooking {
  id: string;
  userId: string;
  userName: string;
  department: string;
  userPhone?: string;
  roomId: string;
  roomName: string;
  title: string;
  attendeeCount: number;
  date: string;
  startTime: string;
  endTime: string;
  layoutStyle: 'theater' | 'classroom' | 'u_shape' | 'boardroom';
  equipmentRequired: string[];
  snackRequired: boolean;
  snackDetails?: string;
  
  bookingStage: RoomBookingStage;
  status: RequestStatus;
  deputyReview?: {
    approvedBy: string;
    date: string;
    comment?: string;
  };
  managerReview?: {
    approvedBy: string;
    date: string;
    comment?: string;
  };
  completedAt?: string;
  createdAt: string;
  academicYear?: string;
  semester?: '1' | '2';
}

export type RepairCategory = 'building' | 'electricity' | 'plumbing' | 'computer_network' | 'audio_visual' | 'furniture' | 'other';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type RepairStage = 
  | 'reported'                  // 1. ผู้แจ้งส่งเรื่อง
  | 'head_acknowledged'        // 2. หัวหน้างานอาคารสถานที่รับแจ้ง & มอบหมายช่าง
  | 'repaired_pending_confirm' // 3. ช่างบันทึกผลการซ่อม
  | 'user_confirmed'           // 4. ผู้แจ้งกดยืนยันตรวจรับงาน
  | 'rejected';

export interface RepairTicket {
  id: string;
  userId: string;
  userName: string;
  department: string;
  userPhone?: string;
  category: RepairCategory;
  title: string;
  description: string;
  
  // Specific location fields
  building: string;     // อาคาร
  floor: string;        // ชั้น
  roomNumber: string;   // เลขที่ห้องเรียน
  location: string;     // สรุปรวม เช่น อาคาร 3 ชั้น 2 ห้อง 324
  photoUrl?: string;    // รูปถ่ายจุดที่ชำรุด
  
  urgency: UrgencyLevel;
  repairStage: RepairStage;
  status: RequestStatus;

  assignedTechnicianId?: string;
  assignedTechnician?: string;

  headReview?: {
    approvedBy: string;
    date: string;
    assignedTechnicianName: string;
    comment?: string;
  };
  technicianReport?: {
    technicianName: string;
    date: string;
    repairDetails: string;
    repairPhotoUrl?: string;
  };
  userConfirmation?: {
    confirmedBy: string;
    date: string;
    rating?: number;
    comment?: string;
  };

  repairNotes?: string;
  completedAt?: string;
  createdAt: string;
  academicYear?: string;
  semester?: '1' | '2';
}

export type SubstituteStage = 
  | 'pending_ack'     // 1. จัดสอนแทนแล้ว -> รอครูผู้รับสอนแทนรับทราบ
  | 'acknowledged';   // 2. ครูผู้รับสอนแทนรับทราบแล้ว (แจ้งฝ่ายวิชาการ)

export interface SubstituteTeaching {
  id: string;
  officialDutyId?: string;
  leaveRequestId?: string;
  originalTeacherId: string;
  originalTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  date: string;
  period: number;
  time: string;
  gradeLevel: string;
  subjectCode: string;
  subjectName: string;
  assignedWork?: string;
  status: 'pending' | 'confirmed' | 'completed';
  stage: SubstituteStage;
  acknowledgedAt?: string;
  leaveReason?: string;
  createdAt: string;
  academicYear?: string;
  semester?: '1' | '2';
}

export type PortfolioCategory = 'award' | 'training' | 'work' | 'certificate';

export interface PortfolioAttachment {
  name: string;
  url: string;
  type: 'image' | 'document';
  mimeType: string;
  size: number;
}

export interface StaffPortfolio {
  id: string;
  userId: string;
  userName: string;
  department: string;
  title: string;
  category: PortfolioCategory;
  semester: '1' | '2';
  academicYear: string;
  dateReceived: string;
  organizer: string;
  description: string;
  attachments: PortfolioAttachment[];
  status: 'approved' | 'pending';
  createdAt: string;
}

export interface LessonPlan {
  id: string;
  userId: string;
  userName: string;
  department: string;
  title?: string;
  subjectCode: string;
  subjectName: string;
  gradeLevel: string;
  semester: '1' | '2';
  academicYear: string;
  unitCount?: number;
  totalHours?: number;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  status: 'pending' | 'approved' | 'needs_revision';
  score?: number;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
    module: 'leave' | 'official_duty' | 'vehicle' | 'room' | 'repair' | 'substitute' | 'portfolio' | 'lesson_plan';
    relatedId?: string;
    targetUserId?: string;
  timestamp: string;
  read: boolean;
}


export interface SchoolNews {
  id: string;
  title: string;
  content: string;
  category: 'academic' | 'general' | 'personnel' | 'activity' | 'urgent';
  author: string;
  department: string;
  date: string;
  imageUrl?: string;
  isPinned?: boolean;
  viewCount?: number;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface SchoolOrder {
  id: string;
  orderNumber: string; // เช่น คำสั่งที่ 145/2567
  title: string;
  category: 'academic_administration' | 'personnel_administration' | 'budget_administration' | 'general_administration' | 'executive_office' | 'english_program';
  signDate: string;
  signedBy: string; // ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย
  department: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  type: 'meeting' | 'academic' | 'holiday' | 'activity';
  organizer: string;
}
