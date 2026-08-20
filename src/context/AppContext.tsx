'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
import {
  mockUsers,
  mockVehicles,
  mockMeetingRooms,
  initialLeaveRequests,
  initialVehicleBookings,
  initialRoomBookings,
  initialRepairTickets
} from '../data/mockData';
import { ApiError, roomsApi } from '../lib/api';
import { LEAVE_APPROVER_BY_STAGE, OFFICIAL_DUTY_APPROVER_BY_STAGE } from '../config/approvalWorkflow';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  updateUser: (user: User) => void;
  setUsersList: (users: User[]) => void;
  
  // 1. Leave
  leaveRequests: LeaveRequest[];
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status' | 'currentStage' | 'createdAt'>) => void;
  reviewLeaveByAdmin: (id: string, comment?: string, signatureUrl?: string) => void;
  approveLeaveByDeputy: (id: string, comment?: string, signatureUrl?: string) => void;
  approveLeaveByDirector: (id: string, comment?: string, signatureUrl?: string) => void;
  rejectLeaveAtStage: (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string) => void;

  // 2. Official Duty
  officialDuties: OfficialDutyRequest[];
  addOfficialDuty: (req: Omit<OfficialDutyRequest, 'id' | 'status' | 'currentStage' | 'forwardedToAcademic' | 'substituteScheduled' | 'createdAt'>) => void;
  reviewOfficialDutyByAdmin: (id: string, comment?: string, signatureUrl?: string) => void;
  approveOfficialDutyByDeputy: (id: string, comment?: string, signatureUrl?: string) => void;
  approveOfficialDutyByDirector: (id: string, comment?: string, signatureUrl?: string) => void;
  rejectOfficialDutyAtStage: (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string) => void;

  // 3. Vehicles & Workflow
  vehicles: Vehicle[];
  vehicleBookings: VehicleBooking[];
  addVehicleBooking: (booking: Omit<VehicleBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => void;
  reviewVehicleByAdmin: (id: string, comment?: string) => void;
  allocateVehicleByDeputyBudget: (id: string, payload: {
    isRental: boolean;
    vehicleId?: string;
    rentalDetails?: string;
    rentalCost?: number;
    driverId?: string;
    comment?: string;
  }) => void;
  acknowledgeByDriver: (id: string, comment?: string) => void;
  rejectVehicleBooking: (id: string, stage: 'admin' | 'deputy' | 'driver', comment?: string) => void;

  // 4. Meeting Rooms (ผู้ขอ ➔ ผู้ดูแลห้องอนุมัติ ➔ จบการใช้ห้อง)
  rooms: MeetingRoom[];
  updateRoomManager: (roomId: string, managerId: string) => Promise<void>;
  roomBookings: RoomBooking[];
  addRoomBooking: (booking: Omit<RoomBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => Promise<boolean>;
  approveRoomBookingByManager: (id: string, comment?: string) => Promise<boolean>;
  completeRoomUsage: (id: string) => Promise<boolean>;
  rejectRoomBooking: (id: string, comment?: string) => Promise<boolean>;

  // 5. Repairs (ผู้แจ้ง ➔ หัวหน้างานอาคารสถานที่รับแจ้งมอบหมายช่าง ➔ ช่างบันทึกผล ➔ ผู้แจ้งกดยืนยัน)
  repairTickets: RepairTicket[];
  addRepairTicket: (ticket: Omit<RepairTicket, 'id' | 'repairStage' | 'status' | 'createdAt'>) => void;
  acknowledgeAndAssignRepair: (id: string, payload: { technicianId: string; technicianName: string; comment?: string }) => void;
  submitRepairReportByTechnician: (id: string, payload: { repairDetails: string; partsUsed?: string; cost?: number }) => void;
  confirmRepairByUser: (id: string, payload: { rating?: number; comment?: string }) => void;
  rejectRepair: (id: string, comment?: string) => void;

  // 6. Substitute (จัดสอนแทน ➔ ครูสอนแทนกดรับทราบ ➔ แจ้ง รอง ผอ.วิชาการ)
  substituteLessons: SubstituteTeaching[];
  addSubstituteLesson: (lesson: Omit<SubstituteTeaching, 'id' | 'createdAt' | 'stage'>) => void;
  acknowledgeSubstitute: (id: string) => void;

  // 7. Portfolio
  portfolios: StaffPortfolio[];
  addPortfolio: (item: Omit<StaffPortfolio, 'id' | 'createdAt' | 'status'>) => void;

  // 8. Lesson Plans
  lessonPlans: LessonPlan[];
  addLessonPlan: (plan: Omit<LessonPlan, 'id' | 'createdAt' | 'status'>) => void;
  reviewLessonPlan: (id: string, status: LessonPlan['status'], score?: number, comment?: string) => void;

  // 9. News, Orders & Events
  schoolNews: SchoolNews[];
  addSchoolNews: (news: Omit<SchoolNews, 'id' | 'date'>) => void;
  schoolOrders: SchoolOrder[];
  addSchoolOrder: (order: Omit<SchoolOrder, 'id'>) => void;
  schoolEvents: SchoolEvent[];
  addSchoolEvent: (event: Omit<SchoolEvent, 'id'>) => void;

  // Global & Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], title?: string) => void;
  removeToast: (id: string) => void;
  pendingApprovalsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const sanitizeClientUser = (user: User): User => {
  const sanitized = { ...user };
  delete sanitized.citizenId;
  delete sanitized.password;
  return sanitized;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_school_users');
      if (saved) {
        try {
          const sanitized = (JSON.parse(saved) as User[]).map(sanitizeClientUser);
          localStorage.setItem('mmv_school_users', JSON.stringify(sanitized));
          return sanitized;
        } catch (error) { console.error(error); }
      }
    }
    return mockUsers;
  });

  const updateUser = (updatedUser: User) => {
    const safeUpdatedUser = sanitizeClientUser(updatedUser);
    setUsers(prev => {
      const next = prev.map(u => u.id === safeUpdatedUser.id ? safeUpdatedUser : u);
      if (!prev.some(u => u.id === safeUpdatedUser.id)) {
        next.push(safeUpdatedUser);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('mmv_school_users', JSON.stringify(next));
      }
      return next;
    });
  };

  const setUsersList = (newUsers: User[]) => {
    const safeUsers = newUsers.map(sanitizeClientUser);
    setUsers(safeUsers);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mmv_school_users', JSON.stringify(safeUsers));
    }
  };
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success', title?: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [officialDuties, setOfficialDuties] = useState<OfficialDutyRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_vehicles');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return mockVehicles;
  });
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>(initialVehicleBookings);
  const [rooms, setRooms] = useState<MeetingRoom[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_rooms');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return mockMeetingRooms;
  });

  const updateRoomManager = async (roomId: string, managerId: string) => {
    const manager = users.find(u => u.id === managerId);
    if (!manager) return;
    try {
      await roomsApi.updateManager(roomId, managerId);
      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          return {
            ...r,
            managerId: manager.id,
            managerName: manager.name,
            managerPosition: manager.position,
            managerIds: [manager.id]
          };
        }
        return r;
      }));
      addToast(`กำหนดผู้ดูแลห้องประชุมเรียบร้อยแล้ว`, 'success');
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถกำหนดผู้ดูแลห้องได้', 'error');
    }
  };
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(initialRoomBookings);

  useEffect(() => {
    let cancelled = false;
    Promise.all([roomsApi.listRooms(), roomsApi.listBookings()])
      .then(([serverRooms, serverBookings]) => {
        if (!cancelled) {
          setRooms(serverRooms);
          setRoomBookings(serverBookings);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) {
          addToast(error.message, 'error');
        }
      });
    return () => { cancelled = true; };
  }, [addToast, currentUser]);
  const [repairTickets, setRepairTickets] = useState<RepairTicket[]>(initialRepairTickets);
  const [substituteLessons, setSubstituteLessons] = useState<SubstituteTeaching[]>([]);
  const [portfolios, setPortfolios] = useState<StaffPortfolio[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [schoolNews, setSchoolNews] = useState<SchoolNews[]>([]);
  const [schoolOrders, setSchoolOrders] = useState<SchoolOrder[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);

  const addSchoolNews = (news: Omit<SchoolNews, 'id' | 'date'>) => {
    const newId = `news-${crypto.randomUUID()}`;
    const today = new Date().toISOString().split('T')[0];
    const item: SchoolNews = { ...news, id: newId, date: today };
    setSchoolNews(prev => [item, ...prev]);
    addToast('เผยแพร่ข่าวประชาสัมพันธ์เรียบร้อยแล้ว', 'success');
  };

  const addSchoolOrder = (order: Omit<SchoolOrder, 'id'>) => {
    const newId = `ord-${crypto.randomUUID()}`;
    const item: SchoolOrder = { ...order, id: newId };
    setSchoolOrders(prev => [item, ...prev]);
    addToast(`เผยแพร่คำสั่ง ${order.orderNumber} เรียบร้อยแล้ว`, 'success');
  };

  const addSchoolEvent = (event: Omit<SchoolEvent, 'id'>) => {
    const newId = `evt-${crypto.randomUUID()}`;
    const item: SchoolEvent = { ...event, id: newId };
    setSchoolEvents(prev => [...prev, item]);
    addToast('เพิ่มกิจกรรมในปฏิทินเรียบร้อยแล้ว', 'success');
  };
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // 1. Leave Handlers
  const addLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'status' | 'currentStage' | 'createdAt'>) => {
    const newId = `LR-2567-${String(leaveRequests.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newReq: LeaveRequest = {
      ...req,
      id: newId,
      status: 'pending',
      currentStage: 'admin_review',
      createdAt: today
    };
    setLeaveRequests(prev => [newReq, ...prev]);
    addToast(`ยื่นแบบใบลาเลขที่ ${newId} เรียบร้อยแล้ว (เสนอผู้ดูแลตรวจสอบ)`, 'success');
  };

  const reviewLeaveByAdmin = (id: string, comment?: string, signatureUrl?: string) => {
    if (currentUser.id !== LEAVE_APPROVER_BY_STAGE.admin_review) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id && req.status === 'pending' && req.currentStage === 'admin_review') {
        return {
          ...req,
          currentStage: 'deputy_approval',
          adminReview: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: today,
            comment: comment || 'ตรวจสอบสถิติวันลาถูกต้อง',
            status: 'approved',
            signatureUrl: signatureUrl || currentUser.signatureUrl
          }
        };
      }
      return req;
    }));
    addToast('ผู้ดูแลลงนามตรวจสอบสถิติวันลาแล้ว ➔ ส่งต่อ รอง ผอ.กลุ่มบริหารงานบุคคล', 'info');
  };

  const approveLeaveByDeputy = (id: string, comment?: string, signatureUrl?: string) => {
    if (currentUser.id !== LEAVE_APPROVER_BY_STAGE.deputy_approval) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id && req.status === 'pending' && req.currentStage === 'deputy_approval') {
        return {
          ...req,
          currentStage: 'director_approval',
          deputyApproval: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: today,
            comment: comment || 'เห็นควรอนุมัติตามเสนอ',
            status: 'approved',
            signatureUrl: signatureUrl || currentUser.signatureUrl
          }
        };
      }
      return req;
    }));
    addToast('รอง ผอ.กลุ่มบริหารงานบุคคล ลงนามให้ความเห็นชอบ ➔ เสนอผู้อำนวยการ', 'info');
  };

  const approveLeaveByDirector = (id: string, comment?: string, signatureUrl?: string) => {
    if (currentUser.id !== LEAVE_APPROVER_BY_STAGE.director_approval) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id && req.status === 'pending' && req.currentStage === 'director_approval') {
        return {
          ...req,
          status: 'approved',
          currentStage: 'academic_substitute',
          forwardedToAcademic: true,
          directorApproval: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: today,
            comment: comment || 'อนุมัติ ส่งต่อฝ่ายวิชาการเพื่อจัดตารางสอนแทน',
            status: 'approved',
            signatureUrl: signatureUrl || currentUser.signatureUrl
          }
        };
      }
      return req;
    }));
    addToast('ผู้อำนวยการลงนามอนุมัติใบลา ➔ ส่งต่อฝ่ายวิชาการจัดสอนแทนแล้ว', 'success');
  };

  const rejectLeaveAtStage = (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string) => {
    const expectedStage = stage === 'admin' ? 'admin_review' : stage === 'deputy' ? 'deputy_approval' : 'director_approval';
    if (currentUser.id !== LEAVE_APPROVER_BY_STAGE[expectedStage]) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id && req.status === 'pending' && req.currentStage === expectedStage) {
        return {
          ...req,
          status: 'rejected',
          currentStage: 'rejected',
          [stage === 'admin' ? 'adminReview' : stage === 'deputy' ? 'deputyApproval' : 'directorApproval']: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: new Date().toISOString().split('T')[0],
            comment: comment || 'ไม่อนุมัติ/ส่งคืนแก้ไข',
            status: 'rejected'
          }
        };
      }
      return req;
    }));
    addToast(`ไม่อนุมัติคำขอลา (${stage})`, 'warning');
  };

  // 2. Official Duty Handlers
  const addOfficialDuty = (req: Omit<OfficialDutyRequest, 'id' | 'status' | 'currentStage' | 'forwardedToAcademic' | 'substituteScheduled' | 'createdAt'>) => {
    const newId = `OD-2567-${String(officialDuties.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newDuty: OfficialDutyRequest = {
      ...req,
      id: newId,
      status: 'pending',
      currentStage: 'admin_review',
      forwardedToAcademic: false,
      substituteScheduled: false,
      createdAt: today
    };
    setOfficialDuties(prev => [newDuty, ...prev]);
    addToast(`ยื่นคำขอไปราชการเลขที่ ${newId} สำเร็จ (ส่งให้ผู้ดูแลตรวจ)`, 'success');
  };

  const reviewOfficialDutyByAdmin = (id: string, comment?: string, signatureUrl?: string) => {
    if (currentUser.id !== OFFICIAL_DUTY_APPROVER_BY_STAGE.admin_review) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setOfficialDuties(prev => prev.map(d => {
      if (d.id === id && d.status === 'pending' && d.currentStage === 'admin_review') {
        return {
          ...d,
          currentStage: 'deputy_approval',
          adminReview: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: today,
            comment: comment || 'ตรวจสอบเอกสารและโครงการถูกต้อง',
            status: 'approved',
            signatureUrl: signatureUrl || currentUser.signatureUrl
          }
        };
      }
      return d;
    }));
    addToast('ผู้ดูแลลงนามตรวจสอบเอกสาร ➔ ส่งต่อ รอง ผอ.กลุ่มบริหารงานบุคคล', 'info');
  };

  const approveOfficialDutyByDeputy = (id: string, comment?: string, signatureUrl?: string) => {
    if (currentUser.id !== OFFICIAL_DUTY_APPROVER_BY_STAGE.deputy_approval) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setOfficialDuties(prev => prev.map(d => {
      if (d.id === id && d.status === 'pending' && d.currentStage === 'deputy_approval') {
        return {
          ...d,
          currentStage: 'director_approval',
          deputyApproval: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: today,
            comment: comment || 'เห็นชอบตามเสนอ เพื่อพัฒนาศักยภาพครู/นักเรียน',
            status: 'approved',
            signatureUrl: signatureUrl || currentUser.signatureUrl
          }
        };
      }
      return d;
    }));
    addToast('รอง ผอ.บุคคล ลงนามให้ความเห็นชอบ ➔ ส่งเสนอผู้อำนวยการ', 'info');
  };

  const approveOfficialDutyByDirector = (id: string, comment?: string, signatureUrl?: string) => {
    if (currentUser.id !== OFFICIAL_DUTY_APPROVER_BY_STAGE.director_approval) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setOfficialDuties(prev => prev.map(d => {
      if (d.id === id && d.status === 'pending' && d.currentStage === 'director_approval') {
        return {
          ...d,
          status: 'approved',
          currentStage: 'academic_substitute',
          forwardedToAcademic: true,
          directorApproval: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: today,
            comment: comment || 'อนุมัติ ให้เบิกจ่ายตามระเบียบ และส่งฝ่ายวิชาการจัดสอนแทน',
            status: 'approved',
            signatureUrl: signatureUrl || currentUser.signatureUrl
          }
        };
      }
      return d;
    }));
    addToast('ผู้อำนวยการลงนามอนุมัติ ➔ ส่งต่อฝ่ายวิชาการเพื่อจัดตารางสอนแทนแล้ว', 'success');
  };

  const rejectOfficialDutyAtStage = (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string) => {
    const expectedStage = stage === 'admin' ? 'admin_review' : stage === 'deputy' ? 'deputy_approval' : 'director_approval';
    if (currentUser.id !== OFFICIAL_DUTY_APPROVER_BY_STAGE[expectedStage]) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return;
    }
    setOfficialDuties(prev => prev.map(d => {
      if (d.id === id && d.status === 'pending' && d.currentStage === expectedStage) {
        return {
          ...d,
          status: 'rejected',
          currentStage: 'rejected',
          [stage === 'admin' ? 'adminReview' : stage === 'deputy' ? 'deputyApproval' : 'directorApproval']: {
            approvedBy: currentUser.name,
            approverRole: currentUser.position,
            date: new Date().toISOString().split('T')[0],
            comment: comment || 'ไม่อนุมัติ/ส่งคืนแก้ไข',
            status: 'rejected'
          }
        };
      }
      return d;
    }));
    addToast(`ไม่อนุมัติคำขอไปราชการ (${stage})`, 'warning');
  };

  // 3. Vehicle Booking & Allocation Workflow
  const addVehicleBooking = (booking: Omit<VehicleBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => {
    const newId = `VB-2567-${String(vehicleBookings.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newBooking: VehicleBooking = {
      ...booking,
      id: newId,
      bookingStage: 'admin_review',
      status: 'pending',
      createdAt: today
    };
    setVehicleBookings(prev => [newBooking, ...prev]);

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'มีคำขอใช้รถส่วนกลางใหม่',
      message: `${booking.userName} ยื่นขอใช้รถไป ${booking.destination} (${booking.startDate}) รอผู้ตรวจสอบรับทราบ`,
      module: 'vehicle',
      timestamp: `${today} 08:30`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast(`ยื่นคำขอใช้รถเลขที่ ${newId} สำเร็จ (ส่งให้ผู้ตรวจสอบรับทราบ)`, 'success');
  };

  const reviewVehicleByAdmin = (id: string, comment?: string) => {
    const today = new Date().toISOString().split('T')[0];
    setVehicleBookings(prev => prev.map(b => {
      if (b.id === id) {
        return {
          ...b,
          bookingStage: 'deputy_budget_allocation',
          adminReview: {
            approvedBy: currentUser.name,
            date: today,
            comment: comment || 'ตรวจสอบรายละเอียดการเดินทางและจำนวนผู้โดยสารแล้ว'
          }
        };
      }
      return b;
    }));

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'คำขอใช้รถรอ รอง ผอ.งบประมาณ จัดสรร/เช่ารถ',
      message: `คำขอ ${id} ผ่านการตรวจสอบแล้ว รอ รอง ผอ.กลุ่มบริหารงบประมาณ พิจารณาจัดสรรรถหรือเช่ารถเพิ่ม`,
      module: 'vehicle',
      timestamp: `${today} 09:00`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast('ผู้ตรวจสอบรับทราบแล้ว ➔ ส่งต่อ รอง ผอ.กลุ่มบริหารงบประมาณ เพื่อจัดสรรรถ', 'info');
  };

  const allocateVehicleByDeputyBudget = (id: string, payload: {
    isRental: boolean;
    vehicleId?: string;
    rentalDetails?: string;
    rentalCost?: number;
    driverId?: string;
    comment?: string;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const selectedVeh = vehicles.find(v => v.id === payload.vehicleId);
    const selectedDriver = users.find(u => u.id === payload.driverId);

    setVehicleBookings(prev => prev.map(b => {
      if (b.id === id) {
        return {
          ...b,
          bookingStage: 'driver_ack',
          isExternalRental: payload.isRental,
          rentalDetails: payload.rentalDetails,
          rentalCost: payload.rentalCost,
          vehicleId: payload.vehicleId,
          vehicleName: payload.isRental ? `รถเช่าภายนอก (${payload.rentalDetails || 'รถตู้/บัส'})` : selectedVeh?.name,
          licensePlate: payload.isRental ? 'รถเช่าบริการพร้อมคนขับ' : selectedVeh?.licensePlate,
          assignedDriverId: payload.driverId,
          assignedDriverName: selectedDriver ? selectedDriver.name : (payload.isRental ? 'พนักงานขับรถจากบริษัทเช่า' : selectedVeh?.driverName),
          assignedDriverPhone: selectedDriver ? selectedDriver.phone : (selectedVeh?.driverPhone || '083-444-3322'),
          deputyAllocation: {
            approvedBy: currentUser.name,
            date: today,
            comment: payload.comment || (payload.isRental ? 'อนุมัติเช่ารถเพิ่มเนื่องจากรถในโรงเรียนไม่เพียงพอ' : 'จัดสรรรถส่วนกลางโรงเรียนเรียบร้อย'),
            isRental: payload.isRental,
            allocatedVehicle: payload.isRental ? `รถเช่าภายนอก: ${payload.rentalDetails}` : (selectedVeh?.name || 'รถส่วนกลาง'),
            allocatedDriver: selectedDriver ? selectedDriver.name : (payload.isRental ? 'คนขับบริษัทเช่า' : (selectedVeh?.driverName || 'พนักงานขับรถ'))
          }
        };
      }
      return b;
    }));

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'มีภารกิจขับรถรอรับทราบงาน',
      message: `รอง ผอ.งบประมาณ มอบหมายภารกิจขับรถสำหรับคำขอ ${id} กรุณาตรวจสอบและกดรับทราบงาน`,
      module: 'vehicle',
      timestamp: `${today} 10:00`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast(`รอง ผอ.งบประมาณ ${payload.isRental ? 'อนุมัติเช่ารถเพิ่ม' : 'จัดสรรรถ'} เรียบร้อย ➔ แจ้งคนขับรับทราบงาน`, 'success');
  };

  const acknowledgeByDriver = (id: string, comment?: string) => {
    const today = new Date().toISOString().split('T')[0];
    let targetBooking: VehicleBooking | undefined;

    setVehicleBookings(prev => prev.map(b => {
      if (b.id === id) {
        targetBooking = b;
        return {
          ...b,
          bookingStage: 'completed',
          status: 'approved',
          driverAck: {
            driverName: currentUser.name,
            date: today,
            comment: comment || 'รับทราบภารกิจ พร้อมออกเดินทางตามกำหนดการ'
          }
        };
      }
      return b;
    }));

    const notif1: AppNotification = {
      id: `notif-${Date.now()}-1`,
      title: 'คนขับรถรับทราบงานแล้ว (พร้อมเดินทาง)',
      message: `คนขับรถ (${currentUser.name}) รับทราบคำขอใช้รถ ${id} เรียบร้อยแล้ว รถพร้อมให้บริการตามวันเวลา`,
      module: 'vehicle',
      timestamp: `${today} 10:30`,
      read: false
    };
    const notif2: AppNotification = {
      id: `notif-${Date.now()}-2`,
      title: 'การจัดสรรรถเสร็จสมบูรณ์',
      message: `คำขอ ${id} (${targetBooking?.destination || ''}) ได้รับการยืนยันจากคนขับครบถ้วนสมบูรณ์แล้ว`,
      module: 'vehicle',
      timestamp: `${today} 10:30`,
      read: false
    };
    setNotifications(prev => [notif1, notif2, ...prev]);

    addToast('คนขับรถรับทราบงานแล้ว ➔ ระบบแจ้งผลไปยังผู้ขอใช้และผู้ตรวจสอบเรียบร้อย', 'success');
  };

  const rejectVehicleBooking = (id: string, stage: 'admin' | 'deputy' | 'driver', comment?: string) => {
    setVehicleBookings(prev => prev.map(b => {
      if (b.id === id) {
        return {
          ...b,
          bookingStage: 'rejected',
          status: 'rejected'
        };
      }
      return b;
    }));
    addToast(`ยกเลิก/ไม่อนุมัติคำขอใช้รถ (${stage})`, 'warning');
  };

  // 4. Meeting Room Handlers (ผู้ขอจอง ➔ ผู้ดูแลห้องอนุมัติรับทราบ ➔ จบการใช้ห้อง)
  const addRoomBooking = async (booking: Omit<RoomBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => {
    try {
      const saved = await roomsApi.create(booking);
      setRoomBookings(prev => [saved, ...prev]);
      addToast(`ยื่นคำขอจองห้องประชุม ${saved.id} สำเร็จ`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกการจองได้', 'error');
      return false;
    }
  };

  const updateBookingStatus = async (action: 'approve' | 'reject' | 'complete', id: string, comment?: string) => {
    try {
      const saved = await roomsApi.updateBooking(action, id, comment);
      setRoomBookings(prev => prev.map(room => room.id === id ? saved : room));
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถอัปเดตรายการได้', 'error');
      return false;
    }
  };

  const approveRoomBookingByManager = async (id: string, comment?: string) => {
    const success = await updateBookingStatus('approve', id, comment);
    if (success) addToast('ผู้ดูแลห้องอนุมัติการจองแล้ว', 'success');
    return success;
  };

  const completeRoomUsage = async (id: string) => {
    const success = await updateBookingStatus('complete', id);
    if (success) addToast('จบการใช้ห้องประชุมเรียบร้อยแล้ว', 'info');
    return success;
  };

  const rejectRoomBooking = async (id: string, comment?: string) => {
    const success = await updateBookingStatus('reject', id, comment);
    if (success) addToast('ปฏิเสธคำขอใช้ห้องประชุม', 'warning');
    return success;
  };

  // 5. Repair Handlers with 2-Track Notification Routing (โสตทัศนูปกรณ์/ไอที vs อาคารสถานที่)
  const addRepairTicket = (ticket: Omit<RepairTicket, 'id' | 'repairStage' | 'status' | 'createdAt'>) => {
    const newId = `RP-2567-${String(repairTickets.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newTicket: RepairTicket = {
      ...ticket,
      id: newId,
      repairStage: 'reported',
      status: 'pending',
      createdAt: today
    };
    setRepairTickets(prev => [newTicket, ...prev]);

    const isAV = ticket.category === 'audio_visual' || ticket.category === 'computer_network';
    const targetHandler = isAV ? 'ผู้ดูแลงานโสตทัศนูปกรณ์และไอที' : 'หัวหน้างานอาคารสถานที่';

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: isAV ? '🖥️ มีรายการแจ้งซ่อมโสตทัศนูปกรณ์/ไอทีใหม่' : '🔧 มีรายการแจ้งซ่อมอาคารสถานที่ใหม่',
      message: `${ticket.userName} แจ้งซ่อม: "${ticket.title}" (${ticket.location}) ➔ ส่งแจ้งเตือนตรงถึง ${targetHandler}`,
      module: 'repair',
      timestamp: `${today} 08:45`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast(`แจ้งซ่อมรหัส ${newId} สำเร็จ (ระบบส่งแจ้งเตือนไปยัง ${targetHandler})`, 'success');
  };

  const acknowledgeAndAssignRepair = (id: string, payload: { technicianId: string; technicianName: string; comment?: string }) => {
    const today = new Date().toISOString().split('T')[0];
    setRepairTickets(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          repairStage: 'head_acknowledged',
          status: 'in_progress',
          assignedTechnicianId: payload.technicianId,
          assignedTechnician: payload.technicianName,
          headReview: {
            approvedBy: currentUser.name,
            date: today,
            assignedTechnicianName: payload.technicianName,
            comment: payload.comment || 'รับแจ้ง มอบหมายช่างเข้าดำเนินการ'
          }
        };
      }
      return r;
    }));

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'มีงานซ่อมมอบหมายใหม่',
      message: `หัวหน้างานอาคารสถานที่มอบหมายงานซ่อม ${id} ให้คุณเข้าตรวจสอบ`,
      module: 'repair',
      timestamp: `${today} 09:15`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast(`หัวหน้างานอาคารสถานที่รับแจ้งแล้ว ➔ มอบหมาย ${payload.technicianName}`, 'info');
  };

  const submitRepairReportByTechnician = (id: string, payload: { repairDetails: string; partsUsed?: string; cost?: number }) => {
    const today = new Date().toISOString().split('T')[0];
    let ticketUser = '';
    setRepairTickets(prev => prev.map(r => {
      if (r.id === id) {
        ticketUser = r.userName;
        return {
          ...r,
          repairStage: 'repaired_pending_confirm',
          repairNotes: payload.repairDetails,
          technicianReport: {
            technicianName: currentUser.name,
            date: today,
            repairDetails: payload.repairDetails,
            partsUsed: payload.partsUsed,
            cost: payload.cost
          }
        };
      }
      return r;
    }));

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'งานซ่อมเสร็จแล้ว (รอผู้แจ้งยืนยัน)',
      message: `ช่าง ${currentUser.name} บันทึกผลการซ่อมงาน ${id} เรียบร้อยแล้ว กรุณากดยืนยันตรวจรับงาน`,
      module: 'repair',
      timestamp: `${today} 11:30`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast('ช่างบันทึกผลการซ่อมเรียบร้อย ➔ ส่งแจ้งเตือนผู้แจ้งกดยืนยันตรวจรับ', 'success');
  };

  const confirmRepairByUser = (id: string, payload: { rating?: number; comment?: string }) => {
    const today = new Date().toISOString().split('T')[0];
    setRepairTickets(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          repairStage: 'user_confirmed',
          status: 'completed',
          completedAt: today,
          userConfirmation: {
            confirmedBy: currentUser.name,
            date: today,
            rating: payload.rating || 5,
            comment: payload.comment || 'ตรวจรับงานเรียบร้อย อุปกรณ์ใช้งานได้ตามปกติ'
          }
        };
      }
      return r;
    }));
    addToast('ผู้แจ้งกดยืนยันตรวจรับงานซ่อมเรียบร้อยแล้ว (ปิดงานซ่อมสมบูรณ์)', 'success');
  };

  const rejectRepair = (id: string, comment?: string) => {
    setRepairTickets(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          repairStage: 'rejected',
          status: 'rejected',
          repairNotes: comment || 'ยกเลิกคำขอซ่อม'
        };
      }
      return r;
    }));
    addToast('ยกเลิก/ปฏิเสธคำขอซ่อม', 'warning');
  };

  // 6. Substitute (จัดสอนแทน ➔ แจ้งครูสอนแทนทราบ ➔ สรุปการสอนแทน ➔ แจ้ง รอง ผอ.วิชาการ)
  const addSubstituteLesson = (lesson: Omit<SubstituteTeaching, 'id' | 'createdAt' | 'stage'>) => {
    const newId = `SUB-2567-${String(substituteLessons.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newLesson: SubstituteTeaching = {
      ...lesson,
      id: newId,
      stage: 'pending_ack',
      status: 'pending',
      createdAt: today
    };
    setSubstituteLessons(prev => [newLesson, ...prev]);

    if (lesson.officialDutyId) {
      setOfficialDuties(prev => prev.map(d => {
        if (d.id === lesson.officialDutyId) {
          return {
            ...d,
            substituteScheduled: true,
            currentStage: 'completed'
          };
        }
        return d;
      }));
    }

    // 1. Notify the Substitute Teacher immediately
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '👨‍🏫 ได้รับมอบหมายสอนแทน (รอรับทราบงาน)',
      message: `คุณได้รับมอบหมายให้สอนแทน: วิชา ${lesson.subjectName} (${lesson.subjectCode}) คาบที่ ${lesson.period} (${lesson.time}) ห้อง ${lesson.gradeLevel} วันที่ ${lesson.date} (แทน ${lesson.originalTeacherName})`,
      module: 'substitute',
      targetUserId: lesson.substituteTeacherId,
      timestamp: `${today} 08:30`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast(`จัดครูสอนแทนรหัส ${newId} สำเร็จ (ส่งแจ้งเตือนถึง ${lesson.substituteTeacherName} เรียบร้อย)`, 'success');
  };

  const acknowledgeSubstitute = (id: string) => {
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    let targetLesson: SubstituteTeaching | undefined;

    setSubstituteLessons(prev => prev.map(s => {
      if (s.id === id) {
        targetLesson = s;
        return {
          ...s,
          stage: 'acknowledged',
          status: 'completed',
          acknowledgedAt: timestamp
        };
      }
      return s;
    }));

    // Notify Deputy Director of Academic Affairs / Academic Affairs Head
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '👨‍🏫 ครูผู้สอนแทนรับทราบภารกิจแล้ว (แจ้ง รอง ผอ.วิชาการ)',
      message: `${currentUser.name} ได้กดยืนยันรับทราบการสอนแทนวิชา ${targetLesson?.subjectCode || ''} (${targetLesson?.subjectName || ''}) คาบที่ ${targetLesson?.period || ''} (${targetLesson?.gradeLevel || ''}) วันที่ ${targetLesson?.date || ''} (แทน ${targetLesson?.originalTeacherName || ''}) เรียบร้อยแล้ว`,
      module: 'substitute',
      timestamp: timestamp,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast('กดยืนยันรับทราบการสอนแทนเรียบร้อย ➔ ระบบแจ้งเตือนไปยัง รอง ผอ.กลุ่มบริหารวิชาการ', 'success');
  };

  // 7. Portfolio
  const addPortfolio = (item: Omit<StaffPortfolio, 'id' | 'createdAt' | 'status'>) => {
    const newId = `PF-2567-${String(portfolios.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newItem: StaffPortfolio = {
      ...item,
      id: newId,
      status: 'pending',
      createdAt: today
    };
    setPortfolios(prev => [newItem, ...prev]);
    addToast(`บันทึกผลงาน "${item.title}" เข้าสู่แฟ้มสะสมผลงานแล้ว`, 'success');
  };

  // 8. Lesson Plans
  const addLessonPlan = (plan: Omit<LessonPlan, 'id' | 'createdAt' | 'status'>) => {
    const newId = `LP-2567-${String(lessonPlans.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newPlan: LessonPlan = {
      ...plan,
      id: newId,
      status: 'pending',
      createdAt: today
    };
    setLessonPlans(prev => [newPlan, ...prev]);
    addToast(`ส่งแผนการจัดการเรียนรู้ ${plan.subjectCode} เรียบร้อยแล้ว`, 'success');
  };

  const reviewLessonPlan = (id: string, status: LessonPlan['status'], score?: number, comment?: string) => {
    setLessonPlans(prev => prev.map(lp => {
      if (lp.id === id) {
        return {
          ...lp,
          status,
          score: score || lp.score,
          reviewerName: currentUser.name,
          reviewComment: comment || lp.reviewComment,
          reviewedAt: new Date().toISOString().split('T')[0]
        };
      }
      return lp;
    }));
    addToast(`ประเมินแผนการสอนรหัส ${id} เรียบร้อยแล้ว`, 'info');
  };

  const pendingApprovalsCount = 
    leaveRequests.filter(l => l.status === 'pending').length +
    officialDuties.filter(o => o.status === 'pending').length +
    vehicleBookings.filter(v => v.status === 'pending').length +
    roomBookings.filter(r => r.status === 'pending').length +
    repairTickets.filter(rp => rp.status === 'pending').length +
    lessonPlans.filter(lp => lp.status === 'pending').length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
      updateUser,
      setUsersList,
        leaveRequests,
        addLeaveRequest,
        reviewLeaveByAdmin,
        approveLeaveByDeputy,
        approveLeaveByDirector,
        rejectLeaveAtStage,
        officialDuties,
        addOfficialDuty,
        reviewOfficialDutyByAdmin,
        approveOfficialDutyByDeputy,
        approveOfficialDutyByDirector,
        rejectOfficialDutyAtStage,
        vehicles,
        vehicleBookings,
        addVehicleBooking,
        reviewVehicleByAdmin,
        allocateVehicleByDeputyBudget,
        acknowledgeByDriver,
        rejectVehicleBooking,
        rooms,
        updateRoomManager,
        roomBookings,
        addRoomBooking,
        approveRoomBookingByManager,
        completeRoomUsage,
        rejectRoomBooking,
        repairTickets,
        addRepairTicket,
        acknowledgeAndAssignRepair,
        submitRepairReportByTechnician,
        confirmRepairByUser,
        rejectRepair,
        substituteLessons,
        addSubstituteLesson,
        acknowledgeSubstitute,
        portfolios,
        addPortfolio,
        lessonPlans,
        addLessonPlan,
        reviewLessonPlan,
        schoolNews,
        addSchoolNews,
        schoolOrders,
        addSchoolOrder,
        schoolEvents,
        addSchoolEvent,
        notifications,
        markNotificationAsRead,
        toasts,
        addToast,
        removeToast,
        pendingApprovalsCount
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
