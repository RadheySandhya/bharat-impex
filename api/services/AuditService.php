<?php
// ============================================================
// BHARAT IMPEX — AUDIT LOG SERVICE
// ============================================================

class AuditService {
    public static function log(string $action, string $module, ?string $recordId = null, $oldValue = null, $newValue = null): void {
        try {
            $db = Database::getConnection();
            $user = Auth::user();
            $userId = $user ? $user['id'] : null;
            $userName = $user ? ($user['full_name'] . " ({$user['username']})") : 'SYSTEM';

            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'CLI/API';

            $stmt = $db->prepare("
                INSERT INTO audit_logs (user_id, user_name, action, module, record_id, old_value, new_value, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");

            $stmt->execute([
                $userId,
                $userName,
                $action,
                $module,
                $recordId,
                $oldValue ? json_encode($oldValue) : null,
                $newValue ? json_encode($newValue) : null,
                $ip,
                $ua
            ]);
        } catch (Exception $e) {
            // Silently log or handle to not break primary transaction
            error_log('Audit log failure: ' . $e->getMessage());
        }
    }
}
