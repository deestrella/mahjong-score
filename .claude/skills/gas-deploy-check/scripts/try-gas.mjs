// gas/Code.gs を、GAS の仕組み(UrlFetchApp など)の偽物の上で動かして確かめる。
// 実行: node .claude/skills/gas-deploy-check/scripts/try-gas.mjs [gas/Code.gs のパス]
// Gemini には実際には送らないので、API キーも回数制限も使わない。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2] || 'gas/Code.gs';
const src = readFileSync(file, 'utf8');

// 偽の Gemini の返答。replies に [HTTPコード, 本文] を順に入れておくと、呼ばれるたびに 1 つずつ返す
export function load({ props = {}, replies = [] } = {}) {
  const store = { GEMINI_API_KEY: 'dummy', ...props };
  const calls = [];
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in store ? store[k] : null),
      setProperty: (k, v) => { store[k] = String(v); },
      deleteProperty: (k) => { delete store[k]; },
      getKeys: () => Object.keys(store),
    }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { formatDate: () => '20260101' },
    Logger: { log: () => {} },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }),
    },
    UrlFetchApp: { fetch: (url, opt) => {
      calls.push({ url, body: opt && opt.payload ? JSON.parse(opt.payload) : null });
      const [code, body] = replies.length ? replies.shift() : [500, { error: { message: 'no more fake replies' } }];
      return { getResponseCode: () => code, getContentText: () => JSON.stringify(body) };
    } },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: file });
  return { ctx, store, calls };
}

const ok = (text) => [200, { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }];
const post = (o) => ({ postData: { contents: JSON.stringify(o) } });

// いまの約束事が守られているかの基本の確認。Code.gs を変えたら、変えた部分の確認もここに足して実行する
const checks = [
  ['doGet が ok を返す', () => load().ctx.doGet(), (r) => r.ok === true],
  ['ふつうの読み取りで result と t が返る', () => load({ replies: [ok('{"hand":"123m","melds":[],"note":""}')] }).ctx.doPost(post({ prompt: 'x' })),
    (r) => r.result && r.result.hand === '123m' && r.t && typeof r.t.gas === 'number'],
  ['合言葉が違うと bad_pass(Gemini を呼ばない)', () => { const g = load({ props: { PASSPHRASE: 'p' } }); return [g.ctx.doPost(post({ pass: 'q' })), g.calls.length]; },
    ([r, n]) => r.error === 'bad_pass' && n === 0],
  ['上限に達すると daily_limit', () => load({ props: { DAILY_LIMIT: '1', count_20260101: '1' } }).ctx.doPost(post({})), (r) => r.error === 'daily_limit'],
  ['429 は rate_limited', () => load({ replies: [[429, {}], [429, {}], [429, {}], [429, {}]] }).ctx.doPost(post({})), (r) => r.error === 'rate_limited'],
  ['503 のあと次のモデルで成功する', () => load({ replies: [[503, { error: { message: 'overloaded' } }], ok('{"hand":"1z"}')] }).ctx.doPost(post({})),
    (r) => r.result && r.t.tries === 2],
  ['API キーが無いと server_error', () => load({ props: { GEMINI_API_KEY: null } }).ctx.doPost(post({})), (r) => r.error === 'server_error'],
];

let fail = 0;
for (const [name, run, test] of checks) {
  let r, good;
  try { r = run(); good = !!test(r); } catch (e) { r = String(e); good = false; }
  if (!good) fail++;
  console.log(`${good ? 'OK  ' : 'FAIL'} ${name}${good ? '' : ' → ' + JSON.stringify(r)}`);
}
console.log(fail ? `\n${fail} 件失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
