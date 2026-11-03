# 忍び暗刻作 点数早見シート

あがったら手牌を撮るだけで、点数と申告の言い方まで出るスマホ向けの麻雀点数計算ページです。

- 公開URL: https://deestrella.github.io/mahjong-score/
- リポジトリ: https://github.com/deestrella/mahjong-score
- Produced by 忍び暗刻

## しくみ

```
スマホ(GitHub Pages の index.html)
   │ 写真 + 指示文 + 合言葉
   ▼
GAS「麻雀点数 中継」(合言葉チェック・1日の回数制限・APIキーを保管)
   │
   ▼
Gemini API(無料枠)… 牌を読み取って JSON で返す
```

- 牌の読み取りだけを AI に任せ、**役・符・点数はページ側のプログラムで計算**します(AI の推測した役は使わない)。
- 場風・自風・ロン/ツモ・本場は画面の設定を優先します。

## フォルダ構成

| パス | 中身 |
|---|---|
| `index.html` | 画面の HTML |
| `assets/style.css` | 見た目(明るい紺のテーマ。ダークモードなし) |
| `assets/app.js` | 点数計算・役判定・写真読み取り・画面の動き |
| `gas/Code.gs` | 中継役(GAS)のコード |
| `gas/appsscript.json` / `.clasp.json` | clasp で GAS を更新するための設定 |
| `tests/cases.json` / `tests/run.mjs` | 点数計算の回帰テスト |
| `samples/` | テスト用の手牌画像(描いた絵)と正解表 |
| `tools/draw_samples.py` | サンプル画像を描くスクリプト(Python + Pillow) |
| `archive/claude-artifact.html` | Claude のアーティファクト版(参考。今後は更新しない) |
| `archive/quick.html` | 旧リポジトリ `mahjong-score-quick` の1ファイル版(参考。今後は更新しない) |
| `docs/TODO.md` | 既知の課題・改善アイデア |
| `CLAUDE.md` | Claude Code 向けの作業メモ |

## はじめての準備(パソコンで1回だけ)

必要なもの: Git、Node.js、Claude Code

1. このフォルダを Claude Code で開く
2. Claude Code にこう頼む:
   「このフォルダを GitHub の deestrella/mahjong-score とつないで、いまの内容を main に push して」
   - GitHub 上の index.html は1ファイル版なので、この push で「html / css / js に分けた版」に置き換わります(見た目と動きは同じ)
3. テストの準備: `npm install` → `npx playwright install chromium`

## ふだんの直し方

1. Claude Code に直したい内容を伝える(例:「切り上げ満貫を選べるようにして」)
2. `npm test` でテストが全部 OK か確かめる
3. commit して `main` に push → 1〜2分で公開ページに反映

役や点数の計算を直したら、`tests/cases.json` に手を1つ足しておくと、次から自動で確かめられます。

## GAS(中継役)の更新

- **画面で直す場合**: script.google.com(sshino… のアカウント)で「麻雀点数 中継」を開いて編集 → 「デプロイ」→「デプロイを管理」→ ✏ →「新バージョン」→「デプロイ」。URL は変わりません。
- **clasp で直す場合**: `npm i -g @google/clasp` → `clasp login`(sshino… のアカウント)→ `clasp push` → 画面で新バージョンをデプロイ。

設定(スクリプトプロパティ):

| 名前 | 内容 |
|---|---|
| `GEMINI_API_KEY` | Gemini の API キー(リポジトリには絶対に書かない) |
| `PASSPHRASE` | 仲間内の合言葉。変えるとすぐ反映 |
| `DAILY_LIMIT` | 1日の読み取り回数の上限(全員の合計) |
| `MODEL` | 最初に使うモデル(いまは gemini-3.5-flash) |
| `MODEL_HQ` | 「高精度で読み直す」で使うモデル(未設定なら MODEL) |

モデルが混雑・提供終了のときは、`Code.gs` の `FALLBACK_MODELS` の順に自動で切り替えます。
