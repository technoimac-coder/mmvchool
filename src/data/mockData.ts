import { realPersonnelData } from './realPersonnel';
import {
  User,
  LeaveRequest,
  Vehicle,
  VehicleBooking,
  MeetingRoom,
  RoomBooking,
  RepairTicket
} from '../types';

// Personnel and resource lists are operational master data, not sample transactions.
export const mockUsers: User[] = realPersonnelData;

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

// New installations start without sample transactions.
export const initialLeaveRequests: LeaveRequest[] = [];
export const initialVehicleBookings: VehicleBooking[] = [];
export const initialRoomBookings: RoomBooking[] = [];
export const initialRepairTickets: RepairTicket[] = [];
