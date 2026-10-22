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

echo $html;
exit;
