<?php
// ============================================================
// BHARAT IMPEX — BULLETPROOF AUTO-DEPLOYMENT RUNNER
// ============================================================

define('DEFAULT_SECRET', 'bharat_impex_deploy_secret_key_2026');
define('REPO_URL', 'https://github.com/RadheySandhya/bharat-impex.git');

header('Content-Type: text/plain; charset=utf-8');

// 1. Authenticate Request
$isAuthorized = false;

// Check GET parameter (?secret=...)
if (isset($_GET['secret']) && hash_equals(DEFAULT_SECRET, $_GET['secret'])) {
    $isAuthorized = true;
}

// Check GitHub Webhook HMAC SHA256 Signature
$githubSignature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$payload = file_get_contents('php://input');

if ($githubSignature && !empty($payload)) {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, DEFAULT_SECRET);
    if (hash_equals($expected, $githubSignature)) {
        $isAuthorized = true;
    }
}

if (!$isAuthorized) {
    http_response_code(403);
    echo "============================================================\n";
    echo "403 ACCESS DENIED: Invalid or missing deployment secret token\n";
    echo "============================================================\n";
    exit;
}

echo "============================================================\n";
echo "BHARAT IMPEX AUTO-DEPLOYMENT RUNNER\n";
echo "Timestamp: " . date('Y-m-d H:i:s T') . "\n";
echo "Directory: " . __DIR__ . "\n";
echo "============================================================\n\n";

if (!function_exists('exec') && !function_exists('shell_exec')) {
    echo "ERROR: Both 'exec' and 'shell_exec' are disabled in php.ini.\n";
    exit(1);
}

// Locate git binary
$gitBin = 'git';
foreach (['/usr/bin/git', '/usr/local/bin/git', '/usr/local/cpanel/3rdparty/bin/git'] as $path) {
    if (@file_exists($path) && @is_executable($path)) {
        $gitBin = $path;
        break;
    }
}

$repoUrl = REPO_URL;
$workDir = escapeshellarg(__DIR__);

function runCmd($cmd, $workDir) {
    $output = [];
    $code = 0;
    exec("cd {$workDir} && {$cmd} 2>&1", $output, $code);
    return ['code' => $code, 'output' => trim(implode("\n", $output))];
}

// 1. Ensure Git repo is initialized in current directory
if (!is_dir(__DIR__ . '/.git')) {
    echo ">>> Initializing Git repository in current folder...\n";
    $res = runCmd("{$gitBin} init", $workDir);
    echo "    " . ($res['output'] ?: 'Initialized') . "\n\n";
}

// 2. Ensure remote 'origin' is correctly configured
echo ">>> Configuring Git remote origin...\n";
runCmd("{$gitBin} remote remove origin", $workDir);
$res = runCmd("{$gitBin} remote add origin {$repoUrl}", $workDir);
echo "    Remote origin configured: {$repoUrl}\n\n";

// 3. Fetch latest commits from GitHub
echo ">>> Fetching latest from GitHub (main)...\n";
runCmd("{$gitBin} config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'", $workDir);
$res = runCmd("{$gitBin} fetch origin main", $workDir);
if ($res['code'] !== 0) {
    echo "    ⚠️ Fetch failed:\n    " . $res['output'] . "\n\n";
} else {
    echo "    ✓ Fetch completed\n\n";
}

// 4. Reset worktree to FETCH_HEAD
echo ">>> Syncing files to latest commit...\n";
$res1 = runCmd("{$gitBin} checkout -f -B main FETCH_HEAD", $workDir);
$res2 = runCmd("{$gitBin} reset --hard FETCH_HEAD", $workDir);
echo "    Checkout: " . ($res1['output'] ?: 'OK') . "\n";
echo "    Reset: " . ($res2['output'] ?: 'OK') . "\n\n";

// 5. Log active commit
echo ">>> Active Commit on Server:\n";
$res = runCmd("{$gitBin} log -1 --stat", $workDir);
echo "    " . $res['output'] . "\n\n";

// Touch index.php to invalidate file cache
if (file_exists(__DIR__ . '/index.php')) {
    @touch(__DIR__ . '/index.php');
}

echo "============================================================\n";
echo "✓ DEPLOYMENT FINISHED SUCCESSFULLY!\n";
echo "============================================================\n";
