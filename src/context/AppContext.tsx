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
import { ApiError, adminApi, leavesApi, notificationsApi, officialDutiesApi, roomsApi, substitutesApi, vehiclesApi, pipelinesApi, WorkflowPipeline } from '../lib/api';
import {
  getLeaveApprover,
  getOfficialDutyApprover,
  getPipelineAssignee,
} from '../config/approvalWorkflow';

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
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status' | 'currentStage' | 'createdAt'>) => Promise<boolean>;
  reviewLeaveByAdmin: (id: string, comment?: string, signatureUrl?: string) => Promise<boolean>;
  approveLeaveByDeputy: (id: string, comment?: string, signatureUrl?: string) => Promise<boolean>;
  approveLeaveByDirector: (id: string, comment?: string, signatureUrl?: string) => Promise<boolean>;
  rejectLeaveAtStage: (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string, signatureUrl?: string) => Promise<boolean>;

  // 2. Official Duty
  officialDuties: OfficialDutyRequest[];
  addOfficialDuty: (req: Omit<OfficialDutyRequest, 'id' | 'status' | 'currentStage' | 'forwardedToAcademic' | 'substituteScheduled' | 'createdAt'>) => Promise<boolean>;
  reviewOfficialDutyByAdmin: (id: string, comment?: string, signatureUrl?: string) => Promise<boolean>;
  approveOfficialDutyByDeputy: (id: string, comment?: string, signatureUrl?: string) => Promise<boolean>;
  approveOfficialDutyByDirector: (id: string, comment?: string, signatureUrl?: string) => Promise<boolean>;
  rejectOfficialDutyAtStage: (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string, signatureUrl?: string) => Promise<boolean>;

  // 3. Vehicles & Workflow
  vehicles: Vehicle[];
  vehicleBookings: VehicleBooking[];
  addVehicleBooking: (booking: Omit<VehicleBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => Promise<boolean>;
  reviewVehicleByAdmin: (id: string, comment?: string) => void;
  allocateVehicleByDeputyBudget: (id: string, payload: {
    isRental: boolean;
    vehicleId?: string;
    rentalDetails?: string;
    rentalCost?: number;
    driverId?: string;
    comment?: string;
  }) => Promise<boolean>;
  acknowledgeByDriver: (id: string, comment?: string) => Promise<boolean>;
  rejectVehicleBooking: (id: string, stage: 'admin' | 'deputy' | 'driver', comment?: string) => Promise<boolean>;

  // 4. Meeting Rooms (ผู้ขอ ➔ ผู้ดูแลห้องอนุมัติ ➔ จบการใช้ห้อง)
  rooms: MeetingRoom[];
  updateRoomManager: (roomId: string, managerIds: string[]) => Promise<void>;
  updateRoom: (roomId: string, name: string, location: string, capacity: string, image?: string) => Promise<void>;
  roomBookings: RoomBooking[];
  addRoomBooking: (booking: Omit<RoomBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => Promise<boolean>;
  approveRoomBookingByDeputy: (id: string, comment?: string) => Promise<boolean>;
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
  addSubstituteLessons: (lessons: Array<Omit<SubstituteTeaching, 'id' | 'createdAt' | 'stage'>>) => Promise<boolean>;
  acknowledgeSubstitute: (id: string) => Promise<boolean>;

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
  pipelinesConfig: WorkflowPipeline[];
  savePipelinesConfig: (pipelines: WorkflowPipeline[]) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const currentBuddhistYear = () => new Date().getFullYear() + 543;

const sanitizeClientUser = (user: User): User => {
  const sanitized = { ...user };
  delete sanitized.citizenId;
  delete sanitized.password;
  return sanitized;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mmv_school_users');
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
      return next;
    });
  };

  const setUsersList = (newUsers: User[]) => {
    const safeUsers = newUsers.map(sanitizeClientUser);
    setUsers(safeUsers);
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

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests ?? []);
  useEffect(() => {
    let cancelled = false;
    leavesApi.list().then(data => { if (!cancelled) setLeaveRequests(data); }).catch((error: unknown) => {
      if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) addToast(error.message, 'error');
    });
    return () => { cancelled = true; };
  }, [addToast, currentUser]);
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
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>(initialVehicleBookings ?? []);
  useEffect(() => {
    let cancelled = false;
    officialDutiesApi.list()
      .then(data => { if (!cancelled) setOfficialDuties(data); })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) {
          addToast(error.message, 'error');
        }
      });
    return () => { cancelled = true; };
  }, [addToast, currentUser]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([vehiclesApi.listFleet(), vehiclesApi.listBookings()])
      .then(([serverVehicles, serverBookings]) => {
        if (!cancelled) {
          setVehicles(serverVehicles);
          setVehicleBookings(serverBookings);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) {
          addToast(error.message, 'error');
        }
      });
    return () => { cancelled = true; };
  }, [addToast, currentUser]);
  const [rooms, setRooms] = useState<MeetingRoom[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_rooms');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return mockMeetingRooms;
  });

  const updateRoomManager = async (roomId: string, managerIds: string[]) => {
    try {
      await roomsApi.updateManager(roomId, managerIds);
      const freshRooms = await roomsApi.listRooms();
      setRooms(freshRooms);
      addToast(`กำหนดผู้ดูแลห้องประชุมเรียบร้อยแล้ว`, 'success');
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถกำหนดผู้ดูแลห้องได้', 'error');
    }
  };

  const updateRoom = async (roomId: string, name: string, location: string, capacity: string, image?: string) => {
    try {
      await roomsApi.updateRoom(roomId, name, location, capacity, image);
      const freshRooms = await roomsApi.listRooms();
      setRooms(freshRooms);
      addToast('บันทึกข้อมูลอาคาร/สถานที่เรียบร้อยแล้ว', 'success');
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกข้อมูลอาคาร/สถานที่ได้', 'error');
    }
  };
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(initialRoomBookings ?? []);

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

  const [pipelinesConfig, setPipelinesConfig] = useState<WorkflowPipeline[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mmv_admin_pipelines_v6');
      if (saved) { try { return JSON.parse(saved); } catch {} }
    }
    return [];
  });

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    pipelinesApi.listPipelines()
      .then((serverPipes) => {
        if (!cancelled && serverPipes && serverPipes.length > 0) {
          setPipelinesConfig(serverPipes);
          localStorage.setItem('mmv_admin_pipelines_v6', JSON.stringify(serverPipes));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);

  const savePipelinesConfig = async (pipelines: WorkflowPipeline[]): Promise<boolean> => {
    try {
      await pipelinesApi.savePipelines(pipelines);
      setPipelinesConfig(pipelines);
      localStorage.setItem('mmv_admin_pipelines_v6', JSON.stringify(pipelines));
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกขั้นตอนการอนุมัติได้', 'error');
      return false;
    }
  };

  const [repairTickets, setRepairTickets] = useState<RepairTicket[]>(initialRepairTickets);
  const [substituteLessons, setSubstituteLessons] = useState<SubstituteTeaching[]>([]);
  useEffect(() => {
    let cancelled = false;
    substitutesApi.list()
      .then(data => { if (!cancelled) setSubstituteLessons(data); })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) {
          addToast(error.message, 'error');
        }
      });
    return () => { cancelled = true; };
  }, [addToast, currentUser]);
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
  useEffect(() => {
    let cancelled = false;
    const load = () => notificationsApi.list().then(data => { if (!cancelled) setNotifications(data); }).catch(() => undefined);
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    adminApi.listUsers()
      .then(serverUsers => {
        if (!cancelled) {
          setUsersList(serverUsers);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    void notificationsApi.markRead(id).catch(() => undefined);
  };

  // 1. Leave Handlers
  const addLeaveRequest = async (req: Omit<LeaveRequest, 'id' | 'status' | 'currentStage' | 'createdAt'>): Promise<boolean> => {
    try {
      const created = await leavesApi.create(req);
      setLeaveRequests(prev => [created, ...prev.filter(item => item.id !== created.id)]);
      addToast(`ยื่นแบบใบลาเลขที่ ${created.id} เรียบร้อยแล้ว และส่งการแจ้งเตือนแล้ว`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถส่งใบลาได้', 'error');
      return false;
    }
  };

  const reviewLeaveByAdmin = async (id: string, comment?: string, signatureUrl?: string): Promise<boolean> => {
    if (currentUser.id !== getLeaveApprover(pipelinesConfig, 'admin_review')) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await leavesApi.update('review', id, comment, signatureUrl);
      setLeaveRequests(prev => prev.map(req => req.id === id ? updated : req));
      addToast('ลงนามตรวจสอบแล้ว และแจ้งเตือนผู้พิจารณาลำดับถัดไป', 'info');
      return true;
    } catch (error) { addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error'); return false; }
  };

  const approveLeaveByDeputy = async (id: string, comment?: string, signatureUrl?: string): Promise<boolean> => {
    if (currentUser.id !== getLeaveApprover(pipelinesConfig, 'deputy_approval')) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await leavesApi.update('approve_deputy', id, comment, signatureUrl);
      setLeaveRequests(prev => prev.map(req => req.id === id ? updated : req));
      addToast('ลงนามเห็นชอบแล้ว และแจ้งเตือนผู้อำนวยการ', 'info');
      return true;
    } catch (error) { addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error'); return false; }
  };

  const approveLeaveByDirector = async (id: string, comment?: string, signatureUrl?: string): Promise<boolean> => {
    if (currentUser.id !== getLeaveApprover(pipelinesConfig, 'director_approval')) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await leavesApi.update('approve_director', id, comment, signatureUrl);
      setLeaveRequests(prev => prev.map(req => req.id === id ? updated : req));
      addToast('อนุมัติใบลาแล้ว และแจ้งผลให้ผู้ยื่นทางเว็บและ LINE', 'success');
      return true;
    } catch (error) { addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error'); return false; }
  };

  const rejectLeaveAtStage = async (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string, signatureUrl?: string): Promise<boolean> => {
    const expectedStage = stage === 'admin' ? 'admin_review' : stage === 'deputy' ? 'deputy_approval' : 'director_approval';
    if (currentUser.id !== getLeaveApprover(pipelinesConfig, expectedStage)) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await leavesApi.update('reject', id, comment, signatureUrl || currentUser.signatureUrl, expectedStage);
      setLeaveRequests(prev => prev.map(req => req.id === id ? updated : req));
      addToast('บันทึกผลและแจ้งผู้ยื่นแล้ว', 'warning');
      return true;
    } catch (error) { addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error'); return false; }
  };

  // 2. Official Duty Handlers
  const addOfficialDuty = async (req: Omit<OfficialDutyRequest, 'id' | 'status' | 'currentStage' | 'forwardedToAcademic' | 'substituteScheduled' | 'createdAt'>): Promise<boolean> => {
    try {
      const created = await officialDutiesApi.create(req);
      setOfficialDuties(prev => [created, ...prev.filter(item => item.id !== created.id)]);
      addToast(`ยื่นคำขอไปราชการเลขที่ ${created.id} สำเร็จ และส่งการแจ้งเตือนแล้ว`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถส่งคำขอไปราชการได้', 'error');
      return false;
    }
  };

  const reviewOfficialDutyByAdmin = async (id: string, comment?: string, signatureUrl?: string): Promise<boolean> => {
    if (currentUser.id !== getOfficialDutyApprover(pipelinesConfig, 'admin_review')) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await officialDutiesApi.update('review', id, comment, signatureUrl);
      setOfficialDuties(prev => prev.map(duty => duty.id === id ? updated : duty));
      addToast('ลงนามตรวจสอบแล้ว และแจ้งเตือน รอง ผอ.กลุ่มบริหารงานบุคคล', 'info');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error');
      return false;
    }
  };

  const approveOfficialDutyByDeputy = async (id: string, comment?: string, signatureUrl?: string): Promise<boolean> => {
    if (currentUser.id !== getOfficialDutyApprover(pipelinesConfig, 'deputy_approval')) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await officialDutiesApi.update('approve_deputy', id, comment, signatureUrl);
      setOfficialDuties(prev => prev.map(duty => duty.id === id ? updated : duty));
      addToast('ลงนามเห็นชอบแล้ว และแจ้งเตือนผู้อำนวยการ', 'info');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error');
      return false;
    }
  };

  const approveOfficialDutyByDirector = async (id: string, comment?: string, signatureUrl?: string): Promise<boolean> => {
    if (currentUser.id !== getOfficialDutyApprover(pipelinesConfig, 'director_approval')) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await officialDutiesApi.update('approve_director', id, comment, signatureUrl);
      setOfficialDuties(prev => prev.map(duty => duty.id === id ? updated : duty));
      addToast('อนุมัติแล้ว และแจ้งผู้ยื่นกับฝ่ายวิชาการทางเว็บและ LINE', 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error');
      return false;
    }
  };

  const rejectOfficialDutyAtStage = async (id: string, stage: 'admin' | 'deputy' | 'director', comment?: string, signatureUrl?: string): Promise<boolean> => {
    const expectedStage = stage === 'admin' ? 'admin_review' : stage === 'deputy' ? 'deputy_approval' : 'director_approval';
    if (currentUser.id !== getOfficialDutyApprover(pipelinesConfig, expectedStage)) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนลงนามของคุณ', 'error');
      return false;
    }
    try {
      const updated = await officialDutiesApi.update('reject', id, comment, signatureUrl, expectedStage);
      setOfficialDuties(prev => prev.map(duty => duty.id === id ? updated : duty));
      addToast('บันทึกผลและแจ้งผู้ยื่นแล้ว', 'warning');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกผลไม่สำเร็จ', 'error');
      return false;
    }
  };

  // 3. Vehicle Booking & Allocation Workflow
  const addVehicleBooking = async (booking: Omit<VehicleBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>): Promise<boolean> => {
    try {
      const created = await vehiclesApi.create(booking);
      setVehicleBookings(prev => [created, ...prev.filter(item => item.id !== created.id)]);
      addToast(`ยื่นคำขอใช้รถเลขที่ ${created.id} สำเร็จ และส่งการแจ้งเตือนแล้ว`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถส่งคำขอใช้รถได้', 'error');
      return false;
    }
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

  const allocateVehicleByDeputyBudget = async (id: string, payload: {
    isRental: boolean;
    vehicleId?: string;
    rentalDetails?: string;
    rentalCost?: number;
    driverId?: string;
    comment?: string;
  }): Promise<boolean> => {
    try {
      const updated = await vehiclesApi.allocate(id, payload);
      setVehicleBookings(prev => prev.map(booking => booking.id === id ? updated : booking));
      addToast(`จัดสรรรถเรียบร้อย และแจ้งผู้ขอกับพนักงานขับรถแล้ว`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถจัดสรรรถได้', 'error');
      return false;
    }
  };

  const acknowledgeByDriver = async (id: string, comment?: string): Promise<boolean> => {
    try {
      const updated = await vehiclesApi.driverAck(id, comment);
      setVehicleBookings(prev => prev.map(booking => booking.id === id ? updated : booking));
      addToast('คนขับรถรับทราบงานแล้ว และแจ้งผลให้ผู้ขอใช้รถเรียบร้อย', 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถยืนยันรับงานได้', 'error');
      return false;
    }
  };

  const rejectVehicleBooking = async (id: string, _stage: 'admin' | 'deputy' | 'driver', comment?: string): Promise<boolean> => {
    try {
      const updated = await vehiclesApi.reject(id, comment);
      setVehicleBookings(prev => prev.map(booking => booking.id === id ? updated : booking));
      addToast('ไม่อนุมัติคำขอใช้รถและแจ้งผู้ยื่นแล้ว', 'warning');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกผลได้', 'error');
      return false;
    }
  };

  // 4. Meeting Room Handlers (ผู้ขอจอง ➔ ผู้ดูแลห้องอนุมัติรับทราบ ➔ จบการใช้ห้อง)
  const addRoomBooking = async (booking: Omit<RoomBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => {
    try {
      const saved = await roomsApi.create(booking);
      setRoomBookings(prev => [saved, ...prev]);
      addToast(`ยื่นคำขอใช้อาคารสถานที่ ${saved.id} สำเร็จ`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกคำขอได้', 'error');
      return false;
    }
  };

  const updateBookingStatus = async (action: 'approve_deputy' | 'approve' | 'reject' | 'complete', id: string, comment?: string) => {
    try {
      const saved = await roomsApi.updateBooking(action, id, comment);
      setRoomBookings(prev => prev.map(room => room.id === id ? saved : room));
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถอัปเดตรายการได้', 'error');
      return false;
    }
  };

  const approveRoomBookingByDeputy = async (id: string, comment?: string) => {
    const success = await updateBookingStatus('approve_deputy', id, comment);
    if (success) addToast('รองฝ่ายทั่วไปอนุมัติคำขอแล้ว รอผู้ดูแลสถานที่ยืนยัน', 'success');
    return success;
  };

  const approveRoomBookingByManager = async (id: string, comment?: string) => {
    const success = await updateBookingStatus('approve', id, comment);
    if (success) addToast('ผู้ดูแลสถานที่อนุมัติคำขอแล้ว — พร้อมใช้งาน', 'success');
    return success;
  };

  const completeRoomUsage = async (id: string) => {
    const success = await updateBookingStatus('complete', id);
    if (success) addToast('จบการใช้อาคารสถานที่เรียบร้อยแล้ว', 'info');
    return success;
  };

  const rejectRoomBooking = async (id: string, comment?: string) => {
    const success = await updateBookingStatus('reject', id, comment);
    if (success) addToast('ปฏิเสธคำขอใช้อาคารสถานที่', 'warning');
    return success;
  };

  // 5. Repair Handlers with 2-Track Notification Routing (โสตทัศนูปกรณ์/ไอที vs อาคารสถานที่)
  const addRepairTicket = (ticket: Omit<RepairTicket, 'id' | 'repairStage' | 'status' | 'createdAt'>) => {
    const newId = `RP-${currentBuddhistYear()}-${String(repairTickets.length + 1).padStart(3, '0')}`;
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
    
    // Resolve the manager from the server-synchronized admin pipeline.
    let targetHandler = isAV ? 'ผู้ดูแลงานโสตทัศนูปกรณ์และไอที' : 'หัวหน้างานอาคารสถานที่';
    const repairPipelineId = isAV ? 'pipe-repair-av' : 'pipe-repair-build';
    const fallbackManagerId = isAV ? 'MMV96' : 'MMV97';
    const managerId = getPipelineAssignee(pipelinesConfig, repairPipelineId, 2, fallbackManagerId);
    const manager = users.find(user => user.id === managerId);
    if (manager) targetHandler = manager.name;

    const notifTarget = isAV ? targetHandler : `${targetHandler} และ รองผู้อำนวยการฝ่ายทั่วไป (นายไชยวัฒน์ บุญมี)`;

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: isAV ? '🖥️ มีรายการแจ้งซ่อมโสตทัศนูปกรณ์/ไอทีใหม่' : '🔧 มีรายการแจ้งซ่อมอาคารสถานที่ใหม่',
      message: `${ticket.userName} แจ้งซ่อม: "${ticket.title}" (${ticket.location}) ➔ ส่งแจ้งเตือนตรงถึง ${notifTarget}`,
      module: 'repair',
      timestamp: `${today} 08:45`,
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    addToast(`แจ้งซ่อมรหัส ${newId} สำเร็จ (ระบบส่งแจ้งเตือนไปยัง ${notifTarget})`, 'success');
  };

  const acknowledgeAndAssignRepair = (id: string, payload: { technicianId: string; technicianName: string; comment?: string }) => {
    const ticket = repairTickets.find(item => item.id === id);
    if (!ticket) return;
    const isAV = ticket.category === 'audio_visual' || ticket.category === 'computer_network';
    const pipelineId = isAV ? 'pipe-repair-av' : 'pipe-repair-build';
    const fallbackManagerId = isAV ? 'MMV96' : 'MMV97';
    const managerId = getPipelineAssignee(pipelinesConfig, pipelineId, 2, fallbackManagerId);
    if (currentUser.role !== 'admin' && currentUser.id !== managerId) {
      addToast('รายการนี้ไม่ใช่ขั้นตอนดำเนินการของคุณ', 'error');
      return;
    }
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
  const addSubstituteLessons = async (lessons: Array<Omit<SubstituteTeaching, 'id' | 'createdAt' | 'stage'>>): Promise<boolean> => {
    const substituteManagerId = getPipelineAssignee(pipelinesConfig, 'pipe-substitute', 2, 'MMV90');
    const canManage = currentUser.role === 'admin' || currentUser.id === substituteManagerId;
    if (!canManage) {
      addToast('เฉพาะผู้รับผิดชอบงานวิชาการหรือผู้ดูแลระบบเท่านั้นที่จัดครูสอนแทนได้', 'error');
      return false;
    }
    if (lessons.length === 0) return false;
    try {
      const created = await substitutesApi.createBatch(lessons);
      setSubstituteLessons(prev => [...created, ...prev]);
      const officialDutyIds = new Set(lessons.map(lesson => lesson.officialDutyId).filter(Boolean));
      if (officialDutyIds.size > 0) {
        setOfficialDuties(prev => prev.map(d => officialDutyIds.has(d.id)
          ? { ...d, substituteScheduled: true, currentStage: 'completed' }
          : d));
      }
      addToast(`จัดสอนแทนสำเร็จ ${created.length} คาบ และส่งแจ้งเตือนแยกตามคาบแล้ว`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกการจัดสอนแทนได้', 'error');
      return false;
    }
  };

  const acknowledgeSubstitute = async (id: string): Promise<boolean> => {
    try {
      const updated = await substitutesApi.acknowledge(id);
      setSubstituteLessons(prev => prev.map(s => s.id === id ? updated : s));
      addToast('รับทราบการสอนแทนเรียบร้อย และแจ้งผู้รับผิดชอบงานวิชาการแล้ว', 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถยืนยันรับทราบการสอนแทนได้', 'error');
      return false;
    }
  };

  // 7. Portfolio
  const addPortfolio = (item: Omit<StaffPortfolio, 'id' | 'createdAt' | 'status'>) => {
    const newId = `PF-${currentBuddhistYear()}-${String(portfolios.length + 1).padStart(3, '0')}`;
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
    const newId = `LP-${currentBuddhistYear()}-${String(lessonPlans.length + 1).padStart(3, '0')}`;
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
    (leaveRequests ?? []).filter(l => l.status === 'pending').length +
    (officialDuties ?? []).filter(o => o.status === 'pending').length +
    (vehicleBookings ?? []).filter(v => v.status === 'pending').length +
    (roomBookings ?? []).filter(r => r.status === 'pending').length +
    (repairTickets ?? []).filter(rp => rp.status === 'pending').length +
    (lessonPlans ?? []).filter(lp => lp.status === 'pending').length;

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
        updateRoom,
        roomBookings,
        addRoomBooking,
        approveRoomBookingByDeputy,
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
        addSubstituteLessons,
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
        pendingApprovalsCount,
        pipelinesConfig,
        savePipelinesConfig
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
