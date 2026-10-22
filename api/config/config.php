<?php
// ============================================================
// BHARAT IMPEX — APPLICATION CONFIGURATION
// ============================================================

return [
    'app_name'      => 'Bharat Impex ERP',
    'app_version'   => '1.0.0',
    'jwt_secret'    => getenv('JWT_SECRET') ?: 'bharat_impex_secure_token_secret_key_2026_x9#9!z',
    'jwt_expiry'    => 86400 * 7, // 7 days
    'upload_dir'    => __DIR__ . '/../../uploads',
    'allowed_csv_ext' => ['csv', 'txt'],
    'timezone'      => 'Asia/Kolkata',
];
