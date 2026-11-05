# 移行影響調査: typescript 7 / tailwindcss 4 / electron-builder 26

調査日: 2026-11-05 / ブランチ: `docs/migration-survey-20261104`（base: `origin/main` 9cec71f）

この調査ではコード・依存・設定を一切変更していない。新しいバージョンのインストールや試行もしていない。調査手段は `pnpm view`、公式ドキュメントの閲覧、grep の3つに限った。
ESLint 10 は別セッションで試行中のため扱わない。

## 0. 前提

### ベースライン（main 9cec71f、変更なし）

| 項目 | 結果 |
|---|---|
| `pnpm check` | exit 0 |
| テスト | 861 passed / 67 files（指示時の期待値 836 から更新。PR #5・#8 のマージ分） |
| lint | 0 errors / 10 warnings |

### 現行バージョンと移行先（`pnpm view <pkg> dist-tags`、2026-11-05 時点）

| パッケージ | 現行（node_modules） | 移行先 | 備考 |
|---|---|---|---|
| typescript | 5.9.3 | 7.0.2（`latest`） | 中間の 6.0.3 も公開済み |
| tailwindcss | 3.4.19（`v3-lts`） | 4.3.4（`latest`） | |
| electron-builder | 25.1.8 | 26.18.1（`v26`）/ 26.18.0（`latest`） | `next` は 27.0.0-alpha.14 |

### 出典について

この環境のネットワーク設定では、次の3ホストに到達できなかった（DNS 解決不可）。

- `tailwindcss.com`
- `devblogs.microsoft.com`
- `www.electron.build`

そのため、同じ公式組織が GitHub に置いている原稿・changelog を読んだ。
- Tailwind 公式ガイドの原稿: `tailwindlabs/tailwindcss.com` の `src/docs/upgrade-guide.mdx`
- electron-builder の changelog: `packages/app-builder-lib/CHANGELOG.md`

上記3ホストにしか書かれていない内容（TS 7.0 の公式アナウンス本文、electron.build の各ページ）は「未確認」とした。
行番号付き URL は 2026-11-05 取得時点のもの。

---

## 1. TypeScript 5.9.3 → 7.0.2

### 出典

| ID | URL |
|---|---|
| T1 | https://github.com/microsoft/TypeScript/issues/54500 （"6.0 Deprecation List"） |
| T2 | https://github.com/microsoft/TypeScript/issues/62207 （baseUrl の削除） |
| T3 | https://github.com/microsoft/typescript-go/blob/main/README.md?plain=1#L34-L53 （7.0 の機能状況表） |
| T4 | https://github.com/microsoft/typescript-go/blob/main/CHANGES.md?plain=1#L129-L135 （6.0 からの意図的な変更） |
| T5 | https://github.com/andrewbranch/ts5to6 （移行ツール README） |
| T6 | `pnpm view typescript@7.0.2 bin exports` / `pnpm view typescript-eslint@latest peerDependencies` |
| — | https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ は**到達不可のため未確認** |

### 1.1 公式の破壊的変更

| 変更 | 内容 | 出典 |
|---|---|---|
| 6.0 の非推奨は 7.0 で削除 | 「will be removed entirely in TypeScript 7」 | T1 |
| `baseUrl` 削除 | 7.0 では再実装しない。`paths` 側に接頭辞を明記する | T2 |
| 削除されるフラグ値 | 次の値が削除される<br>・`module`: `amd` / `umd` / `systemjs`<br>・`moduleResolution: classic`<br>・`esModuleInterop: false`、`allowSyntheticDefaultImports: false`<br>・`target: es5`<br>・`--outFile`、`--downlevelIteration` | T1 |
| 既定値の変更（6.0〜） | 次の既定値が変わる<br>・`types`: `[]`<br>・`strict`: `true`<br>・`module`: `esnext`<br>・`target`: `es<current year>`<br>・`noUncheckedSideEffectImports`: `true`<br>・`libReplacement`: `false`<br>・`rootDir`: tsconfig のあるディレクトリ<br>・`lib: ["dom"]` に `dom.iterable` を自動で含める | T1 |
| JS API | 機能状況表で「API: not ready」 | T3 |
| npm パッケージの構成 | `typescript@7.0.2` は次のとおりで、従来の `lib/typescript.js`（`require("typescript")` で使う API）を持たない<br>・`exports["."]` は `./lib/version.cjs` のみ。ほかは `./unstable/*`<br>・`bin` は `tsc` のみ（`tsserver` なし） | T6 |
| skipLibCheck 下のエラー | 宣言の衝突は、関係する全箇所でエラーになる | T4 |
| 7.0 で `ignoreDeprecations: "6.0"` が効くか | **未確認**（T1・T2 に記載なし） | — |
| 7.0 の公開日・Node 要件の公式記載 | **未確認**（npm 上の `engines.node` は `>=16.20.0`、T6） | T6 |

### 1.2 このリポジトリへの影響

| 設定・API | 箇所 | 7.0 での扱い | 対応 |
|---|---|---|---|
| `baseUrl: "."` | `tsconfig.json:14`、`tsconfig.node.json:13` | 削除済みでエラー（T2） | 削除するだけでよい。`paths` の値はすでに `./` で始まっている（`tsconfig.json:15-20`、`tsconfig.node.json:14-18`）。過去の試行で「baseUrl 削除で tsc は通過」と記録あり（`UPGRADE_NOTES.md:48`） |
| `types` | `tsconfig.json:21`、`tsconfig.node.json:19`、`tsconfig.test.json:4` | 既定値は `[]` に変わる | 明示しているので影響なし |
| `strict` / `module` / `target` / `esModuleInterop` / `moduleResolution` | `tsconfig.json:3-10`、`tsconfig.node.json:3-9` | 値が明示済みで、削除対象の値（es5・amd・classic 等）は不使用 | 影響なし |
| `noUncheckedSideEffectImports`（既定 true） | 副作用 import は `src/renderer/main.tsx:1` の `import './index.css'` の1件のみ | — | `vite/client` の参照（`src/renderer/vite-env.d.ts:1`）が `declare module '*.css'` を宣言している（`node_modules/vite/client.d.ts:43`）。型上は解決できる見込みだが**実挙動は未検証** |
| `rootDir`（既定値変更） | `noEmit: true`（`tsconfig.json:13`、`tsconfig.node.json:12`） | — | emit しないので影響は小さい見込み。**未検証** |
| tsconfig を読むツール | `eslint.config.js:51-52`（projectService）、`eslint.config.js:66-68,88-90`（import resolver）、`eslint.config.js:340-342`（test 用 project） | — | typescript-eslint 経由（次節 1.3） |

grep 件数: `baseUrl` は2ファイル・2行（ほかの tsconfig 系ファイルには無し）。

### 1.3 周辺依存

| パッケージ | 現行 | peerDependencies（`pnpm view`） | 判定 |
|---|---|---|---|
| typescript-eslint / @typescript-eslint/parser / typescript-estree | 8.72.1（latest） | `typescript: ">=4.8.4 <6.1.0"` | **阻害要因**。canary（8.72.2-alpha.11）も同じ範囲 |
| eslint-plugin-import / eslint-plugin-boundaries / eslint-module-utils / ts-api-utils | — | lockfile 上で `typescript@5.9.3` に依存（`@typescript-eslint/parser` 経由。`pnpm-lock.yaml` の snapshot キー） | typescript-eslint と連動 |
| knip | 6.44.1 | typescript への peer なし。依存は `oxc-parser` / `oxc-resolver` | 影響なし |
| electron-vite | 6.0.0 | `vite ^6‖^7‖^8`、`@swc/core`（optional） | 影響なし |
| vite | 8.3.5 | typescript への peer なし | 影響なし |

lockfile 上で typescript に依存するのは、上の表の typescript-eslint 系・eslint-plugin-import・boundaries・eslint-module-utils・ts-api-utils だけである（`pnpm-lock.yaml` を grep して確認）。

過去に 7.0 を試したときは、lint が `TypeError: Cannot read properties of undefined (reading 'Cjs')` で起動しなかった（`UPGRADE_NOTES.md:48`）。この結果は 1.1 の「JS API なし」と整合する。

`typescript@6` を lint 用、`typescript@7` を tsc 用に分けて併存させる方法が公式に案内されているかは、**未確認**（読めた範囲に記載なし）。

### 1.4 工数の目安

| 項目 | 内容 |
|---|---|
| 変更ファイル | 2（`tsconfig.json`、`tsconfig.node.json`）＋ `package.json`・lockfile |
| 自動移行ツール | `npx @andrewbranch/ts5to6 --fixBaseUrl .`（baseUrl・rootDir のみ対応、T5） |
| リスク | **高（現時点では着手不可）** |
| 理由 | typescript-eslint が TS 7 を peer 範囲外としている。7.0 には従来の JS API が無い。`pnpm check` に含まれる lint が起動しない |
| 当面の代替 | **TS 6.0.3 への移行は peer 範囲（`<6.1.0`）内なので実施できる**。6.0 では baseUrl の使用がエラーになる（T2 の 6.0 plan）ため、baseUrl の削除と既定値変更への追従を 6.0 で先に済ませられる |

---

## 2. Tailwind CSS 3.4.19 → 4.3.4

### 出典

| ID | URL |
|---|---|
| W1 | https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/upgrade-guide.mdx?plain=1 （公式 Upgrade guide の原稿。公開版は https://tailwindcss.com/docs/upgrade-guide で、到達不可のため原稿で確認。以下 `W1:行` で表記） |
| W2 | https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md （`## [4.0.0] - 2025-01-21` の節） |
| W3 | https://github.com/tailwindlabs/prettier-plugin-tailwindcss （README） |
| W4 | https://github.com/francoismassart/eslint-plugin-tailwindcss （README、v4 ブランチ） |
| W5 | `pnpm view` で取得した各パッケージの `peerDependencies` / `engines` |

### 2.1 公式の破壊的変更（このリポジトリに関係するもの）

| 変更 | 内容 | 出典 |
|---|---|---|
| 自動移行ツール | `npx @tailwindcss/upgrade`。依存・設定ファイル（CSS 化）・テンプレートを移行する。**Node.js 20 以上が必要** | W1:8-24 |
| PostCSS プラグイン | PostCSS プラグインは `@tailwindcss/postcss` に分離された。`postcss-import` と `autoprefixer` は不要になる | W1:27-46 |
| Vite プラグイン | `@tailwindcss/vite` も選べる | W1:47-64、W2 |
| ブラウザ要件 | Safari 16.4 / Chrome 111 / Firefox 128 | W1:83-88 |
| `@tailwind` ディレクティブ | 廃止され、`@import "tailwindcss"` に置き換わる | W1:89-102 |
| 削除されたユーティリティ | `bg-/text-/border-/divide-/ring-/placeholder-opacity-*`、`flex-shrink-*`、`flex-grow-*`、`overflow-ellipsis`、`decoration-slice/clone` | W1:103-209 |
| 改名されたユーティリティ | `shadow-sm→shadow-xs`、`shadow→shadow-sm`、`drop-shadow(-sm)`、`blur(-sm)`、`backdrop-blur(-sm)`、`rounded-sm→rounded-xs`、`rounded→rounded-sm`、`outline-none→outline-hidden`、`ring→ring-3` | W1:210-383 |
| `space-x/y-*` のセレクタ | `> :not([hidden]) ~ :not([hidden])` の margin-top から `> :not(:last-child)` の margin-bottom に変わる | W1:384-414 |
| border / divide の既定色 | `gray-200` から `currentColor` に変わる | W1:472-499 |
| `ring` の既定 | 幅 3px→1px、色 `blue-500`→`currentColor` | W1:500-534 |
| Preflight の変更 | placeholder の既定色は現在の文字色の 50% になる。button の cursor は `default` になる | W1:535-589 |
| `!` important 修飾子 | 末尾に置く形が推奨になる（先頭は互換のため残るが非推奨） | W1:635-647 |
| `[--var]` 省略記法 | `(--var)` に変わる | W1:711-724 |
| `hover:` | `@media (hover: hover)` の環境でだけ効く | W1:739-760 |
| ネイティブのカスケードレイヤー | v4 は `@layer` を独自に横取りせず、ブラウザ標準のカスケードレイヤーを使う | W1:650-652 |
| `theme()` 関数 | CSS 変数の利用を推奨 | W1:807-830 |
| JS 設定ファイル | 自動では検出されない。使うなら `@config "…"` で明示的に読み込む。`corePlugins` / `safelist` / `separator` は非対応 | W1:803-806、W1:831-843 |
| content 指定 | 自動検出になる | W2（4.0.0 Added "Automatic content detection"） |
| JS 設定内の plugins の CSS 側読み込み方法（`@plugin` 等） | **未確認**（W1 に記載なし） | — |

### 2.2 このリポジトリへの影響

#### 設定と CSS（grep 結果）

| 対象 | 箇所 | 必要な対応（根拠） |
|---|---|---|
| `@tailwind base/components/utilities` | `src/renderer/index.css:1-3`（3行。src 全体でもこの3行のみ） | `@import "tailwindcss"` へ置き換え（W1:89） |
| `@apply` / `theme()` / `@layer` | src 内 **0件** | 対応不要 |
| `tailwind.config.js`（53行） | 次の内容<br>・`content`: 3パターン（:3-7）<br>・`theme.extend.colors`: 20トークン、すべて CSS 変数か固定色（:9-47）<br>・plugins: `@tailwindcss/typography`（:50-52） | 次のどちらかを選ぶ<br>・`@config` で読み込みを続ける（W1:831）<br>・`@theme` へ CSS 化する（upgrade ツールが対応、W1:8）<br>`corePlugins` / `safelist` / `separator` は不使用で影響なし |
| `tailwind.config.js` の形式 | CJS（`module.exports` / `require`）だが、`package.json:3` は `"type": "module"` | v4 の `@config` がこの形式を読めるかは**未確認** |
| `postcss.config.cjs:1-6` | `tailwindcss` と `autoprefixer` を使用 | `@tailwindcss/postcss` へ置き換え。autoprefixer は削除可（W1:27-46）。代わりに `electron.vite.config.ts:84` の renderer に `@tailwindcss/vite` を入れる方法もある |
| `.prettierrc.json:13` | plugins に `prettier-plugin-tailwindcss` を指定。`tailwindConfig` / `tailwindStylesheet` の指定はなし | v4 では `tailwindStylesheet`（CSS の入口）の指定が必須（W3） |
| `eslint.config.js:246-251` | `settings.tailwindcss.config` に `tailwind.config.js` を指定 | eslint-plugin-tailwindcss 4.x は `cssConfigPath`（.css）が必須（W4）。次節 2.3 |
| レイヤー外のグローバル CSS | `src/renderer/index.css:386-390` の `* { margin: 0; padding: 0; box-sizing: border-box; }` ほか、`@layer` に入っていない規則が20個（`@keyframes` を除く。:386〜:545） | 下記「要注意」を参照 |

**要注意（推論・未検証）:** v4 はネイティブのカスケードレイヤーを使う（W1:652）。CSS の一般則では、レイヤーに入っていない宣言は、レイヤー内の宣言より詳細度に関係なく優先される。そのため `index.css:386` の `* { margin:0; padding:0 }` が `p-*`・`m-*`・`space-y-*` などのユーティリティを打ち消すおそれがある。

- この一般則の原文（CSS Cascade 仕様）は本調査では読んでいない。
- 移行するなら `@layer base { … }` で包むことを前提作業にし、実画面で確認する。
- upgrade ツールがこの位置（`@tailwind` より後ろ）の CSS を自動でレイヤーに包むかは**未確認**。changelog にあるのは「`@tailwind` より前」の CSS を包む修正のみ（W2:1341 付近）。

#### クラス名への影響（静的走査による概数）

数え方:
- 対象は `src/renderer`・`src/shared` の .ts/.tsx/.html、235ファイル。
- 文字列リテラル内のトークンを数えた。
- 範囲の左は「1行のクラス列だけ」に限った厳しめの集計、右は全文字列での集計。
- テンプレートリテラル内の三項演算子など、動的に組み立てるクラスは取りこぼしがある。

| 変更（出典） | 件数 / ファイル数 | 例 |
|---|---|---|
| `rounded`（単体）→ `rounded-sm`（W1:210） | 91〜118 / 46〜56 | `src/renderer/components/chat/DisplayItemList.tsx:286` |
| `rounded-sm` → `rounded-xs` | 20〜22 / 5 | `src/renderer/components/chat/ChatHistoryLoadingState.tsx:23` |
| `rounded-bl-sm` / `rounded-br-sm` | 2 / 2 | `SystemChatGroup.tsx:45`、`UserChatGroup.tsx:458`。辺を指定する版の扱いは W1 の表に明記がなく**未確認** |
| `shadow`（単体）→ `shadow-sm` | 1 / 1 | `src/renderer/components/settings/components/SettingsToggle.tsx:38` |
| `shadow-sm` → `shadow-xs` | 3〜4 / 3〜4 | `src/renderer/components/chat/viewers/CodeBlockViewer.tsx:156` |
| `outline-none` → `outline-hidden` | 8〜18 / 8〜15 | `src/renderer/components/search/SearchBar.tsx:131` |
| `ring`（単体） | 0（ヒット1件はコメント内の誤検出: `useTabNavigationController.ts:50`） | — |
| `ring-{幅}` / `ring-offset-*`（幅を明示しているので既定値変更の影響外） | 8〜22 / 2〜8 | `ChatHistoryItem.tsx:39-41` |
| 色を指定していない border 幅クラス（既定色変更の影響候補、W1:472） | 44〜68 / 25〜34 | `src/renderer/components/chat/AIChatGroup.tsx:391`（`border-l-2`）。inline の `borderColor` 指定が76箇所あり、実際に影響する数はこれより少ない見込み |
| `space-x/y-*`（セレクタ変更、W1:384） | 54〜61 / 35〜38 | `ChatHistoryLoadingState.tsx:14` |
| `hover:`（W1:739） | 72〜114 / 39〜54 | マウス操作のデスクトップアプリでは影響小の見込み（**未検証**） |
| `<button>` の cursor 既定値（W1:535） | `<button` 146個 / 62ファイル（`cursor-pointer` の指定は37箇所） | 指定のない button は矢印カーソルになる |
| 削除されたユーティリティ（`*-opacity-*` 等） | **0** | — |
| `!` 先頭の important / `[--var]` 省略記法 | **0** / **0** | — |
| `[var(--x)]`（完全記法） | 3 / 3 | `CodeBlockViewer.tsx:218`。W1:711 の変更は省略記法だけが対象 |
| `prose`（typography） | 2 / 1 | `src/renderer/components/common/UpdateDialog.tsx:146` |

改名対象（rounded・shadow・outline-none）のどれかを含むファイルは、和集合で約66。

ブラウザ要件: Electron 45.2.1 の Chromium は 156.0.8078.75 で、要件の Chrome 111 以上を満たす（インストール済みの `node_modules/.bin/electron` を `ELECTRON_RUN_AS_NODE=1` で起動して `process.versions.chrome` を確認）。

### 2.3 周辺依存

| パッケージ | 現行 | 移行後の候補と peer（`pnpm view`, W5） | 阻害要因・対応 |
|---|---|---|---|
| eslint-plugin-tailwindcss | 3.18.3（peer `tailwindcss ^3.4.0 ‖ ^4.0.0`、node `>=18.12`） | 4.4.0: peer `tailwindcss ^4.0.0`、`eslint ^9 ‖ ^10`、node `>=20.19.0` | 設定の作り直しが必要<br>・`settings.config` を `cssConfigPath`（.css、必須）へ移す（W4）<br>・使用中のルール `no-contradicting-classname` / `no-custom-classname`（`eslint.config.js:282-286`）は 4.x にも存在する（W4）<br>・`configs.recommended` キーが 4.x にあるかは**未確認**（README には `configs["flat/recommended"]` とある。`eslint.config.js:263`）<br>・新しい推奨ルール（`enforces-canonical-classname` 等）で警告がどれだけ増えるかは**未確認**<br>ESLint 9/10 のどちらでも動くので、別セッションの ESLint 10 試行は阻害要因ではない |
| prettier-plugin-tailwindcss | 0.8.1（peer `prettier ^3.0`、node `>=20.19`） | 同じバージョンのまま | v3.0 以降と v4 の両方に対応（W3）。`.prettierrc.json` に `tailwindStylesheet` の追加が必要 |
| @tailwindcss/typography | 0.5.20 | peer `tailwindcss >=3.0.0 ‖ >=4.0.0 ‖ insiders` | 阻害なし |
| @tailwindcss/postcss / @tailwindcss/vite | 未導入 | どちらも 4.3.4。vite プラグインの peer は `vite ^5.2 ‖ ^6 ‖ ^7 ‖ ^8` | 阻害なし（vite 8.3.5） |
| autoprefixer | 10.6.2（`package.json:86`） | — | 削除できる（W1:27） |
| Node（CI） | `node-version: 20`（`.github/workflows/ci.yml:43,75`、`release.yml:26,75,188,240`） | — | upgrade ツールは Node 20 以上、eslint-plugin-tailwindcss 4 は `>=20.19.0` が必要。CI の実際の 20.x マイナー版は**未確認** |

### 2.4 工数の目安

| 項目 | 内容 |
|---|---|
| 変更ファイル | 設定5（`tailwind.config.js`、`postcss.config.cjs`、`src/renderer/index.css`、`eslint.config.js`、`.prettierrc.json`）＋ `package.json`・lockfile ＋ クラス名を改名するコンポーネント 約66ファイル |
| 自動移行ツール | `npx @tailwindcss/upgrade`（依存・設定・テンプレートに対応、W1:8-24） |
| リスク | **中〜高** |
| 理由 | 見た目の変化は `pnpm check`（型・lint・テスト・build）では検出できない。具体的には次の3点<br>・border の既定色<br>・space-y のセレクタ<br>・レイヤー外 CSS の優先順位<br>このため画面の目視比較が必要。lint プラグインもメジャー更新と設定の作り直しを同時に行う必要がある |

---

## 3. electron-builder 25.1.8 → 26.18.1

### 出典

| ID | URL |
|---|---|
| B1 | https://github.com/electron-userland/electron-builder/blob/master/packages/app-builder-lib/CHANGELOG.md?plain=1 （26.0.0〜26.15.3。26.0.0 と 26.0.0-alpha.* の節は L1947-L2261） |
| B2 | https://github.com/electron-userland/electron-builder/blob/release/v26/packages/app-builder-lib/CHANGELOG.md?plain=1 （26.16.0〜26.18.1） |
| B3 | https://github.com/electron-userland/electron-builder/blob/release/v26/packages/app-builder-lib/scheme.json （v26 の設定スキーマ） |
| B4 | https://github.com/electron-userland/electron-builder/blob/master/MIGRATION.md （v26→v27 用。26 自体の移行ガイドではない） |
| B5 | `pnpm view electron-builder@{25.1.8,26.18.1} engines dependencies` |
| — | https://www.electron.build/changelog/ と https://www.electron.build/mac は**到達不可のため未確認** |

### 3.1 公式の破壊的変更

| 変更 | 内容 | 出典 |
|---|---|---|
| 26.0.0 Major #8582 | `winOptions` / `macOptions` の非推奨フィールドを削除した<br>・Windows の署名設定は `win.signtoolOptions` へ移動<br>・mac の notarize オプションは、環境変数による指定に置き換わった | B1:1951-1954 |
| 26.0.0 Major #8572 | linux の `desktop` プロパティがオブジェクトになった | B1:1956 |
| 26.1.0〜26.15.3 | 「Major Changes」の節は0件 | B1（L816-L1946 を grep） |
| 26.16.0〜26.18.1 | 「Major Changes」「BREAKING」はいずれも0件 | B2（L1-L186 を grep） |
| pnpm 向け node_modules 収集処理の修正が多数（非破壊扱い） | 例:<br>・26.6.0 "pnpm collector returning zero modules"（#9535）<br>・26.8.2 deduped 対応（#9618）<br>・26.10.0 pnpm v11 対応（#9720）<br>・26.14.0 hoisted 対応（#9811） | B1:1316, 1209, 1126, 916 |
| Node 要件 | 25.1.8、26.18.1 とも `engines.node >=14.0.0` | B5 |
| APFS への DMG 既定変更・ESM 化・Node `>=22.12`・`electronUpdaterCompatibility >=7` | **v27 の変更**（26 には含まれない） | B1:559-563、B4 |
| electron.build の 26.x 移行ドキュメント | **未確認**（到達不可） | — |

### 3.2 このリポジトリへの影響

`package.json:116-184` の `build` で使っているキーを v26 のスキーマ（B3）と突き合わせた。

| キー | 箇所 | v26 での扱い |
|---|---|---|
| `appId` `productName` `directories` `files` `asar` `asarUnpack` `npmRebuild` `extraMetadata` | `package.json:117-134` | スキーマに存在する |
| `mac.category/target/artifactName/hardenedRuntime/gatekeeperAssess/entitlements/entitlementsInherit/icon` | `package.json:135-148` | スキーマに存在する |
| `mac.notarize: true` | `package.json:144` | v26 では `type: boolean`。公証は次のいずれかの環境変数の組で行う<br>1. `APPLE_API_KEY` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER`<br>2. `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`<br>3. `APPLE_KEYCHAIN` / `APPLE_KEYCHAIN_PROFILE`<br>`release.yml:106-108` で 2 の組を設定済みなので、#8582 の影響はない |
| `dmg.sign` | `package.json:149-151` | スキーマに存在する |
| `win.target/artifactName/icon` | `package.json:152-158` | スキーマに存在する。Windows の署名設定は使っていないので #8582 の影響なし |
| `linux.*`、`deb.afterInstall` | `package.json:159-172` | スキーマに存在する。`desktop` は使っていないので #8572 の影響なし |
| `nsis.oneClick/perMachine/allowToChangeInstallationDirectory` | `package.json:173-177` | スキーマに存在する |
| `publish[{provider: github, releaseType: draft}]` | `package.json:178-183` | `releaseType` の enum に `draft` を含む |

**設定ファイルの変更は 0 件の見込み。** ただし実際に `electron-builder` を動かしての確認はしていない。

ほかに確認が必要な点:

- **node_modules の同梱（未検証）:** main プロセスは本番依存をすべてバンドルしている（`electron.vite.config.ts:7-11,35-37`）。それでも `package.json:50-73` の `dependencies`（22件）は残っているため、electron-builder は node_modules を app.asar に収集する。26.x では pnpm 向けの収集処理が何度も変わっている（3.1）ので、asar の中身が変わる可能性がある。移行前後で `asar list` を比較するべき。
- **electron-updater:** `electron-updater ^6.8.11`（`package.json:58`）は `src/main/services/infrastructure/UpdaterService.ts` で使っている。26.x の changelog に updater 互換性の破壊的変更はない（B1, B2）。
- **配布コマンド:** `dist:*` スクリプト（`package.json:23-28`）と `release.yml:109,219,274` は変更不要の見込み。

### 3.3 周辺依存

| パッケージ | 内容 | 判定 |
|---|---|---|
| electron-builder 26.18.1 の依存 | `app-builder-lib` / `builder-util` 26.18.1、`builder-util-runtime` 9.7.1（B5） | — |
| electron-updater | latest は 6.8.12（`pnpm view`） | 6.x のまま使える。v27 では 7 が必要（B4） |
| electron-vite / vite | 関係なし（electron-builder は build 後の `out/`・`dist-electron/` を読むだけ） | 阻害なし |

### 3.4 工数の目安

| 項目 | 内容 |
|---|---|
| 変更ファイル | `package.json`（バージョンのみ）・lockfile。設定は 0 の見込み |
| 自動移行ツール | 不要。`electron-builder migrate-schema` は v27 向けの案内（B4）で、26 にあるかは**未確認** |
| リスク | **中** |
| 理由 | 設定の破壊的変更は該当しないが、配布物・署名・公証・自動更新は `pnpm check` の対象外。3 OS で配布物を作り、起動・更新を確認しないと検証できない。pnpm 向け収集処理の変更で同梱物が変わる可能性もある |

---

## 4. 横断: 推奨する着手順と前提

| 順 | 対象 | 理由 | 先に片付けるべき前提 |
|---|---|---|---|
| 1 | electron-builder 26 | 設定変更が 0 の見込みで、lint・TS・CSS と独立している。リスクは配布物に限られる | ・`--publish never` で3 OS の配布物を作る手順を用意する<br>・移行前後の `asar list` の差分と起動確認を、検証項目として決める<br>・mac の署名・公証用 secrets が使える状態にする（`release.yml:104-108`） |
| 2 | tailwindcss 4（＋ eslint-plugin-tailwindcss 4、prettier の設定） | TS とは独立。eslint-plugin-tailwindcss 4.4.0 は ESLint 9/10 の両方に対応しており、ESLint 10 の試行を待つ必要はない | ・`index.css:386` などレイヤー外の CSS を `@layer base` に入れるか判断する<br>・JS 設定（`@config` で継続）か CSS-first かを決める<br>・移行前の画面スクリーンショットを撮っておき、目視比較の手順を用意する<br>・CI の Node が 20.19 以上か確認する |
| 3a | typescript 6.0.3（中間ステップ） | typescript-eslint の peer `<6.1.0` の範囲内なので今すぐ着手できる | `baseUrl` の削除（2ファイル、ts5to6 で自動化できる） |
| 3b | typescript 7 | **阻害要因あり**。typescript-eslint が対応するまで着手できない | typescript-eslint の peer に 7 が入ることを `pnpm view typescript-eslint peerDependencies` で定期的に確認する |

---

## 5. 比較表

| 項目 | typescript 7 | tailwindcss 4 | electron-builder 26 |
|---|---|---|---|
| 現行 → 移行先 | 5.9.3 → 7.0.2 | 3.4.19 → 4.3.4 | 25.1.8 → 26.18.1 |
| 阻害要因 | **typescript-eslint の peer `<6.1.0`。7.0 に JS API なし** | なし（lint プラグインのメジャー更新と同時に行う必要あり） | なし |
| 変更が必要なファイル数（package.json・lockfile 除く） | 2 | 設定5 ＋ コンポーネント約66 | 0（見込み） |
| 自動移行ツール | ts5to6（baseUrl・rootDir のみ） | `@tailwindcss/upgrade`（Node 20 以上） | 不要 |
| `pnpm check` で検証できる範囲 | 型・lint（lint が起動すれば） | 型・lint・build（見た目は不可） | 不可（配布物は対象外） |
| リスク | 高（現時点では着手不可） | 中〜高 | 中 |
| 推奨順 | 3（6.0.3 を先行） | 2 | 1 |

## 6. 未確認事項（要フォローアップ）

1. TS 7.0 の公式アナウンス（devblogs）の本文、7.0 で `ignoreDeprecations: "6.0"` が効くか、`typescript@6` と `@7` を併存させる公式手順の有無。
2. TS 6.0 以降の既定値 `noUncheckedSideEffectImports: true`・`rootDir` を、このリポジトリで実際に適用したときの挙動。
3. Tailwind v4 の `@config` が CJS 形式の `tailwind.config.js`（`"type": "module"` 配下）を読めるか。JS 設定内の plugins の扱い。辺を指定した `rounded-*-sm` の改名有無。
4. レイヤー外のグローバル CSS（`index.css:386-390`）が v4 でユーティリティを上書きするか（CSS 仕様の原文確認と実画面での検証）。upgrade ツールがこれを自動で包むか。
5. eslint-plugin-tailwindcss 4.x の `configs.recommended` キーの有無と、新しい推奨ルールで増える警告の件数。
6. electron.build（公式サイト）にある 26.x の移行情報。`migrate-schema` が 26 にあるか。
7. electron-builder 26 で asar の中身（同梱される node_modules）が変わるか。
8. CI（`node-version: 20`）で実際に解決される Node のマイナー版。

上記 1・3・6 の公式ページは、この環境のネットワーク設定で到達できなかった `tailwindcss.com`・`devblogs.microsoft.com`・`www.electron.build` にある。
