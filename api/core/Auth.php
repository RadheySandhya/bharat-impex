<?php
// ============================================================
// BHARAT IMPEX — AUTHENTICATION & JWT HELPER
// ============================================================

class Auth {
    private static ?array $currentUser = null;

    public static function generateToken(array $payload): string {
        $config = require __DIR__ . '/../config/config.php';
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['exp'] = time() + $config['jwt_expiry'];
        $payloadJson = json_encode($payload);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payloadJson);
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $config['jwt_secret'], true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function verifyToken(string $token): ?array {
        $config = require __DIR__ . '/../config/config.php';
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $payload, $signature] = $parts;
        $validSig = self::base64UrlEncode(hash_hmac('sha256', $header . "." . $payload, $config['jwt_secret'], true));

        if (!hash_equals($validSig, $signature)) return null;

        $data = json_decode(self::base64UrlDecode($payload), true);
        if (!$data || (isset($data['exp']) && $data['exp'] < time())) {
            return null;
        }

        return $data;
    }

    public static function user(): ?array {
        if (self::$currentUser !== null) {
            return self::$currentUser;
        }

        $headers = function_exists('getallheaders') ? getallheaders() : [];
        if (empty($headers)) {
            foreach ($_SERVER as $name => $value) {
                if (substr($name, 0, 5) == 'HTTP_') {
                    $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
                }
            }
        }
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $tokenData = self::verifyToken($matches[1]);
            if ($tokenData && isset($tokenData['user_id'])) {
                $db = Database::getConnection();
                $stmt = $db->prepare("
                    SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.active,
                           r.role_code, r.role_name, r.permissions
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    WHERE u.id = ? AND u.active = 1
                ");
                $stmt->execute([$tokenData['user_id']]);
                $user = $stmt->fetch();
                if ($user) {
                    $user['permissions'] = json_decode($user['permissions'] ?? '[]', true);
                    self::$currentUser = $user;
                    return self::$currentUser;
                }
            }
        }
        return null;
    }

    public static function requireAuth(): array {
        $user = self::user();
        if (!$user) {
            Response::error('Unauthorized access. Please login first.', null, 401);
        }
        return $user;
    }

    public static function requireRole(array $allowedRoles): array {
        $user = self::requireAuth();
        $roleCode = strtoupper($user['role_code'] ?? '');
        $roleName = strtoupper($user['role_name'] ?? '');
        
        // Admin / Superadmin has absolute unrestricted rights to all operations
        if ($roleCode === 'ADMIN' || $roleCode === 'SUPERADMIN' || str_contains($roleName, 'ADMIN')) {
            return $user;
        }

        if (!in_array($user['role_code'], $allowedRoles)) {
            Response::error('Forbidden. You do not have permission for this action.', null, 403);
        }
        return $user;
    }

    public static function requirePermission(string $permission): array {
        $user = self::requireAuth();
        $roleCode = strtoupper($user['role_code'] ?? '');
        $roleName = strtoupper($user['role_name'] ?? '');

        // Admin has all permissions
        if ($roleCode === 'ADMIN' || $roleCode === 'SUPERADMIN' || str_contains($roleName, 'ADMIN')) {
            return $user;
        }

        $perms = $user['permissions'] ?? [];
        if (in_array('ALL', $perms) || in_array('*', $perms) || in_array($permission, $perms)) {
            return $user;
        }

        Response::error('Forbidden. Permission denied for ' . $permission, null, 403);
    }

    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_BCRYPT);
    }

    public static function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }

    private static function base64UrlEncode(string $data): string {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private static function base64UrlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }
}
