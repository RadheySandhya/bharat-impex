<?php
// ============================================================
// BHARAT IMPEX — SINGLE PAGE APPLICATION ENTRY POINT (XAMPP)
// ============================================================

// Aggressively prevent browser caching so user always gets the latest white theme
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: 0");
header('Content-Type: text/html; charset=UTF-8');

$distFile = __DIR__ . '/dist/index.html';

if (!file_exists($distFile)) {
    http_response_code(500);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#f8fafc;color:#0f172a;">';
    echo '<h2>Bharat Impex Production Build Missing</h2>';
    echo '<p>Please run <code>npm run build</code> in the project directory to compile the frontend application.</p>';
    echo '</body></html>';
    exit;
}

$html = file_get_contents($distFile);

// Add unique timestamp query string to asset paths to instantly bust browser cache
$v = time();
$html = preg_replace('/(href|src)="\.\/assets\/(index-[^"]+\.(js|css))"/', '$1="./assets/$2?v=' . $v . '"', $html);

// SolveAll360 shared 3D layer + Bharat adapter as the LAST stylesheets (UI only; build untouched)
$saHost  = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
$saLocal = in_array($saHost, ['localhost', '127.0.0.1', '::1', '[::1]'], true);
$saRoot  = $saLocal ? 'http://localhost/SolveAll360%20Public%20html/' : 'https://solveall360.com/';
$saShared  = $saRoot . 'shared/solveall-3d.css?v=' . (@filemtime(dirname(__DIR__, 2) . '/shared/solveall-3d.css') ?: '20261104');
$saAdapter = './assets/css/sa3d-adapter.css?v=' . (@filemtime(__DIR__ . '/assets/css/sa3d-adapter.css') ?: '20261104');
$saLinks = '    <link rel="stylesheet" href="' . htmlspecialchars($saShared, ENT_QUOTES, 'UTF-8') . '" data-sa3d="shared">' . PHP_EOL
         . '    <link rel="stylesheet" href="' . htmlspecialchars($saAdapter, ENT_QUOTES, 'UTF-8') . '" data-sa3d="adapter">' . PHP_EOL;
$html = preg_replace('#</head>#i', $saLinks . '</head>', $html, 1);
$html = preg_replace('#<body class="#i', '<body class="sa3d bi-app ', $html, 1);

echo $html;
exit;
