// 点数計算の回帰テスト: index.html をブラウザで開き、tests/cases.json の手を手入力欄に入れて点数を確かめる
// 実行: npm install → npx playwright install chromium → npm test
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(readFileSync(path.join(root, 'tests/cases.json'), 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
await page.click('#photo summary');

let fail = 0;
for (const c of cases) {
  await page.click(`#rwseg [data-v="${c.rw}"]`);
  await page.click(`#swseg [data-v="${c.sw}"]`);
  await page.click(`#way [data-v="${c.way}"]`);
  await page.fill('#melds', c.melds);
  await page.fill('#hand', c.hand);
  if (await page.$('#usefu')) await page.click('#usefu');
  const answer = (await page.textContent('#answer')).replace(/\s+/g, ' ');
  const ok = answer.includes(c.expect);
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${c.name} → ${answer}${ok ? '' : `  (期待: ${c.expect})`}`);
}
if (errors.length) { console.log('ページのエラー:', errors); fail++; }
await browser.close();
console.log(fail ? `\n${fail} 件失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
