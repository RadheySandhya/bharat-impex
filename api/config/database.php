<?php
// ============================================================
// BHARAT IMPEX — DATABASE CONFIGURATION
// ============================================================

// Look for .env in root or api directory
$envCandidates = [
    __DIR__ . '/../../.env',
    __DIR__ . '/../.env',
    __DIR__ . '/.env'
];
foreach ($envCandidates as $envFile) {
    if (file_exists($envFile)) {
        $envLines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($envLines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($k, $v) = explode('=', $line, 2);
                $k = trim($k);
                $v = trim(trim($v), "\"'\r\n");
                putenv("{$k}={$v}");
                $_ENV[$k] = $v;
                $_SERVER[$k] = $v;
            }
        }
        break;
    }
}

// Auto-detect if running on live cPanel hosting server vs local XAMPP
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$docRoot  = $_SERVER['DOCUMENT_ROOT'] ?? '';
$isCpanelServer = (strpos($httpHost, 'solveall360.com') !== false) || (strpos($docRoot, 'solve738') !== false) || (strpos(__DIR__, 'solve738') !== false);

$defaultHost = $isCpanelServer ? 'localhost' : '127.0.0.1';
$defaultDb   = $isCpanelServer ? 'solve738_stock' : 'bharat_impex';
$defaultUser = $isCpanelServer ? 'solve738_dbuser' : 'root';
$defaultPass = '';

return [
    'driver'    => 'mysql',
    'host'      => getenv('DB_HOST') ?: $defaultHost,
    'port'      => getenv('DB_PORT') ?: '3306',
    'database'  => getenv('DB_DATABASE') ?: $defaultDb,
    'username'  => getenv('DB_USERNAME') ?: $defaultUser,
    'password'  => getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : $defaultPass,
    'charset'   => 'utf8mb4',
    'options'   => [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
];

