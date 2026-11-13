import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the same counter expression used by the application with isolated records.
const source = readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
const expression = source.match(/const pendingApprovalsByModule: Record<string, number> = (\{[\s\S]*?\n  \});/)?.[1];
assert.ok(expression, 'pending work counters must exist');
function counts(overrides = {}) {
  const env = {
    userId: 'me', pipelinesConfig: [], leaveRequests: [], officialDuties: [], vehicleBookings: [], roomBookings: [], repairTickets: [], substituteLessons: [], rooms: [], documentPendingCounts: { document_workflow: 0, eoffice: 0 },
    getLeaveApproverForRequest: (_p, _stage, item) => item.assignee,
    getOfficialDutyApprover: (_p, stage) => stage === 'secretary_ack' ? 'me' : 'other',
    getPipelineAssignee: (_p, pipe, step) => pipe === 'pipe-substitute' && step === 1 ? 'me' : pipe === 'pipe-room' && step === 2 ? 'me' : pipe === 'pipe-vehicle' && step === 2 ? 'me' : pipe === 'pipe-repair-av' ? 'me' : 'other',
    ...overrides,
  };
  return Function(...Object.keys(env), `return (${expression});`)(...Object.values(env));
}

test('each service counts assigned pending work across all academic periods', () => {
  const old = { academicYear: '2560', semester: '1' };
  const result = counts({
    leaveRequests: [{ ...old, status: 'pending', currentStage: 'admin_review', assignee: 'me' }, { status: 'pending', assignee: 'other' }, { status: 'approved', assignee: 'me' }],
    officialDuties: [{ ...old, status: 'approved' }, { status: 'approved', secretaryCompletedAt: '2020-01-01' }],
    vehicleBookings: [{ ...old, status: 'pending', bookingStage: 'admin_review' }, { status: 'pending', bookingStage: 'driver_ack', assignedDriverId: 'me' }],
    roomBookings: [{ ...old, bookingStage: 'pending_deputy' }, { bookingStage: 'completed' }],
    repairTickets: [{ ...old, repairStage: 'reported', category: 'audio_visual' }, { repairStage: 'user_confirmed', userId: 'me' }],
    substituteLessons: [{ ...old, stage: 'pending_ack', substituteTeacherId: 'me' }, { stage: 'rejected' }, { stage: 'rejected', officialDutyId: 'duty' }, { stage: 'acknowledged', substituteTeacherId: 'me' }],
    documentPendingCounts: { document_workflow: 2, eoffice: 1 },
  });
  assert.deepEqual(result, { leave: 1, official_duty: 1, vehicle: 2, room: 1, repair: 1, substitute: 2, document_workflow: 2, eoffice: 1 });
});

test('completed work and tasks assigned to other users do not count', () => {
  const result = counts({ userId: 'someone-else', leaveRequests: [{ status: 'pending', assignee: 'me' }], vehicleBookings: [{ bookingStage: 'driver_ack', assignedDriverId: 'me' }], substituteLessons: [{ stage: 'pending_ack', substituteTeacherId: 'me' }], officialDuties: [{ status: 'approved', secretaryCompletedAt: '2020-01-01' }] });
  assert.ok(Object.values(result).every(value => value === 0));
});
