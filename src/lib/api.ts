import type { AppNotification, LeaveRequest, MeetingRoom, OfficialDutyRequest, RoomBooking, SubstituteTeaching, User, Vehicle, VehicleBooking } from '../types';

type SessionResponse = {
  status: 'success';
  authenticated: boolean;
  user: User | null;
  passwordChangeRequired: boolean;
  csrfToken: string;
};

type LoginResponse = {
  status: 'success';
  user: User;
  csrfToken: string;
  mustChangePassword: boolean;
};

type ApiErrorBody = { code?: string; message?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'request_failed',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken = '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  if (csrfToken && init.method && init.method !== 'GET') headers.set('X-CSRF-Token', csrfToken);

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่', 0, 'network_error');
  }

  const body = await response.json().catch(() => ({})) as ApiErrorBody & T;
  if (!response.ok) {
    throw new ApiError(body.message || 'เซิร์ฟเวอร์ไม่สามารถดำเนินการได้', response.status, body.code);
  }
  return body;
}

export const authApi = {
  async session(): Promise<SessionResponse> {
    const result = await request<SessionResponse>('/api/auth.php');
    csrfToken = result.csrfToken;
    return result;
  },

  async login(citizenId: string, password: string): Promise<LoginResponse> {
    const result = await request<LoginResponse>('/api/auth.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', citizenId, password }),
    });
    csrfToken = result.csrfToken;
    return result;
  },

  async changePassword(newPassword: string, confirmPassword: string): Promise<User> {
    const result = await request<{ status: 'success'; user: User; csrfToken: string }>('/api/auth.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'change_password', newPassword, confirmPassword }),
    });
    csrfToken = result.csrfToken;
    return result.user;
  },

  async logout(): Promise<void> {
    await request('/api/auth.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
    });
    csrfToken = '';
  },
};

export const adminApi = {
  async listUsers(): Promise<User[]> {
    const result = await request<{ status: 'success'; data: User[] }>('/api/users.php');
    return result.data;
  },

  async resetPassword(userId: string): Promise<string> {
    const result = await request<{ status: 'success'; temporaryPassword: string }>('/api/users.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset_password', userId }),
    });
    return result.temporaryPassword;
  },

  async setRole(userId: string, role: User['role']): Promise<void> {
    await request('/api/users.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'set_role', userId, role }),
    });
  },

  async updateUser(user: User): Promise<User> {
    const result = await request<{ status: 'success'; user: User }>('/api/users.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_profile',
        userId: user.id,
        citizenId: user.citizenId,
        name: user.name,
        position: user.position,
        department: user.department,
        email: user.email,
        phone: user.phone,
      }),
    });
    return result.user;
  },
};

export type LineAccountStatus = {
  linked: boolean;
  linkedAt: string | null;
};

export const lineAccountApi = {
  async status(): Promise<LineAccountStatus> {
    const result = await request<{ status: 'success'; lineAccount: LineAccountStatus }>('/api/line-account.php');
    return result.lineAccount;
  },

  async createCode(): Promise<{ code: string; expiresInSeconds: number; lineOaId: string }> {
    return request('/api/line-account.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'create_code' }),
    });
  },

  async disconnect(): Promise<void> {
    await request('/api/line-account.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'disconnect' }),
    });
  },
};

type NewLeaveRequest = Omit<LeaveRequest, 'id' | 'status' | 'currentStage' | 'createdAt'>;

export const leavesApi = {
  async list(): Promise<LeaveRequest[]> {
    const result = await request<{ status: 'success'; data: LeaveRequest[] }>('/api/leaves.php');
    return result.data;
  },

  async create(leave: NewLeaveRequest): Promise<LeaveRequest> {
    const result = await request<{ status: 'success'; data: LeaveRequest }>('/api/leaves.php', {
      method: 'POST', body: JSON.stringify({ action: 'create', ...leave }),
    });
    return result.data;
  },

  async update(action: 'review' | 'approve_deputy' | 'approve_director' | 'reject', leaveId: string, comment?: string, signatureUrl?: string, stage?: LeaveRequest['currentStage']): Promise<LeaveRequest> {
    const result = await request<{ status: 'success'; data: LeaveRequest }>('/api/leaves.php', {
      method: 'POST', body: JSON.stringify({ action, leaveId, comment, signatureUrl, stage }),
    });
    return result.data;
  },
};

type NewOfficialDutyRequest = Omit<OfficialDutyRequest, 'id' | 'status' | 'currentStage' | 'forwardedToAcademic' | 'substituteScheduled' | 'createdAt'>;

export const officialDutiesApi = {
  async list(): Promise<OfficialDutyRequest[]> {
    const result = await request<{ status: 'success'; data: OfficialDutyRequest[] }>('/api/official-duties.php');
    return result.data;
  },

  async create(duty: NewOfficialDutyRequest): Promise<OfficialDutyRequest> {
    const result = await request<{ status: 'success'; data: OfficialDutyRequest }>('/api/official-duties.php', {
      method: 'POST', body: JSON.stringify({ action: 'create', ...duty }),
    });
    return result.data;
  },

  async update(
    action: 'review' | 'approve_deputy' | 'approve_director' | 'reject',
    dutyId: string,
    comment?: string,
    signatureUrl?: string,
    stage?: OfficialDutyRequest['currentStage'],
  ): Promise<OfficialDutyRequest> {
    const result = await request<{ status: 'success'; data: OfficialDutyRequest }>('/api/official-duties.php', {
      method: 'POST', body: JSON.stringify({ action, dutyId, comment, signatureUrl, stage }),
    });
    return result.data;
  },
};

type NewSubstituteLesson = Omit<SubstituteTeaching, 'id' | 'createdAt' | 'stage'>;

export const substitutesApi = {
  async list(): Promise<SubstituteTeaching[]> {
    const result = await request<{ status: 'success'; data: SubstituteTeaching[] }>('/api/substitutes.php');
    return result.data;
  },

  async createBatch(lessons: NewSubstituteLesson[]): Promise<SubstituteTeaching[]> {
    const result = await request<{ status: 'success'; data: SubstituteTeaching[] }>('/api/substitutes.php', {
      method: 'POST', body: JSON.stringify({ action: 'create_batch', lessons }),
    });
    return result.data;
  },

  async acknowledge(lessonId: string): Promise<SubstituteTeaching> {
    const result = await request<{ status: 'success'; data: SubstituteTeaching }>('/api/substitutes.php', {
      method: 'POST', body: JSON.stringify({ action: 'acknowledge', lessonId }),
    });
    return result.data;
  },
};

type NewVehicleBooking = Omit<VehicleBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>;

export const vehiclesApi = {
  async listFleet(): Promise<Vehicle[]> {
    const result = await request<{ status: 'success'; data: Vehicle[] }>('/api/vehicles.php?action=fleet');
    return result.data;
  },

  async listBookings(): Promise<VehicleBooking[]> {
    const result = await request<{ status: 'success'; data: VehicleBooking[] }>('/api/vehicles.php?action=bookings');
    return result.data;
  },

  async create(booking: NewVehicleBooking): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'create', ...booking }),
    });
    return result.data;
  },

  async allocate(bookingId: string, payload: {
    isRental: boolean; vehicleId?: string; rentalDetails?: string; rentalCost?: number;
    driverId?: string; comment?: string;
  }): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'allocate', bookingId, ...payload }),
    });
    return result.data;
  },

  async driverAck(bookingId: string, comment?: string): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'driver_ack', bookingId, comment }),
    });
    return result.data;
  },

  async reject(bookingId: string, comment?: string): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'reject', bookingId, comment }),
    });
    return result.data;
  },
};

export const notificationsApi = {
  async list(): Promise<AppNotification[]> {
    const result = await request<{ status: 'success'; data: AppNotification[] }>('/api/notifications.php');
    return result.data;
  },
  async markRead(notificationId: string): Promise<void> {
    await request('/api/notifications.php', {
      method: 'POST', body: JSON.stringify({ action: 'mark_read', notificationId }),
    });
  },
};

type NewRoomBooking = Omit<RoomBooking, 'id' | 'bookingStage' | 'status' | 'createdAt'>;

export const roomsApi = {
  async listRooms(): Promise<MeetingRoom[]> {
    const result = await request<{ status: 'success'; data: MeetingRoom[] }>('/api/rooms.php?action=rooms');
    return result.data;
  },

  async listBookings(): Promise<RoomBooking[]> {
    const result = await request<{ status: 'success'; data: RoomBooking[] }>('/api/rooms.php?action=bookings');
    return result.data;
  },

  async create(booking: NewRoomBooking): Promise<RoomBooking> {
    const result = await request<{ status: 'success'; data: RoomBooking }>('/api/rooms.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...booking }),
    });
    return result.data;
  },

  async updateManager(roomId: string, managerIds: string[]): Promise<void> {
    await request('/api/rooms.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_manager', roomId, managerIds }),
    });
  },

  async updateRoom(roomId: string, name: string, location: string, capacity: string): Promise<void> {
    await request('/api/rooms.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_room', roomId, name, location, capacity }),
    });
  },

  async updateBooking(
    action: 'approve' | 'reject' | 'complete',
    bookingId: string,
    comment?: string,
  ): Promise<RoomBooking> {
    const result = await request<{ status: 'success'; data: RoomBooking }>('/api/rooms.php', {
      method: 'POST',
      body: JSON.stringify({ action, bookingId, comment }),
    });
    return result.data;
  },
};

export function isAdminRole(role: User['role']): boolean {
  return role === 'admin' || role === 'director';
}
