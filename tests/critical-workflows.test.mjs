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

test('opening a related record clears its unread bell notification', () => {
  const endpoint = read('public/api/notifications.php');
  const context = read('src/context/AppContext.tsx');
  const moduleFiles = {
    leave: 'LeaveModule.tsx',
    official_duty: 'OfficialDutyModule.tsx',
    vehicle: 'VehicleModule.tsx',
    room: 'RoomBookingModule.tsx',
    repair: 'RepairModule.tsx',
    substitute: 'SubstituteModule.tsx',
    portfolio: 'PortfolioModule.tsx',
    lesson_plan: 'LessonPlanModule.tsx',
  };

  assert.match(endpoint, /SELECT id, title, message, module, related_id, read_at, created_at/);
  assert.match(endpoint, /if \(\$action === 'mark_related_read'\)/);
  assert.match(endpoint, /WHERE user_id = \? AND module = \? AND related_id = \?/);
  assert.match(context, /markRelatedNotificationsAsRead/);
  assert.match(context, /notificationsApi\.markRelatedRead\(module, relatedId\)/);
  for (const [module, file] of Object.entries(moduleFiles)) {
    assert.match(read(`src/components/modules/${file}`), new RegExp(`markRelatedNotificationsAsRead\\('${module}'`));
  }
});

test('repair reports notify only the single reviewer configured in Admin Console', () => {
  const source = read('public/api/repairs.php');

  assert.match(source, /function repair_manager\(PDO \$db, string \$configuredUserId\)/);
  assert.match(source, /SELECT id FROM users WHERE id=\? AND status='active' LIMIT 1/);
  assert.doesNotMatch(source, /array_unique\(\[\$preferred, 'MMV96', 'MMV97'\]\)/);
  assert.doesNotMatch(source, /role IN \('admin','director'\) ORDER BY id LIMIT 1/);
  assert.match(source, /repair_notify\(\$database,\$managerId,'มีรายการแจ้งซ่อมใหม่รอตรวจสอบ'/);
});

test('audiovisual and IT repair reviewer starts work directly without assigning another technician', () => {
  const endpoint = read('public/api/repairs.php');
  const module = read('src/components/modules/RepairModule.tsx');

  assert.match(endpoint, /\$isSingleAvHandler = \$isAvTicket/);
  assert.match(endpoint, /\$input\['technicianId'\] = \$managerId/);
  assert.match(endpoint, /if \(!\$isSingleAvHandler\) \{/);
  assert.match(module, /!getCategoryInfo\(selectedTicket\.category\)\.isAV/);
  assert.match(module, /รับแจ้ง & เริ่มดำเนินการ/);
});

test('new repair form exposes only audiovisual and building work streams', () => {
  const endpoint = read('public/api/repairs.php');
  const module = read('src/components/modules/RepairModule.tsx');

  assert.match(module, /<option value="audio_visual">🖥️ งานโสตฯ — \{getAssignedManagerName\('audio_visual'\)\}<\/option>/);
  assert.match(module, /<option value="building">🏛️ งานอาคารสถานที่<\/option>/);
  assert.doesNotMatch(module, /<option value="computer_network">/);
  assert.doesNotMatch(module, /<option value="electricity">/);
  assert.match(endpoint, /in_array\(\$category, \['audio_visual', 'building'\], true\)/);
  assert.match(module, /\$\{getAssignedManagerName\(category\)\} \(รองผู้อำนวยการฝ่ายทั่วไป\)/);
  assert.doesNotMatch(module, /และ รองผู้อำนวยการฝ่ายทั่วไป \(นายไชยวัฒน์ บุญมี\)/);
});

test('new official-duty requests validate and notify the configured deputy directly', () => {
  const source = read('public/api/official-duties.php');

  assert.match(source, /function duty_active_assignee\(PDO \$database, string \$configuredUserId, string \$stepLabel\)/);
  assert.match(source, /\$deputyRecipientId = duty_active_assignee\(/);
  assert.match(source, /\$recipients = \[\$deputyRecipientId\]/);
  assert.match(source, /มีคำขอไปราชการใหม่รอตรวจสอบและเสนอความเห็น/);
});

test('new Thai and foreign personnel accounts accept unique 12- or 13-digit logins', () => {
  const usersApi = read('public/api/users.php');
  const adminConsole = read('src/components/modules/AdminConsoleModule.tsx');
  assert.match(usersApi, /!\$userExists && !in_array\(strlen\(\$citizenId\), \[12, 13\], true\)/);
  assert.match(usersApi, /duplicate_citizen_id/);
  assert.match(usersApi, /'loginCitizenId'/);
  assert.match(usersApi, /'temporaryPassword'/);
  assert.match(adminConsole, /บันทึกบัญชีใหม่ลงฐานข้อมูลแล้ว/);
  assert.match(adminConsole, /required=\{isCreatingUser\}/);
});

test('only foreign-teacher leave notifications are bilingual', () => {
  const notifier = read('public/api/line-notifier.php');
  const leaveApi = read('public/api/leaves.php');
  const thaiOnlyApis = ['diagnostics.php', 'notifications.php', 'official-duties.php', 'repairs.php', 'rooms.php', 'substitutes.php', 'vehicles.php'];

  assert.match(notifier, /function mmv_bilingual_notification_title/);
  assert.match(notifier, /function mmv_bilingual_notification_fields/);
  assert.match(notifier, /EN: /);
  assert.match(notifier, /Review Leave/);
  assert.match(leaveApi, /\$bilingual \? mmv_bilingual_notification_title\(\$title\) : \$title/);
  assert.match(leaveApi, /\$isForeignLeave = is_foreign_leave_request\(\$database, \$created\)/);
  assert.match(leaveApi, /\], \$id, \$isForeignLeave\)/);
  for (const filename of thaiOnlyApis) {
    assert.doesNotMatch(read(`public\/api\/${filename}`), /mmv_bilingual_notification_(title|fields|message)/);
  }
});

test('foreign-teacher leave requests use the dedicated English Program approval route', () => {
  const leaveApi = read('public/api/leaves.php');
  const workflow = read('src/config/approvalWorkflow.ts');
  const form = read('src/components/ForeignLeavePrintDocument.tsx');
  const globalStyles = read('src/app/globals.css');

  assert.match(leaveApi, /FOREIGN_LEAVE_REVIEWER_ID = 'MMV11'/);
  assert.match(leaveApi, /personnel_type = 'ครูต่างชาติ'/);
  assert.match(leaveApi, /leave_approver_for\(\$database, \$leaveApprovers, \$expectedStage, \$leave\)/);
  assert.match(workflow, /FOREIGN_LEAVE_REVIEWER_ID = 'MMV11'/);
  assert.match(form, /Miss Parichart Boonmee/);
  assert.match(form, /Miss Suriyapohn Noppakornsettakul/);
  assert.match(form, /Miss Monthatip Saowakon/);
  assert.match(form, /Cumulative Leave Record/);
  assert.match(form, /font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:14pt/);
  assert.match(form, /await document\.fonts\.ready/);
  assert.match(globalStyles, /url\('\/fonts\/th-sarabun-psk-regular\.ttf'\)/);
  assert.match(globalStyles, /url\('\/fonts\/th-sarabun-psk-bold\.ttf'\)/);
  assert.ok(readFileSync(new URL('../public/fonts/th-sarabun-psk-regular.ttf', import.meta.url)).length > 0);
  assert.ok(readFileSync(new URL('../public/fonts/th-sarabun-psk-bold.ttf', import.meta.url)).length > 0);
  assert.match(form, /\.foreign-leave-paper h1\{margin:0 0 4mm;text-align:center;font-size:16pt;font-weight:700\}/);
  assert.match(form, /request\.leaveSummary\?\.\[key\]/);
  assert.match(form, /Previous/);
  assert.match(form, /Current/);
  assert.match(form, /Total/);
  assert.match(form, /foreign-stats-section/);
  assert.match(form, /\.foreign-stats-section\{display:inline-block;width:92mm;min-width:92mm;max-width:92mm;margin:1\.5mm auto 2mm 0\}/);
  assert.match(form, /\.foreign-stats-table\{display:table!important;width:92mm!important;min-width:92mm!important;max-width:92mm!important\}/);
  assert.match(form, /style=\{\{ width: '92mm', maxWidth: '92mm', marginLeft: 0, marginRight: 'auto' \}\}/);
  assert.match(form, /className="foreign-stats-table" style=\{\{ display: 'table', width: '92mm', minWidth: '92mm', maxWidth: '92mm' \}\}/);
  assert.match(form, /<col style=\{\{ width: '26mm' \}\} \/>/);
  assert.match(form, /Array\.from\(\{ length: 6 \}/);
  assert.match(form, /const \[previewScale, setPreviewScale\] = React\.useState\(1\)/);
  assert.match(form, /className="foreign-leave-stage"/);
  assert.match(form, /transform:none!important/);
  assert.doesNotMatch(form, /foreign-stats-signature-grid/);
  assert.match(read('src/components/modules/LeaveModule.tsx'), /setSelectedRequest\(null\);\s*setPrintRequest\(requestToPrint\)/);
  assert.match(read('src/components/modules/LeaveModule.tsx'), /grid grid-cols-1 sm:grid-cols-2 gap-3/);
  assert.match(read('src/components/modules/LeaveModule.tsx'), /max-h-\[96dvh\] sm:max-h-\[92vh\]/);
});

test('school news and orders persist in MySQL and are reloaded after refresh', () => {
  const endpoint = read('public/api/content.php');
  const context = read('src/context/AppContext.tsx');

  assert.match(endpoint, /CREATE TABLE IF NOT EXISTS school_news/);
  assert.match(endpoint, /CREATE TABLE IF NOT EXISTS school_orders/);
  assert.match(endpoint, /INSERT INTO school_news/);
  assert.match(endpoint, /INSERT INTO school_orders/);
  assert.match(endpoint, /require_content_publisher\(\$currentUser\)/);
  assert.match(context, /contentApi\.list\(\)/);
  assert.match(context, /contentApi\.createNews\(news\)/);
  assert.match(context, /contentApi\.createOrder\(order, document\)/);
});

test('school orders accept validated documents and use the six official work groups', () => {
  const endpoint = read('public/api/content.php');
  const dashboard = read('src/components/Dashboard.tsx');

  assert.match(endpoint, /\$_FILES\['document'\]/);
  assert.match(endpoint, /move_uploaded_file/);
  assert.match(endpoint, /15 \* 1024 \* 1024/);
  assert.match(endpoint, /'academic_administration'/);
  assert.match(endpoint, /'english_program'/);
  assert.match(dashboard, /กลุ่มบริหารวิชาการ/);
  assert.match(dashboard, /กลุ่มบริหารบุคคล/);
  assert.match(dashboard, /กลุ่มบริหารงบประมาณ/);
  assert.match(dashboard, /กลุ่มบริหารทั่วไป/);
  assert.match(dashboard, /กลุ่มงานอำนวยการ/);
  assert.match(dashboard, /กลุ่มงาน English Program/);
});
