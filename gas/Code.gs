/**
 * 麻雀点数早見 — 写真読み取りの中継 (Google Apps Script)
 *
 * ページ(GitHub Pages)から写真と指示を受け取り、Gemini API に渡して結果(JSON)を返します。
 * APIキーはこのスクリプトの中にだけ置くので、ページを見た人には見えません。
 *
 * 【スクリプトプロパティ】(プロジェクトの設定 → スクリプト プロパティ)
 *   GEMINI_API_KEY : 必須。Google AI Studio で発行したAPIキー
 *   PASSPHRASE     : 任意。仲間内の合言葉。設定すると、合言葉を入れた人だけ使えます(おすすめ)
 *   DAILY_LIMIT    : 任意。1日の読み取り回数の上限(全員の合計)。既定 200
 *   MODEL          : 任意。ふだん使うモデル。既定 gemini-flash-latest(混雑時は自動で別モデルに切り替え)
 *   MODEL_HQ       : 任意。「高精度で読み直す」で使うモデル。未設定なら MODEL と同じ
 */

function doPost(e) {
  var t0 = Date.now();
  try {
    var props = PropertiesService.getScriptProperties();
    var req = JSON.parse(e.postData.contents);

    // 合言葉
    var pass = props.getProperty('PASSPHRASE');
    if (pass && String(req.pass || '') !== pass) return out_({ error: 'bad_pass' });

    // 1日の回数制限(日本時間で日付が変わるとリセット)
    var limit = Number(props.getProperty('DAILY_LIMIT') || 200);
    var today = 'count_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      props.getKeys().forEach(function (k) { if (k.indexOf('count_') === 0 && k !== today) props.deleteProperty(k); });
      var n = Number(props.getProperty(today) || 0);
      if (n >= limit) return out_({ error: 'daily_limit' });
      props.setProperty(today, String(n + 1));
    } finally {
      lock.releaseLock();
    }

    // Gemini に送る
    var model = (req.hq && props.getProperty('MODEL_HQ')) || props.getProperty('MODEL') || 'gemini-flash-latest';
    var parts = [{ text: String(req.prompt || '').slice(0, 30000) }];
    (req.images || []).slice(0, 2).forEach(function (im) {
      parts.push({ inline_data: { mime_type: String(im.mimeType || 'image/jpeg'), data: String(im.data || '') } });
    });
    var body = callWithFallback_(model, parts, props.getProperty('GEMINI_API_KEY'));
    if (body.error) return out_(body);

    var json = parseJson_(body.text);
    if (!json) return out_({ error: 'invalid_json' });
    // かかった時間(ミリ秒)。ページの「かかった時間」の表示に使う
    return out_({ result: json, t: { gas: Date.now() - t0, ai: body.ms, model: body.model, tries: body.tries } });
  } catch (err) {
    return out_({ error: 'server_error', message: String(err) });
  }
}

function doGet() {
  return out_({ ok: true, message: '麻雀点数早見の中継は動いています。' });
}

function callGemini_(model, parts, key) {
  if (!key) return { error: 'server_error', message: 'GEMINI_API_KEY が設定されていません' };
  var res = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 }
      }),
      muteHttpExceptions: true
    }
  );
  var code = res.getResponseCode();
  var data = {};
  if (code === 503 || code === 500) { try { data = JSON.parse(res.getContentText()); } catch (e) {} return { error: 'gemini_error', message: (data.error && data.error.message) || ('HTTP ' + code) }; }
  try { data = JSON.parse(res.getContentText()); } catch (e) {}
  if (code === 429) return { error: 'rate_limited' };
  if (code !== 200) return { error: 'gemini_error', message: (data.error && data.error.message) || ('HTTP ' + code) };
  var c = (data.candidates || [])[0];
  var text = c && c.content && c.content.parts ? c.content.parts.map(function (p) { return p.text || ''; }).join('') : '';
  return { text: text };
}

/** 混雑・提供終了のときは、次のモデルで自動的にやり直す */
var FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-lite-latest'];
function callWithFallback_(first, parts, key) {
  var list = [first].concat(FALLBACK_MODELS.filter(function (x) { return x !== first; }));
  var last = null;
  for (var i = 0; i < list.length; i++) {
    var t = Date.now();
    var r = callGemini_(list[i], parts, key);
    if (!r.error) { r.model = list[i]; r.tries = i + 1; r.ms = Date.now() - t; return r; }
    last = r;
    var msg = String(r.message || '');
    if (r.error !== 'rate_limited' && !/demand|overload|unavailable|no longer|not found|deprecated|HTTP 50/i.test(msg)) return r;
  }
  return last;
}

function parseJson_(t) {
  try { return JSON.parse(t); } catch (e) {}
  var m = String(t || '').match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }
  return null;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ===== 準備のときに手動で実行する関数 ===== */

/** 使えるモデルの一覧をログに出します(最初の実行で権限の承認も済ませられます) */
function listModels() {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
    { headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
  var data = JSON.parse(res.getContentText());
  if (!data.models) { Logger.log(res.getContentText()); return; }
  data.models
    .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; })
    .forEach(function (m) { Logger.log(m.name.replace('models/', '') + '  —  ' + (m.displayName || '')); });
}

/** 設定したモデルで、文字だけの簡単な呼び出しを試します */
function testGemini() {
  var props = PropertiesService.getScriptProperties();
  var model = props.getProperty('MODEL') || 'gemini-flash-latest';
  var r = callWithFallback_(model, [{ text: 'Reply with only this JSON: {"ok": true}' }], props.getProperty('GEMINI_API_KEY'));
  Logger.log(model + ' → ' + JSON.stringify(r));
}
