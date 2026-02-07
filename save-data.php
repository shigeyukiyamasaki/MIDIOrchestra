<?php
// ============================================
// Viewer Data 保存API
// ============================================

header('Content-Type: application/json; charset=utf-8');

// POST以外は拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// JSONボディを取得
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// 曲名バリデーション（英数字、ハイフン、アンダースコアのみ）
$song = $input['song'] ?? '';
if (!preg_match('/^[a-zA-Z0-9_-]{1,50}$/', $song)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid song name. Use a-z, 0-9, hyphen, underscore only (max 50 chars)']);
    exit;
}

// データ取得
$data = $input['data'] ?? '';
if (empty($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'No data provided']);
    exit;
}

// サイズ制限（50MB）
if (strlen($data) > 50 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'Data too large (max 50MB)']);
    exit;
}

// data/ ディレクトリに保存
$dir = __DIR__ . '/data';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$filepath = $dir . '/' . $song . '.js';
$content = 'window.VIEWER_DATA = ' . $data . ';' . "\n";

if (file_put_contents($filepath, $content) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

// 成功レスポンス
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
    . '://' . $_SERVER['HTTP_HOST']
    . dirname($_SERVER['REQUEST_URI']);
$viewerUrl = $baseUrl . '/viewer.html?song=' . urlencode($song);

echo json_encode([
    'success' => true,
    'song' => $song,
    'url' => $viewerUrl,
]);
