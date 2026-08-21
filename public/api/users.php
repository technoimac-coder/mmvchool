<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$database = require_database();
$fields = 'id, name, position, academic_position, department, role, email, phone, avatar, photo_url, organization,
           personnel_type, assigned_duties, must_change_password';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $currentUser = require_user(); // Allow any logged in user to fetch directory list
    // Auto-sync existing uploaded photos from avatars directory if they are missing in the DB
    $avatarDir = __DIR__ . '/../uploads/avatars';
    if (is_dir($avatarDir)) {
        $files = scandir($avatarDir);
        $users = $database->query("SELECT id, name FROM users WHERE status = 'active'")->fetchAll();
        $syncStmt = $database->prepare("UPDATE users SET photo_url = ? WHERE id = ?");
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $filename = pathinfo($file, PATHINFO_FILENAME);
            $cleanName = mb_strtolower(trim($filename), 'UTF-8');
            $normalizedName = preg_replace('/[^a-zA-Z0-9]/', '', $cleanName);
            
            $matchedUserId = null;
            
            // 1. Try to match by normalized ID (e.g. "mmv-01" or "01" matches "MMV01")
            foreach ($users as $u) {
                $uIdNorm = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($u['id']));
                if ($uIdNorm === $normalizedName || $uIdNorm === 'mmv' . $normalizedName || $normalizedName === 'mmv' . $uIdNorm) {
                    $matchedUserId = $u['id'];
                    break;
                }
            }
            
            // 2. Try to match by name (if filename contains a portion of Thai name)
            if ($matchedUserId === null && strlen($cleanName) > 4) {
                foreach ($users as $u) {
                    $cleanThaiName = preg_replace('/^(นาย|นางสาว|นาง|ครู|ดร\.)\s*/u', '', $u['name']);
                    $cleanThaiName = mb_strtolower($cleanThaiName, 'UTF-8');
                    if ($cleanThaiName !== '' && (mb_strpos($cleanName, $cleanThaiName) !== false || mb_strpos($cleanThaiName, $cleanName) !== false)) {
                        $matchedUserId = $u['id'];
                        break;
                    }
                }
            }
            
            if ($matchedUserId !== null) {
                $dbPath = '/uploads/avatars/' . $file;
                $checkStmt = $database->prepare("SELECT photo_url FROM users WHERE id = ?");
                $checkStmt->execute([$matchedUserId]);
                $currentPhoto = $checkStmt->fetchColumn();
                // Overwrite if empty OR currently pointing to external mock URL (like Unsplash)
                if (empty($currentPhoto) || !str_starts_with((string)$currentPhoto, '/uploads/avatars/')) {
                    $syncStmt->execute([$dbPath, $matchedUserId]);
                }
            }
        }
    }

    $rows = $database->query("SELECT {$fields} FROM users WHERE status = 'active' ORDER BY id")->fetchAll();
    api_respond(['status' => 'success', 'data' => array_map('public_user', $rows)]);
}

require_method('POST');
$admin = require_roles('admin', 'director'); // Require admin/director for any write operations
require_csrf();
$input = json_body();
$action = (string) ($input['action'] ?? '');
$userId = (string) ($input['userId'] ?? '');

if ($action === 'reset_password') {
    if ($userId === '') api_error('ไม่พบรหัสผู้ใช้', 422, 'validation_error');
    $temporaryPassword = 'Mmv-' . bin2hex(random_bytes(5)) . '9';
    $statement = $database->prepare(
        "UPDATE users SET password_hash = ?, must_change_password = 1, password_changed_at = NULL
         WHERE id = ? AND status = 'active'"
    );
    $statement->execute([password_hash($temporaryPassword, PASSWORD_DEFAULT), $userId]);
    if ($statement->rowCount() !== 1) {
        api_error('ไม่พบผู้ใช้', 404, 'user_not_found');
    }
    api_respond(['status' => 'success', 'temporaryPassword' => $temporaryPassword]);
}

if ($action === 'set_role') {
    if ($userId === '') api_error('ไม่พบรหัสผู้ใช้', 422, 'validation_error');
    if ($userId === ($admin['id'] ?? '')) {
        api_error('ไม่สามารถเปลี่ยนสิทธิ์ของบัญชีที่กำลังใช้งาน', 422, 'cannot_change_self');
    }
    $allowedRoles = [
        'teacher', 'head', 'deputy_personnel', 'deputy_budget', 'director',
        'academic_affairs', 'technician', 'driver', 'admin',
    ];
    $role = (string) ($input['role'] ?? '');
    if (!in_array($role, $allowedRoles, true)) {
        api_error('บทบาทผู้ใช้ไม่ถูกต้อง', 422, 'invalid_role');
    }
    $statement = $database->prepare("UPDATE users SET role = ? WHERE id = ? AND status = 'active'");
    $statement->execute([$role, $userId]);
    if ($statement->rowCount() !== 1) {
        api_error('ไม่พบผู้ใช้หรือบทบาทไม่เปลี่ยนแปลง', 404, 'user_not_found');
    }
    api_respond(['status' => 'success']);
}

if ($action === 'bulk_update_photos') {
    $photoMap = $input['photoMap'] ?? [];
    if (!is_array($photoMap)) {
        api_error('ข้อมูลรูปภาพไม่ถูกต้อง', 422, 'invalid_payload');
    }
    $uploadDir = __DIR__ . '/../uploads/avatars';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    $statement = $database->prepare("UPDATE users SET photo_url = ? WHERE id = ? AND status = 'active'");
    $updated = 0;
    foreach ($photoMap as $uid => $base64) {
        if (!str_starts_with((string)$base64, 'data:image/')) continue;
        $pos = strpos($base64, ';base64,');
        if ($pos === false) continue;
        $header = substr($base64, 0, $pos);
        $data = substr($base64, $pos + 8);
        $extension = 'jpg';
        if (str_contains($header, 'png')) {
            $extension = 'png';
        } elseif (str_contains($header, 'webp')) {
            $extension = 'webp';
        }
        $binary = base64_decode($data);
        if ($binary !== false) {
            $filename = $uid . '.' . $extension;
            file_put_contents($uploadDir . '/' . $filename, $binary);
            $dbPhotoUrl = '/uploads/avatars/' . $filename;
            $statement->execute([$dbPhotoUrl, $uid]);
            $updated += $statement->rowCount();
        }
    }
    api_respond(['status' => 'success', 'updated' => $updated]);
}

if ($action === 'update_profile') {
    if ($userId === '') api_error('ไม่พบรหัสผู้ใช้', 422, 'validation_error');
    $citizenId = preg_replace('/\D/', '', (string) ($input['citizenId'] ?? ''));
    if ($citizenId !== '' && !in_array(strlen($citizenId), [12, 13], true)) {
        api_error('รหัสประจำตัวต้องมี 12 หรือ 13 หลัก', 422, 'invalid_citizen_id');
    }
    
    $photoUrl = (string) ($input['photoUrl'] ?? '');
    $dbPhotoUrl = null;
    if (str_starts_with($photoUrl, 'data:image/')) {
        $pos = strpos($photoUrl, ';base64,');
        if ($pos !== false) {
            $header = substr($photoUrl, 0, $pos);
            $data = substr($photoUrl, $pos + 8);
            $extension = 'jpg';
            if (str_contains($header, 'png')) {
                $extension = 'png';
            } elseif (str_contains($header, 'webp')) {
                $extension = 'webp';
            }
            $binary = base64_decode($data);
            if ($binary !== false) {
                $uploadDir = __DIR__ . '/../uploads/avatars';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                $filename = $userId . '.' . $extension;
                file_put_contents($uploadDir . '/' . $filename, $binary);
                $dbPhotoUrl = '/uploads/avatars/' . $filename;
            }
        }
    } else {
        $dbPhotoUrl = $photoUrl !== '' ? $photoUrl : null;
    }

    // Check if user exists to decide between INSERT and UPDATE
    $checkUserStmt = $database->prepare("SELECT 1 FROM users WHERE id = ?");
    $checkUserStmt->execute([$userId]);
    $userExists = (bool) $checkUserStmt->fetchColumn();

    try {
        if (!$userExists) {
            // Generate a unique 13-digit dummy citizen ID if none is sent from the client
            $citizenIdVal = $citizenId;
            if (empty($citizenIdVal)) {
                $numericPart = preg_replace('/\D/', '', $userId);
                if (empty($numericPart)) {
                    $numericPart = (string) mt_rand(100000, 999999);
                }
                $citizenIdVal = '9' . str_pad($numericPart, 12, '0', STR_PAD_LEFT);
                $citizenIdVal = substr($citizenIdVal, 0, 13);
            }
            
            // Generate temporary password based on citizen ID
            $defaultPassword = 'Mmv-' . substr($citizenIdVal, -6) . '9';
            $passwordHash = password_hash($defaultPassword, PASSWORD_DEFAULT);
            
            // Resolve personnel type based on role
            $role = (string) ($input['role'] ?? 'teacher');
            $personnelType = 'ข้าราชการครู';
            if ($role === 'driver') {
                $personnelType = 'พนักงานขับรถยนต์';
            } elseif ($role === 'technician') {
                $personnelType = 'เจ้าหน้าที่สนับสนุนการสอน';
            }
            
            $avatar = mb_substr(preg_replace('/^(นาย|นางสาว|นาง|ครู|ดร\.)\s*/u', '', (string)$input['name']), 0, 1, 'UTF-8') ?: 'ม';
            
            $insertStatement = $database->prepare(
                "INSERT INTO users (
                    id, name, position, academic_position, department, role, email, phone,
                    avatar, photo_url, organization, personnel_type, assigned_duties,
                    citizen_id, password_hash, status, must_change_password
                 ) VALUES (
                    ?, ?, ?, '', ?, ?, ?, ?,
                    ?, ?, 'โรงเรียนมกุฎเมืองราชวิทยาลัย', ?, ?,
                    ?, ?, 'active', 1
                 )"
            );
            
            $insertStatement->execute([
                $userId,
                trim((string) ($input['name'] ?? '')),
                trim((string) ($input['position'] ?? '')),
                trim((string) ($input['department'] ?? '')),
                $role,
                trim((string) ($input['email'] ?? '')),
                trim((string) ($input['phone'] ?? '')),
                $avatar,
                $dbPhotoUrl,
                $personnelType,
                json_encode($input['assignments'] ?? []),
                $citizenIdVal,
                $passwordHash
            ]);
        } else {
            // Update existing user record (including assignments)
            $updateStatement = $database->prepare(
                'UPDATE users SET name = ?, position = ?, department = ?, email = ?, phone = ?, photo_url = ?, 
                                 assigned_duties = ?, citizen_id = COALESCE(NULLIF(?, \'\'), citizen_id)
                 WHERE id = ? AND status = \'active\''
            );
            $updateStatement->execute([
                trim((string) ($input['name'] ?? '')),
                trim((string) ($input['position'] ?? '')),
                trim((string) ($input['department'] ?? '')),
                trim((string) ($input['email'] ?? '')),
                trim((string) ($input['phone'] ?? '')),
                $dbPhotoUrl,
                json_encode($input['assignments'] ?? []),
                $citizenId,
                $userId,
            ]);
        }
    } catch (PDOException $exception) {
        api_error('เลขประจำตัวประชาชนหรือรหัสบุคลากรนี้ถูกใช้งานแล้ว', 409, 'citizen_id_conflict');
    }
    
    $fetch = $database->prepare("SELECT {$fields} FROM users WHERE id = ? LIMIT 1");
    $fetch->execute([$userId]);
    $row = $fetch->fetch();
    if (!$row) api_error('ไม่พบผู้ใช้', 404, 'user_not_found');
    api_respond(['status' => 'success', 'user' => public_user($row)]);
}

api_error('ไม่รู้จักคำสั่งที่ร้องขอ', 400, 'unknown_action');
