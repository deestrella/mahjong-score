# CLAUDE.md — 忍び暗刻作 点数早見シート

## これは何か
スマホで手牌を撮ると、日本のリーチ麻雀の点数・役・申告の言い方を出す静的ページ。GitHub Pages(main ブランチのルート)で公開。写真の読み取りだけ GAS 経由で Gemini に頼み、役・符・点数は `assets/app.js` が計算する。

## 作業のルール
- UI の文言はすべて日本語。です・ます調で短く。
- 直したら必ず `npm test`。点数や役のロジックを変えたら `tests/cases.json` に手を追加する。
- 公開は `main` への push だけ(ビルド工程なし)。
- `GEMINI_API_KEY` と `PASSPHRASE` の値はリポジトリに書かない(GAS のスクリプトプロパティにだけある)。`app.js` の `API_URL`(GAS の公開URL)は公開されて問題ない。
- `archive/` の `claude-artifact.html` と `quick.html`(旧 `mahjong-score-quick`)は旧版の参考。更新しない。

## app.js の地図(上から順)
- `HAN` / `FUS` / `st`: 翻・符の選択肢と画面の状態(localStorage `mj-state` に保存)
- `calc()`: 翻・符・親子・ツモ/ロン・本場 → 点数、`r.call`/`r.callRead` が申告の言い方(`kana()` で読み)
- `render()`: 上部の設定・答え・早見表の描画(最後に `renderFu()` と `renderEx()` も呼ぶ)
- `parseTiles()` / `parseMelds()`: 牌の記法(`234m` `777z`、暗槓は `(1111s)`)
- `fuCalc()`: 手牌の分解 → 符(`score()`)と役(`yakuOf()`)。高い点数になる分解を採用。国士・七対子は別処理
- `HAKU` / `PROMPT` / `QPROMPT`: AI への指示文(白と裏向き牌の区別、索子/筒子の見分け、カン、撮影レイアウト)
- `samp`: GAS に投げる窓口(`json(prompt, {images, modelTier})`)。`modelTier: 'complex'` が高精度
- `ex` / `exList()` / `applyHan()`: 写真で分からない役(リーチ・一発・海底河底・嶺上・槍槓・ダブリー)とドラ。鳴いていると(`isOpenHand()`)リーチ系と裏ドラは無効
- `applyQuick()`: AI の結果を画面に反映。場風・自風・ロン/ツモ・本場はメモ欄に書いたときだけ上書き

## 採用しているルール(変えるときは要相談)
- 切り上げ満貫なし、連風牌の雀頭は 4 符、役満の複合は 13 翻で頭打ち(ダブル役満なし)
- 天和・地和・人和・流し満貫は未対応
- 喰いタンあり、赤ドラは枚数で手入力

## デザイン
- 明るい単色テーマ(紺)。ダークモードは意図的に無効。色は `assets/style.css` 冒頭の `:root` トークンで管理
- フォント: 本文 Zen Maru Gothic、数字 Jost、タイトル Dela Gothic One

## GAS
- `gas/Code.gs`。スクリプト ID は `.clasp.json`。実行ユーザーは sshino… のアカウント、アクセスは「全員」
- コードを変えたら「新バージョン」でデプロイしないと公開 URL に反映されない
