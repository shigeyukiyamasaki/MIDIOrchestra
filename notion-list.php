<?php
// ============================================
// Notion データベースから曲名・URL一覧を取得
// ============================================

header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/config/notion-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Notion config not found']);
    exit;
}
require_once $configPath;

function notionRequest($method, $endpoint, $body = null) {
    $ch = curl_init('https://api.notion.com/v1' . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . NOTION_API_KEY,
        'Content-Type: application/json',
        'Notion-Version: 2022-06-28',
    ]);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
    }
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'body' => json_decode($response, true)];
}

// 全ページを取得（公開日の新しい順）
$result = notionRequest('POST', '/databases/' . NOTION_DATABASE_ID . '/query', [
    'sorts' => [
        ['property' => '公開日', 'direction' => 'descending'],
    ],
]);

if ($result['code'] !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Notion API error', 'status' => $result['code']]);
    exit;
}

$items = [];
foreach ($result['body']['results'] as $page) {
    $props = $page['properties'];

    $title = '';
    if (!empty($props['曲名']['title'])) {
        $title = $props['曲名']['title'][0]['plain_text'] ?? '';
    }

    $url = $props['URL']['url'] ?? '';

    if ($title && $url) {
        $items[] = ['title' => $title, 'url' => $url];
    }
}

echo json_encode(['success' => true, 'items' => $items]);
