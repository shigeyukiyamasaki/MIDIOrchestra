<?php
header('Content-Type: application/json; charset=utf-8');
$song = $_GET['song'] ?? '';
if (!preg_match('/^[a-zA-Z0-9_-]{1,50}$/', $song)) {
    echo json_encode(['error' => 'Invalid song']);
    exit;
}
$file = __DIR__ . '/data/' . $song . '.js';
if (!file_exists($file)) {
    echo json_encode(['error' => 'Not found']);
    exit;
}
$content = file_get_contents($file);
$json = substr($content, strlen('window.VIEWER_DATA = '), -2);
$data = json_decode($json, true);
if (!$data) {
    echo json_encode(['error' => 'Parse failed', 'fileSize' => filesize($file)]);
    exit;
}
$result = ['fileSize' => filesize($file), 'mediaSlots' => []];
if (isset($data['media'])) {
    foreach ($data['media'] as $key => $val) {
        if ($val === null) {
            $result['mediaSlots'][$key] = null;
        } else {
            $result['mediaSlots'][$key] = [
                'name' => $val['name'] ?? '?',
                'mimeType' => $val['mimeType'] ?? '?',
                'dataSize' => strlen($val['data'] ?? ''),
            ];
        }
    }
}
echo json_encode($result, JSON_PRETTY_PRINT);
