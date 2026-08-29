import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('workflow authorization reads assignments from MySQL before the bundled fallback', () => {
  const source = read('public/api/db.php');
  const databaseLookup = source.indexOf("SELECT pipeline_json FROM approval_pipelines");
  const fallbackLookup = source.indexOf("pipelines_config.json");
  assert.ok(databaseLookup >= 0, 'approval_pipelines lookup is required');
  assert.ok(fallbackLookup > databaseLookup, 'JSON must only be a fallback after MySQL');
});

test('every core workflow persists web notifications and attempts linked LINE delivery', () => {
  for (const endpoint of ['leaves.php', 'official-duties.php', 'vehicles.php', 'rooms.php', 'repairs.php', 'substitutes.php']) {
    const source = read(`public/api/${endpoint}`);
    assert.match(source, /INSERT INTO notifications/, `${endpoint} must persist a web notification`);
    assert.match(source, /line_notify_linked_users/, `${endpoint} must notify only linked recipient accounts`);
  }
});

test('authoritative admin settings are persisted by APIs, not browser storage', () => {
  const context = read('src/context/AppContext.tsx');
  const consoleModule = read('src/components/modules/AdminConsoleModule.tsx');
  assert.doesNotMatch(context, /getItem\('mmv_admin_(vehicles|rooms|pipelines)/);
  assert.doesNotMatch(consoleModule, /localStorage/);
  assert.match(read('public/api/vehicles.php'), /ON DUPLICATE KEY UPDATE/);
  assert.match(read('public/api/settings.php'), /system_settings/);
});

test('password policy is consistently six characters in frontend and API', () => {
  assert.match(read('src/components/LoginScreen.tsx'), /minLength=\{6\}/);
  assert.match(read('public/api/auth.php'), /strlen\(\$newPassword\) < 6/);
});

test('driver LINE acknowledgement notifies both requester and allocator', () => {
  const source = read('public/api/vehicles.php');
  assert.match(source, /\$booking\['user_id'\], workflow_assignee\('pipe-vehicle', 3, 'MMV04'\)/);
  assert.match(source, /driver_ack_token_hash/);
});

test('leave and official-duty records are private to the owner unless reviewer or executive', () => {
  const leaveSource = read('public/api/leaves.php');
  const dutySource = read('public/api/official-duties.php');

  assert.match(leaveSource, /can_view_all_leave_records\(\$currentUser, \$leaveApprovers\)/);
  assert.match(dutySource, /can_view_all_duty_records\(\$currentUser, \$dutyApprovers\)/);
  assert.match(leaveSource, /WHERE user_id = \? ORDER BY created_at DESC/);
  assert.match(dutySource, /WHERE user_id = \? ORDER BY created_at DESC/);
  assert.doesNotMatch(leaveSource, /WHERE user_id = \? OR user_name = \?/);
  assert.doesNotMatch(dutySource, /DUTY_ACADEMIC_MANAGER_IDS/);
});

test('repair records and transitions are bound to immutable user IDs and current workflow state', () => {
  const source = read('public/api/repairs.php');

  assert.match(source, /WHERE assigned_technician_id=\? OR user_id=\?/);
  assert.doesNotMatch(source, /assigned_technician=\? OR user_id=\? OR user_name=\?/);
  assert.match(source, /repair_stage='reported' AND status='pending'/);
  assert.match(source, /repair_stage='head_acknowledged' AND status='in_progress' AND assigned_technician_id=\?/);
  assert.match(source, /repair_stage='repaired_pending_confirm' AND status='in_progress' AND user_id=\?/);
  assert.match(source, /if \(\(string\)\$currentUser\['id'\]!==\$ticket\['user_id'\]\) api_error\('เฉพาะผู้แจ้งเท่านั้นที่ยืนยันงานได้'/);
});
