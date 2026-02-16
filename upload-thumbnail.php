<?php
// ============================================
// サムネイル画像アップロードAPI
// ============================================

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$song = $input['song'] ?? '';
if (!preg_match('/^[a-zA-Z0-9_-]{1,50}$/', $song)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid song name']);
    exit;
}

$thumbnail = $input['thumbnail'] ?? '';
if (empty($thumbnail)) {
    http_response_code(400);
    echo json_encode(['error' => 'No thumbnail data']);
    exit;
}

// base64デコード（data:image/...;base64, プレフィックスを除去）
$data = $thumbnail;
if (strpos($data, ',') !== false) {
    $data = explode(',', $data, 2)[1];
}
$decoded = base64_decode($data);
if ($decoded === false || strlen($decoded) < 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid base64 data']);
    exit;
}

// 5MB上限
if (strlen($decoded) > 5 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'Thumbnail too large (max 5MB)']);
    exit;
}

// 保存先ディレクトリ
$dir = __DIR__ . '/data/thumbnails';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$filename = $song . '.jpg';
$filepath = $dir . '/' . $filename;

if (file_put_contents($filepath, $decoded) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save thumbnail']);
    exit;
}

// 公開URLを生成
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
    . '://' . $_SERVER['HTTP_HOST']
    . dirname($_SERVER['REQUEST_URI']);
$publicUrl = $baseUrl . '/data/thumbnails/' . $filename;

echo json_encode([
    'success' => true,
    'url' => $publicUrl,
]);
