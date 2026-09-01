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
import { ApiError, adminApi, contentApi, usersApi, leavesApi, notificationsApi, officialDutiesApi, repairsApi, roomsApi, substitutesApi, vehiclesApi, pipelinesApi, WorkflowPipeline } from '../lib/api';
import {
  getLeaveApproverForRequest,
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
  saveVehicle: (vehicle: Vehicle) => Promise<boolean>;
  vehicleBookings: VehicleBooking[];
  addVehicleBooking: (booking: Omit<VehicleBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>) => Promise<boolean>;
  reviewVehicleByAdmin: (id: string, comment?: string) => Promise<boolean>;
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
  acknowledgeAndAssignRepair: (id: string, payload: { technicianId: string; technicianName: string; comment?: string }) => Promise<boolean>;
  submitRepairReportByTechnician: (id: string, payload: { repairDetails: string; repairPhotoUrl?: string }) => Promise<boolean>;
  confirmRepairByUser: (id: string, payload: { rating?: number; comment?: string }) => Promise<boolean>;
  rejectRepair: (id: string, comment?: string) => Promise<boolean>;

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
  addSchoolNews: (news: Omit<SchoolNews, 'id' | 'date'>) => Promise<boolean>;
  schoolOrders: SchoolOrder[];
  addSchoolOrder: (order: Omit<SchoolOrder, 'id'>, document: File) => Promise<boolean>;
  schoolEvents: SchoolEvent[];
  addSchoolEvent: (event: Omit<SchoolEvent, 'id'>) => void;

  // Global & Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markRelatedNotificationsAsRead: (module: AppNotification['module'], relatedId: string) => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], title?: string) => void;
  removeToast: (id: string) => void;
  pendingApprovalsCount: number;
  pendingApprovalsByModule: Record<string, number>;
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
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
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
  const [rooms, setRooms] = useState<MeetingRoom[]>(mockMeetingRooms);

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

  // MySQL is the only source of truth for workflow assignments.
  const [pipelinesConfig, setPipelinesConfig] = useState<WorkflowPipeline[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    pipelinesApi.listPipelines()
      .then((serverPipes) => {
        if (!cancelled && serverPipes && serverPipes.length > 0) {
          setPipelinesConfig(serverPipes);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);

  const savePipelinesConfig = async (pipelines: WorkflowPipeline[]): Promise<boolean> => {
    try {
      await pipelinesApi.savePipelines(pipelines);
      // Read back from the server so the UI only reports success for the
      // configuration that was actually persisted, never a local optimistic copy.
      const confirmed = await pipelinesApi.listPipelines();
      if (!confirmed.length) throw new ApiError('เซิร์ฟเวอร์ไม่ส่งค่าขั้นตอนกลับมา', 500, 'pipeline_not_persisted');
      setPipelinesConfig(confirmed);
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกขั้นตอนการอนุมัติได้', 'error');
      return false;
    }
  };

  const [repairTickets, setRepairTickets] = useState<RepairTicket[]>(initialRepairTickets);
  useEffect(() => {
    let cancelled = false;
    const loadRepairs = () => repairsApi.list().then(data => { if (!cancelled) setRepairTickets(data); }).catch((error: unknown) => {
      if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) addToast(error.message, 'error');
    });
    void loadRepairs();
    // ผู้รับผิดชอบอาจเปิดระบบค้างไว้ก่อนมีการมอบหมายงาน จึงต้องดึงรายการ
    // ใหม่เป็นระยะ ไม่ให้แจ้งเตือนมาแล้วแต่ตารางยังคงเป็นข้อมูลเก่า
    const timer = window.setInterval(() => void loadRepairs(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [addToast, currentUser]);

  const saveVehicle = async (vehicle: Vehicle): Promise<boolean> => {
    try {
      const saved = await vehiclesApi.saveFleet(vehicle);
      setVehicles(prev => prev.some(item => item.id === saved.id)
        ? prev.map(item => item.id === saved.id ? saved : item)
        : [...prev, saved]);
      addToast('บันทึกข้อมูลรถยนต์ลงฐานข้อมูลเรียบร้อยแล้ว', 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกข้อมูลรถยนต์ได้', 'error');
      return false;
    }
  };
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

  useEffect(() => {
    let cancelled = false;
    contentApi.list().then(({ news, orders }) => {
      if (!cancelled) {
        setSchoolNews(news);
        setSchoolOrders(orders);
      }
    }).catch((error: unknown) => {
      if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) {
        addToast(error.message, 'error');
      }
    });
    return () => { cancelled = true; };
  }, [addToast, currentUser]);

  const addSchoolNews = async (news: Omit<SchoolNews, 'id' | 'date'>): Promise<boolean> => {
    try {
      const item = await contentApi.createNews(news);
      setSchoolNews(prev => [item, ...prev.filter(existing => existing.id !== item.id)]);
      addToast('เผยแพร่ข่าวประชาสัมพันธ์และบันทึกลงฐานข้อมูลแล้ว', 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกข่าวประชาสัมพันธ์ได้', 'error');
      return false;
    }
  };

  const addSchoolOrder = async (order: Omit<SchoolOrder, 'id'>, document: File): Promise<boolean> => {
    try {
      const item = await contentApi.createOrder(order, document);
      setSchoolOrders(prev => [item, ...prev.filter(existing => existing.id !== item.id)]);
      addToast(`เผยแพร่คำสั่ง ${order.orderNumber} และบันทึกลงฐานข้อมูลแล้ว`, 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกคำสั่งโรงเรียนได้', 'error');
      return false;
    }
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
    usersApi.list()
      .then(serverUsers => {
        if (!cancelled) {
          setUsersList(serverUsers);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && !['unauthenticated', 'password_change_required'].includes(error.code)) {
          addToast(`โหลดข้อมูลบัญชีบุคลากรจาก users ไม่สำเร็จ: ${error.message}`, 'error');
        }
      });
    return () => { cancelled = true; };
  }, [addToast, currentUser]);
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
    const request = leaveRequests.find(item => item.id === id);
    if (currentUser.id !== getLeaveApproverForRequest(pipelinesConfig, 'admin_review', request)) {
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
    const request = leaveRequests.find(item => item.id === id);
    if (currentUser.id !== getLeaveApproverForRequest(pipelinesConfig, 'deputy_approval', request)) {
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
    const request = leaveRequests.find(item => item.id === id);
    if (currentUser.id !== getLeaveApproverForRequest(pipelinesConfig, 'director_approval', request)) {
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
    const request = leaveRequests.find(item => item.id === id);
    if (currentUser.id !== getLeaveApproverForRequest(pipelinesConfig, expectedStage, request)) {
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
      addToast('อนุมัติแล้ว และแจ้งผู้ยื่นทางเว็บและ LINE', 'success');
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

  const reviewVehicleByAdmin = async (id: string, comment?: string): Promise<boolean> => {
    try {
      const updated = await vehiclesApi.review(id, comment);
      setVehicleBookings(prev => prev.map(booking => booking.id === id ? updated : booking));
      addToast('ผู้ตรวจสอบรับทราบแล้ว ➔ ส่งต่อรองผู้อำนวยการเพื่ออนุมัติและจัดสรรรถ', 'success');
      return true;
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถบันทึกผลการตรวจสอบได้', 'error');
      return false;
    }
  };
  const markRelatedNotificationsAsRead = useCallback((module: AppNotification['module'], relatedId: string) => {
    setNotifications(prev => {
      if (!prev.some(notification => !notification.read && notification.module === module && notification.relatedId === relatedId)) return prev;
      return prev.map(notification => notification.module === module && notification.relatedId === relatedId ? { ...notification, read: true } : notification);
    });
    void notificationsApi.markRelatedRead(module, relatedId).catch(() => undefined);
  }, []);

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
    void repairsApi.create(ticket).then(created => {
      setRepairTickets(prev => [created, ...prev.filter(item => item.id !== newId)]);
      addToast(`แจ้งซ่อมรหัส ${created.id} สำเร็จ และบันทึกลงฐานข้อมูลแล้ว`, 'success');
    }).catch((error: unknown) => {
      setRepairTickets(prev => prev.filter(item => item.id !== newId));
      addToast(error instanceof ApiError ? error.message : 'บันทึกรายการแจ้งซ่อมลงฐานข้อมูลไม่สำเร็จ', 'error');
    });

    // The API is the source of truth for notifications. Do not show a local
    // success notification before the database insert succeeds.
  };

  const acknowledgeAndAssignRepair = async (id: string, payload: { technicianId: string; technicianName: string; comment?: string }): Promise<boolean> => {
    const ticket = repairTickets.find(item => item.id === id);
    if (!ticket) return false;
    const isAV = ticket.category === 'audio_visual' || ticket.category === 'computer_network';
    const pipelineId = isAV ? 'pipe-repair-av' : 'pipe-repair-build';
    const fallbackManagerId = isAV ? 'MMV96' : 'MMV03';
    const managerId = getPipelineAssignee(pipelinesConfig, pipelineId, 2, fallbackManagerId);
    if (currentUser.id !== managerId) {
      addToast(isAV ? 'รายการนี้ไม่ใช่ขั้นตอนดำเนินการของผู้ดูแลโสตฯ/ไอที' : 'รายการนี้ต้องให้รองผู้อำนวยการที่กำหนดเป็นผู้มอบหมายงาน', 'error');
      return false;
    }
    try {
      const updated = await repairsApi.update('acknowledge_assign', id, payload);
      setRepairTickets(prev => prev.map(item => item.id === id ? updated : item));
      addToast(isAV
        ? 'รับแจ้งแล้ว ➔ เริ่มดำเนินการซ่อมได้ทันที'
        : `บันทึกลงฐานข้อมูลแล้ว ➔ มอบหมาย ${updated.assignedTechnician || payload.technicianName}`, 'success');
      return true;
    } catch (error: unknown) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกการมอบหมายลงฐานข้อมูลไม่สำเร็จ', 'error');
      return false;
    }
  };

  const submitRepairReportByTechnician = async (id: string, payload: { repairDetails: string; repairPhotoUrl?: string }): Promise<boolean> => {
    try {
      const updated = await repairsApi.update('technician_report', id, payload);
      setRepairTickets(prev => prev.map(item => item.id === id ? updated : item));
      addToast('บันทึกผลการซ่อมและรูปงานลงฐานข้อมูลแล้ว ➔ ส่งแจ้งเตือนผู้แจ้งตรวจรับ', 'success');
      return true;
    } catch (error: unknown) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกผลการซ่อมลงฐานข้อมูลไม่สำเร็จ', 'error');
      return false;
    }
  };

  const confirmRepairByUser = async (id: string, payload: { rating?: number; comment?: string }): Promise<boolean> => {
    try {
      const updated = await repairsApi.update('confirm', id, payload);
      setRepairTickets(prev => prev.map(item => item.id === id ? updated : item));
      addToast('บันทึกการตรวจรับลงฐานข้อมูลแล้ว (ปิดงานซ่อมสมบูรณ์)', 'success');
      return true;
    } catch (error: unknown) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกการตรวจรับลงฐานข้อมูลไม่สำเร็จ', 'error');
      return false;
    }
  };

  const rejectRepair = async (id: string, comment?: string): Promise<boolean> => {
    try {
      const updated = await repairsApi.update('reject', id, { comment });
      setRepairTickets(prev => prev.map(item => item.id === id ? updated : item));
      addToast('บันทึกการปฏิเสธลงฐานข้อมูลแล้ว', 'warning');
      return true;
    } catch (error: unknown) {
      addToast(error instanceof ApiError ? error.message : 'บันทึกการปฏิเสธลงฐานข้อมูลไม่สำเร็จ', 'error');
      return false;
    }
  };

  // 6. Substitute (จัดสอนแทน ➔ แจ้งครูสอนแทนทราบ ➔ สรุปการสอนแทน ➔ แจ้ง รอง ผอ.วิชาการ)
  const addSubstituteLessons = async (lessons: Array<Omit<SubstituteTeaching, 'id' | 'createdAt' | 'stage'>>): Promise<boolean> => {
    const substituteManagerId = getPipelineAssignee(pipelinesConfig, 'pipe-substitute', 1, 'MMV90');
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

  const pendingApprovalsByModule: Record<string, number> = {
    leave: (leaveRequests ?? []).filter(l => l.status === 'pending').length,
    official_duty: (officialDuties ?? []).filter(o => o.status === 'pending').length,
    vehicle: (vehicleBookings ?? []).filter(v => v.status === 'pending').length,
    room: (roomBookings ?? []).filter(r => r.status === 'pending').length,
    repair: (repairTickets ?? []).filter(rp => rp.status === 'pending').length,
    lesson_plan: (lessonPlans ?? []).filter(lp => lp.status === 'pending').length,
  };
  const pendingApprovalsCount = Object.values(pendingApprovalsByModule)
    .reduce((total, count) => total + count, 0);

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
        saveVehicle,
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
        markRelatedNotificationsAsRead,
        toasts,
        addToast,
        removeToast,
        pendingApprovalsCount,
        pendingApprovalsByModule,
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
