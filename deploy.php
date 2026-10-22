<?php
// ============================================================
// BHARAT IMPEX — AUTOMATED GIT DEPLOYMENT SCRIPT
// Handles GitHub Webhooks (push events) or browser/curl triggers
// ============================================================

// Set your secret deployment token here (or set DEPLOY_SECRET in .env)
define('DEFAULT_SECRET', 'bharat_impex_deploy_secret_key_2026');

header('Content-Type: text/plain; charset=utf-8');

// Load .env secret if available
$secret = DEFAULT_SECRET;
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), 'DEPLOY_SECRET=') === 0) {
            $secret = trim(substr(trim($line), 14), "\"'");
            break;
        }
    }
}

// ------------------------------------------------------------
// 1. Authentication Check
// ------------------------------------------------------------
$isAuthorized = false;

// Check A: Query parameter (e.g., https://yourdomain.com/deploy.php?secret=YOUR_TOKEN)
if (isset($_GET['secret']) && hash_equals($secret, $_GET['secret'])) {
    $isAuthorized = true;
}

// Check B: GitHub Webhook HMAC SHA256 Signature (Header: X-Hub-Signature-256)
$githubSignature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$payload = file_get_contents('php://input');

if ($githubSignature && !empty($payload)) {
    $expectedHash = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    if (hash_equals($expectedHash, $githubSignature)) {
        $isAuthorized = true;
    }
}

if (!$isAuthorized) {
    http_response_code(403);
    echo "============================================================\n";
    echo "403 ACCESS DENIED: Invalid or missing deployment secret token\n";
    echo "============================================================\n";
    echo "Usage: /deploy.php?secret=YOUR_DEPLOY_SECRET\n";
    echo "Or configure your GitHub Webhook Secret with this token.\n";
    exit;
}

// ------------------------------------------------------------
// 2. Execution Environment Verification
// ------------------------------------------------------------
echo "============================================================\n";
echo "BHARAT IMPEX AUTO-DEPLOYMENT RUNNER\n";
echo "Timestamp: " . date('Y-m-d H:i:s T') . "\n";
echo "Directory: " . __DIR__ . "\n";
echo "============================================================\n\n";

if (!function_exists('exec') && !function_exists('shell_exec')) {
    echo "ERROR: Both 'exec' and 'shell_exec' are disabled in php.ini.\n";
    echo "Please enable exec/shell_exec in cPanel PHP Selector.\n";
    exit(1);
}

// Determine git executable path (fallback to standard cPanel paths)
$gitBin = 'git';
$possibleGitPaths = ['/usr/bin/git', '/usr/local/bin/git', '/usr/local/cpanel/3rdparty/bin/git'];
foreach ($possibleGitPaths as $path) {
    if (@file_exists($path) && @is_executable($path)) {
        $gitBin = $path;
        break;
    }
}

// ------------------------------------------------------------
// 3. Run Git Pull / Sync Commands
// ------------------------------------------------------------
$commands = [
    'Echo Git Version'         => "{$gitBin} --version",
    'Check Git Status'         => "{$gitBin} status --porcelain",
    'Fetch Latest from Origin' => "{$gitBin} fetch origin main",
    'Hard Reset to Origin/Main'=> "{$gitBin} reset --hard origin/main",
    'Clean Untracked Files'    => "{$gitBin} clean -fd -e api/config/database.php -e .env -e uploads/",
    'Log Last Commit'          => "{$gitBin} log -1 --stat",
];

$outputLog = [];
$success = true;

foreach ($commands as $label => $cmd) {
    echo ">>> Running: [{$label}]\n";
    echo "    Command: {$cmd}\n";
    
    $cmdOutput = [];
    $returnCode = 0;
    
    // Execute command with stderr redirected to stdout
    exec("cd " . escapeshellarg(__DIR__) . " && {$cmd} 2>&1", $cmdOutput, $returnCode);
    
    $joinedOutput = trim(implode("\n", $cmdOutput));
    if ($joinedOutput !== '') {
        echo "    Output:\n" . preg_replace('/^/m', '      ', $joinedOutput) . "\n";
    } else {
        echo "    Output: (No output / Clean)\n";
    }
    
    if ($returnCode !== 0 && $label !== 'Clean Untracked Files') {
        echo "    ⚠️ WARNING: Command exited with status code: {$returnCode}\n\n";
        // Continue but flag
        if ($label === 'Hard Reset to Origin/Main' || $label === 'Fetch Latest from Origin') {
            $success = false;
        }
    } else {
        echo "    ✓ OK\n\n";
    }
}

// ------------------------------------------------------------
// 4. Post-Deployment Cache Refresh
// ------------------------------------------------------------
// Touch index.php to invalidate opcode / file caches
if (file_exists(__DIR__ . '/index.php')) {
    @touch(__DIR__ . '/index.php');
}

echo "============================================================\n";
if ($success) {
    echo "✓ DEPLOYMENT SUCCESSFUL!\n";
    echo "All changes from GitHub repository have been pulled into the server.\n";
} else {
    echo "⚠️ DEPLOYMENT FINISHED WITH WARNINGS.\n";
    echo "Please check the command outputs above.\n";
}
echo "============================================================\n";
