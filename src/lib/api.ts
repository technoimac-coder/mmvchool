import type { AppNotification, DocumentWorkflow, DocumentWorkflowRevision, DocumentWorkflowTopic, LeaveRequest, LessonPlan, MeetingRoom, OfficialDutyRequest, RepairTicket, RoomBooking, SchoolNews, SchoolOrder, StaffPortfolio, SubstituteTeaching, User, Vehicle, VehicleBooking } from '../types';

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
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (csrfToken && init.method && init.method !== 'GET') headers.set('X-CSRF-Token', csrfToken);

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่', 0, 'network_error');
  }

  const rawBody = await response.text();
  let body: ApiErrorBody & T;
  try {
    body = (rawBody ? JSON.parse(rawBody) : {}) as ApiErrorBody & T;
  } catch {
    body = {} as ApiErrorBody & T;
  }
  if (!response.ok) {
    if (response.status === 413) throw new ApiError('เซิร์ฟเวอร์จำกัดขนาดไฟล์อัปโหลด กรุณาลดขนาด PDF หรือแจ้งผู้ดูแลตรวจสอบค่าขนาดอัปโหลด', 413, 'upload_limit_exceeded');
    const fallback = rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
    throw new ApiError(body.message || fallback || 'เซิร์ฟเวอร์ไม่สามารถดำเนินการได้', response.status, body.code);
  }
  return body;
}

export const authApi = {
  async session(): Promise<SessionResponse> {
    const result = await request<SessionResponse>('/api/auth.php');
    csrfToken = result.csrfToken;
    return result;
  },

  async login(citizenId: string, password: string, rememberLogin = false): Promise<LoginResponse> {
    const result = await request<LoginResponse>('/api/auth.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', citizenId, password, rememberLogin }),
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

export interface EofficeForward {
  mode: 'none' | 'route' | 'distribute'; recipientIds: string[]; instruction: string; endorsementDate: string;
}
export const documentWorkflowsApi = {
  async deleteSubmission(id: string, fileVersion: number, lifecycleVersion: number): Promise<DocumentWorkflow> {
    const result = await request<{ status: 'success'; data: DocumentWorkflow }>('/api/document_workflows.php', { method: 'POST', body: JSON.stringify({ action: 'delete_submission', id, fileVersion, lifecycleVersion }) });
    return result.data;
  },
  async history(id: string): Promise<DocumentWorkflowRevision[]> {
    const result = await request<{ status: 'success'; data: DocumentWorkflowRevision[] }>('/api/document_workflows.php?history=' + encodeURIComponent(id));
    return result.data;
  },
  async resubmit(id: string, file: File, fileVersion: number, clientRequestId: string): Promise<DocumentWorkflow> {
    const form = new FormData();
    form.set('action', 'resubmit'); form.set('id', id); form.set('fileVersion', String(fileVersion));
    form.set('clientRequestId', clientRequestId); form.set('document', file);
    const result = await request<{ status: 'success'; data: DocumentWorkflow }>('/api/document_workflows.php', { method: 'POST', body: form });
    return result.data;
  },
  async updateMetadata(id: string, title: string, description: string, fileVersion = 1): Promise<DocumentWorkflow> {
    const result = await request<{ status: 'success'; data: DocumentWorkflow }>('/api/document_workflows.php', { method: 'POST', body: JSON.stringify({ action: 'update_metadata', id, title, description, fileVersion }) });
    return result.data;
  },
  async correctSubmission(id: string, metadata: { title: string; topic: DocumentWorkflowTopic; description: string }, file: File | null, fileVersion: number, clientRequestId: string): Promise<DocumentWorkflow> {
    const form = new FormData();
    form.set('action', 'correct_submission'); form.set('id', id); form.set('fileVersion', String(fileVersion));
    form.set('clientRequestId', clientRequestId);
    for (const [key, value] of Object.entries(metadata)) form.set(key, value);
    if (file) form.set('document', file);
    const result = await request<{ status: 'success'; data: DocumentWorkflow }>('/api/document_workflows.php', { method: 'POST', body: form });
    return result.data;
  },
  async list(source?: 'eoffice' | 'personal'): Promise<DocumentWorkflow[]> {
    const query = source === 'eoffice' ? '?source=eoffice' : source === 'personal' ? '?scope=personal' : '';
    const result = await request<{ status: 'success'; data: DocumentWorkflow[] }>(`/api/document_workflows.php${query}`);
    return result.data;
  },
  async create(title: string, topic: DocumentWorkflowTopic, description: string, signerIds: string[], file: File, academicYear = '', semester = '', clientRequestId = '', batchId = ''): Promise<DocumentWorkflow> {
    const form = new FormData();
    form.set('action', 'create'); form.set('title', title); form.set('topic', topic); form.set('description', description); form.set('academicYear', academicYear); form.set('semester', semester);
    signerIds.forEach(id => form.append('signerIds[]', id)); form.set('document', file);
    if (clientRequestId) form.set('clientRequestId', clientRequestId);
    if (batchId) form.set('batchId', batchId);
    const result = await request<{ status: 'success'; data: DocumentWorkflow }>('/api/document_workflows.php', { method: 'POST', body: form });
    return result.data;
  },
  async notifyBatch(batchId: string): Promise<number> {
    const result = await request<{ status: 'success'; data: { notified: number } }>('/api/document_workflows.php', { method: 'POST', body: JSON.stringify({ action: 'notify_batch', batchId }) });
    return result.data.notified;
  },
  async sign(id: string, signatureData: string, placement: { page: number; x: number; y: number; width: number; height: number; commentPlacement?: { page: number; x: number; y: number; width: number; height: number }; textPlacement?: { page: number; x: number; y: number; width: number; height: number; fontSize?: number; textAlign?: 'left' | 'center' | 'right' }; checkmarksPlacement?: { page: number; x: number; y: number; width: number; height: number } }, comment = '', checkmarks: { noted?: boolean; approved?: boolean } = {}, commentImage = '', placements: Array<{ page: number; x: number; y: number; width: number; height: number }> = [], textAnnotations: Array<{ text: string; placement: { page: number; x: number; y: number; width: number; height: number; fontSize?: number; textAlign?: 'left' | 'center' | 'right' } }> = [], eofficeForward?: EofficeForward, fileVersion = 1): Promise<DocumentWorkflow> {
    const result = await request<{ status: 'success'; data: DocumentWorkflow }>('/api/document_workflows.php', { method: 'POST', body: JSON.stringify({ action: 'sign', id, signatureData, placement, placements, textAnnotations, comment, commentImage, checkmarks, eofficeForward, fileVersion }) });
    return result.data;
  },
  async reject(id: string, comment: string, commentImage = '', fileVersion = 1): Promise<DocumentWorkflow> {
    const result = await request<{ status: 'success'; data: DocumentWorkflow }>('/api/document_workflows.php', { method: 'POST', body: JSON.stringify({ action: 'reject', id, comment, commentImage, fileVersion }) });
    return result.data;
  },
};

export const usersApi = {
  async list(): Promise<User[]> {
    const result = await request<{ status: 'success'; data: User[] }>('/api/users.php');
    return result.data;
  },
};

export interface IncomingBook {
  initial_note?: string;
  attachments?: Array<{id:string;file_name:string}>;
  recipient?: string; page_count?: number; signing_page?: number; stamp_enabled?: number;
  stage?: string; follow_date?: string; signing_status?: string; created_at?: string;
  tasks?: Array<{id: number; user_id: string; user_name: string; instruction: string; status: string; report?: string; acknowledged_at?: string; completed_at?: string}>;
  history?: Array<{id: number; actor_name: string; action: string; note: string; created_at: string}>;
  responsible_id?: string; responsible_name?: string; workflow_id?: string;
  id: string; receipt_no: string; academic_year: string; book_no: string; title: string;
  sender: string; book_date: string; received_date: string; urgency: string; details: string;
  file_name: string; created_by_name: string;
}
export interface EofficeSignatureProfile { position:string; school:string; signatureData:string }
export const eofficeSignatureApi={
 async get():Promise<EofficeSignatureProfile|null>{return (await request<{data:EofficeSignatureProfile|null}>('/api/eoffice-signature.php')).data;},
 async save(profile:EofficeSignatureProfile):Promise<void>{await request('/api/eoffice-signature.php',{method:'POST',body:JSON.stringify(profile)});},
};
export const eofficeApi = {
  async update(id: string, body: FormData): Promise<void> {
    body.set('action', 'update'); body.set('id', id);
    await request('/api/eoffice.php', { method: 'POST', body });
  },
  async action(id: string, action: string, values: { userIds?: string[]; note?: string; followDate?: string } = {}): Promise<void> {
    const body = new FormData(); body.set('id', id); body.set('action', action);
    body.set('note', values.note || ''); body.set('follow_date', values.followDate || '');
    values.userIds?.forEach(value => body.append('user_ids[]', value));
    await request('/api/eoffice.php', { method: 'POST', body });
  },
  async assign(id: string, responsibleId: string): Promise<void> {
    const body = new FormData(); body.set('action', 'assign'); body.set('id', id); body.set('responsible_id', responsibleId);
    await request('/api/eoffice.php', { method: 'POST', body });
  },
  async list(): Promise<IncomingBook[]> {
    return (await request<{ data: IncomingBook[] }>('/api/eoffice.php')).data;
  },
  async create(body: FormData): Promise<{id: string; workflowId?: string}> {
    return request('/api/eoffice.php', { method: 'POST', body });
  },
};

export const contentApi = {
  async list(): Promise<{ news: SchoolNews[]; orders: SchoolOrder[] }> {
    const result = await request<{ status: 'success'; news: SchoolNews[]; orders: SchoolOrder[] }>('/api/content.php');
    return { news: result.news, orders: result.orders };
  },

  async createNews(news: Omit<SchoolNews, 'id' | 'date'>, image?: File): Promise<SchoolNews> {
    const formData = new FormData();
    formData.set('action', 'create_news');
    formData.set('title', news.title);
    formData.set('content', news.content);
    formData.set('category', news.category);
    formData.set('imageUrl', news.imageUrl || '');
    formData.set('isPinned', news.isPinned ? '1' : '0');
    formData.set('attachmentUrl', news.attachmentUrl || '');
    formData.set('attachmentName', news.attachmentName || '');
    formData.set('academicYear', news.academicYear || '');
    formData.set('semester', news.semester || '');
    if (image) formData.set('image', image);
    const result = await request<{ status: 'success'; data: SchoolNews }>('/api/content.php', {
      method: 'POST',
      body: formData,
    });
    return result.data;
  },

  async createOrder(order: Omit<SchoolOrder, 'id'>, document: File): Promise<SchoolOrder> {
    const formData = new FormData();
    formData.set('action', 'create_order');
    formData.set('orderNumber', order.orderNumber);
    formData.set('title', order.title);
    formData.set('category', order.category);
    formData.set('signDate', order.signDate);
    formData.set('signedBy', order.signedBy);
    formData.set('department', order.department);
    formData.set('academicYear', order.academicYear || '');
    formData.set('semester', order.semester || '');
    formData.set('document', document);
    const result = await request<{ status: 'success'; data: SchoolOrder }>('/api/content.php', {
      method: 'POST',
      body: formData,
    });
    return result.data;
  },
};

export const adminApi = {
  async listUsers(): Promise<User[]> {
    const result = await request<{ status: 'success'; data: User[] }>('/api/users.php?view=admin');
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

  async updateUser(user: User): Promise<User & { loginCitizenId?: string; temporaryPassword?: string }> {
    const result = await request<{ status: 'success'; user: User; loginCitizenId?: string; temporaryPassword?: string }>('/api/users.php', {
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
        photoUrl: user.photoUrl,
        role: user.role,
        personnelType: user.personnelType,
        assignments: user.assignments,
      }),
    });
    return Object.assign(result.user, {
      loginCitizenId: result.loginCitizenId,
      temporaryPassword: result.temporaryPassword,
    });
  },

  async deleteUser(userId: string): Promise<void> {
    await request('/api/users.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', userId }),
    });
  },

  async bulkUpdatePhotos(photoMap: { [userId: string]: string }): Promise<void> {
    await request('/api/users.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'bulk_update_photos',
        photoMap,
      }),
    });
  },

  async listAuditLogs(limit = 200): Promise<Array<{
    id: string;
    userId: string;
    user: string;
    action: string;
    details: string;
    type: string;
    createdAt: string;
  }>> {
    const result = await request<{
      status: 'success';
      data: Array<{ id: string; userId: string; user: string; action: string; details: string; type: string; createdAt: string }>;
    }>(`/api/audit-logs.php?limit=${Math.max(1, Math.min(500, limit))}`);
    return result.data;
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

  async reject(lessonId: string, reason?: string): Promise<SubstituteTeaching> {
    const result = await request<{ status: 'success'; data: SubstituteTeaching }>('/api/substitutes.php', {
      method: 'POST', body: JSON.stringify({ action: 'reject', lessonId, reason }),
    });
    return result.data;
  },

  async reassign(lessonId: string, substituteTeacherId: string): Promise<SubstituteTeaching> {
    const result = await request<{ status: 'success'; data: SubstituteTeaching }>('/api/substitutes.php', {
      method: 'POST', body: JSON.stringify({ action: 'reassign', lessonId, substituteTeacherId }),
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

  async updateRequest(bookingId: string, booking: NewVehicleBooking, requestVersion: number): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ ...booking, action: 'update_request', bookingId, requestVersion }),
    });
    return result.data;
  },

  async saveFleet(vehicle: Vehicle): Promise<Vehicle> {
    const result = await request<{ status: 'success'; data: Vehicle }>('/api/vehicles.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save_fleet', vehicleId: vehicle.id, name: vehicle.name,
        licensePlate: vehicle.licensePlate, type: vehicle.type, capacity: vehicle.capacity,
        driverId: vehicle.driverId, status: vehicle.status, province: vehicle.province,
        model: vehicle.model,
      }),
    });
    return result.data;
  },

  async review(bookingId: string, comment?: string, requestVersion = 1): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'review', bookingId, comment, requestVersion }),
    });
    return result.data;
  },

  async allocate(bookingId: string, payload: {
    isRental: boolean; vehicleId?: string; rentalDetails?: string; rentalCost?: number;
    driverId?: string; comment?: string;
  }, requestVersion = 1): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'allocate', bookingId, ...payload, requestVersion }),
    });
    return result.data;
  },

  async driverAck(bookingId: string, comment?: string, requestVersion = 1): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'driver_ack', bookingId, comment, requestVersion }),
    });
    return result.data;
  },

  async reject(bookingId: string, comment?: string, requestVersion = 1): Promise<VehicleBooking> {
    const result = await request<{ status: 'success'; data: VehicleBooking }>('/api/vehicles.php', {
      method: 'POST', body: JSON.stringify({ action: 'reject', bookingId, comment, requestVersion }),
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
  async markAllRead(): Promise<void> {
    await request('/api/notifications.php', {
      method: 'POST', body: JSON.stringify({ action: 'mark_all_read' }),
    });
  },
  async markRelatedRead(module: AppNotification['module'], relatedId: string): Promise<void> {
    await request('/api/notifications.php', {
      method: 'POST', body: JSON.stringify({ action: 'mark_related_read', module, relatedId }),
    });
  },

  async create(userIds: string[], title: string, message: string, module = 'system'): Promise<void> {
    await request('/api/notifications.php', {
      method: 'POST', body: JSON.stringify({ action: 'create', userIds, title, message, module }),
    });
  },

};

export type SchoolSettings = {
  name: string;
  org: string;
  year: string;
  semester: string;
  phone: string;
  email: string;
  directorName: string;
  directorPosition: string;
};

export const settingsApi = {
  async list(): Promise<Record<string, unknown>> {
    const result = await request<{ status: 'success'; data: Record<string, unknown> }>('/api/settings.php');
    return result.data;
  },
  async save<T>(key: string, value: T): Promise<void> {
    await request('/api/settings.php', {
      method: 'POST', body: JSON.stringify({ key, value }),
    });
  },
};

export type SystemDiagnostics = {
  ready: boolean;
  database: { missingTables: string[]; recentNotifications: number };
  line: { enabled: boolean; mode: string; targetCount: number };
  workflowRecipients: Array<{ id: string; name: string; status: string; line_linked: number }>;
  invalidRecipients: Array<{ id: string; name: string; status: string; line_linked: number }>;
};

export const diagnosticsApi = {
  async inspect(): Promise<SystemDiagnostics> {
    return request<SystemDiagnostics & { status: 'success' }>('/api/diagnostics.php');
  },
  async sendTest(): Promise<{ webNotification: boolean; lineNotification: boolean }> {
    return request<{ status: 'success'; webNotification: boolean; lineNotification: boolean }>('/api/diagnostics.php', {
      method: 'POST', body: JSON.stringify({ action: 'send_test' }),
    });
  },
};

type NewRepairTicket = Omit<RepairTicket, 'id' | 'repairStage' | 'status' | 'createdAt'>;
export const repairsApi = {
  async list(): Promise<RepairTicket[]> {
    const result = await request<{ status: 'success'; data: RepairTicket[] }>('/api/repairs.php');
    return result.data;
  },
  async create(ticket: NewRepairTicket): Promise<RepairTicket> {
    const result = await request<{ status: 'success'; data: RepairTicket }>('/api/repairs.php', { method: 'POST', body: JSON.stringify({ action: 'create', ...ticket }) });
    return result.data;
  },
  async update(action: 'acknowledge_assign' | 'technician_report' | 'confirm' | 'reject', repairId: string, payload: Record<string, unknown> = {}): Promise<RepairTicket> {
    const result = await request<{ status: 'success'; data: RepairTicket }>('/api/repairs.php', { method: 'POST', body: JSON.stringify({ action, repairId, ...payload }) });
    return result.data;
  },
};

type NewStaffPortfolio = Omit<StaffPortfolio, 'id' | 'userId' | 'userName' | 'department' | 'attachments' | 'status' | 'createdAt'>;

export const portfoliosApi = {
  async list(): Promise<StaffPortfolio[]> {
    const result = await request<{ status: 'success'; data: StaffPortfolio[] }>('/api/portfolios.php');
    return result.data;
  },

  async create(item: NewStaffPortfolio, attachments: File[]): Promise<StaffPortfolio> {
    const body = new FormData();
    body.append('action', 'create');
    body.append('title', item.title);
    body.append('category', item.category);
    body.append('semester', item.semester);
    body.append('academicYear', item.academicYear);
    body.append('dateReceived', item.dateReceived);
    body.append('organizer', item.organizer);
    body.append('description', item.description);
    attachments.forEach(file => body.append('attachments[]', file));
    const result = await request<{ status: 'success'; data: StaffPortfolio }>('/api/portfolios.php', {
      method: 'POST',
      body,
    });
    return result.data;
  },
};

type NewLessonPlan = Omit<LessonPlan, 'id' | 'userId' | 'userName' | 'department' | 'status' | 'createdAt'>;

export const lessonPlansApi = {
  async list(): Promise<LessonPlan[]> {
    const result = await request<{ status: 'success'; data: LessonPlan[] }>('/api/lesson-plans.php');
    return result.data;
  },
  async create(plan: NewLessonPlan, file?: File): Promise<LessonPlan> {
    const body = new FormData();
    body.set('action', 'create');
    Object.entries(plan).forEach(([key, value]) => { if (value !== undefined && value !== null) body.set(key, String(value)); });
    if (file) body.set('document', file);
    const result = await request<{ status: 'success'; data: LessonPlan }>('/api/lesson-plans.php', {
      method: 'POST', body,
    });
    return result.data;
  },
  async review(lessonPlanId: string, status: LessonPlan['status'], score?: number, comment?: string): Promise<LessonPlan> {
    const result = await request<{ status: 'success'; data: LessonPlan }>('/api/lesson-plans.php', {
      method: 'POST', body: JSON.stringify({ action: 'review', lessonPlanId, status, score, comment }),
    });
    return result.data;
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

  async updateRoom(roomId: string, name: string, location: string, capacity: string, image?: string): Promise<void> {
    await request('/api/rooms.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_room', roomId, name, location, capacity, image }),
    });
  },

  async updateBooking(
    action: 'approve_deputy' | 'approve' | 'reject' | 'complete',
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

export interface ApprovalStep {
  stepNumber: number;
  stepName: string;
  assignedUserId: string;
  description: string;
}

export interface WorkflowPipeline {
  id: string;
  systemName: string;
  icon: string;
  color: string;
  steps: ApprovalStep[];
}

export const pipelinesApi = {
  async listPipelines(): Promise<WorkflowPipeline[]> {
    return await request<WorkflowPipeline[]>('/api/pipelines.php', {
      method: 'GET',
    });
  },

  async savePipelines(pipelines: WorkflowPipeline[]): Promise<void> {
    await request('/api/pipelines.php', {
      method: 'POST',
      body: JSON.stringify(pipelines),
    });
  },
};

export function isAdminRole(role: User['role']): boolean {
  return role === 'admin' || role === 'director';
}
