<?php
// ============================================
// Notion データベース登録API
// ============================================

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// 設定読み込み
$configPath = __DIR__ . '/config/notion-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Notion config not found']);
    exit;
}
require_once $configPath;

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

$title = $input['title'] ?? $song;
$composer = $input['composer'] ?? '';
$url = $input['url'] ?? '';

// --- Notion APIヘルパー ---
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
    } elseif ($method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
    }
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'body' => json_decode($response, true)];
}

// --- 既存エントリを検索（song nameで） ---
function findExistingPage($song) {
    $result = notionRequest('POST', '/databases/' . NOTION_DATABASE_ID . '/query', [
        'filter' => [
            'property' => '公開名',
            'rich_text' => ['equals' => $song],
        ],
    ]);
    if ($result['code'] === 200 && !empty($result['body']['results'])) {
        return $result['body']['results'][0]['id'];
    }
    return null;
}

// --- プロパティ構築 ---
$properties = [
    '曲名' => [
        'title' => [
            ['text' => ['content' => $title]],
        ],
    ],
    '公開名' => [
        'rich_text' => [
            ['text' => ['content' => $song]],
        ],
    ],
    'URL' => [
        'url' => $url ?: null,
    ],
    '作曲' => [
        'rich_text' => $composer ? [['text' => ['content' => $composer]]] : [],
    ],
    '公開日' => [
        'date' => ['start' => date('Y-m-d')],
    ],
];

// --- 既存チェック → 更新 or 新規作成 ---
$existingPageId = findExistingPage($song);

if ($existingPageId) {
    // 更新
    $result = notionRequest('PATCH', '/pages/' . $existingPageId, [
        'properties' => $properties,
    ]);
} else {
    // 新規作成
    $result = notionRequest('POST', '/pages', [
        'parent' => ['database_id' => NOTION_DATABASE_ID],
        'properties' => $properties,
    ]);
}

if ($result['code'] >= 200 && $result['code'] < 300) {
    echo json_encode([
        'success' => true,
        'action' => $existingPageId ? 'updated' : 'created',
        'pageId' => $result['body']['id'] ?? null,
    ]);
} else {
    http_response_code(502);
    echo json_encode([
        'error' => 'Notion API error',
        'status' => $result['code'],
        'detail' => $result['body']['message'] ?? 'Unknown error',
    ]);
}
