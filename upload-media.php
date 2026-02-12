<?php
// ============================================
// 大容量メディアファイル個別アップロードAPI
// ============================================

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$song = $_POST['song'] ?? '';
if (!preg_match('/^[a-zA-Z0-9_-]{1,50}$/', $song)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid song name']);
    exit;
}

$slot = $_POST['slot'] ?? '';
$validSlots = ['midi', 'audio', 'skyDome', 'innerSky', 'floor', 'leftWall', 'centerWall', 'rightWall', 'backWall'];
if (!in_array($slot, $validSlots)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid slot name']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit;
}

// 200MB上限
if ($_FILES['file']['size'] > 200 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'File too large (max 200MB)']);
    exit;
}

// 保存先ディレクトリ
$dir = __DIR__ . '/data/media';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// 拡張子を取得
$originalName = $_FILES['file']['name'];
$ext = pathinfo($originalName, PATHINFO_EXTENSION);
if (!$ext) $ext = 'bin';
$ext = preg_replace('/[^a-zA-Z0-9]/', '', $ext);

$filename = $song . '_' . $slot . '.' . $ext;
$filepath = $dir . '/' . $filename;

if (!move_uploaded_file($_FILES['file']['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

echo json_encode([
    'success' => true,
    'url' => 'data/media/' . $filename,
    'size' => $_FILES['file']['size'],
]);
