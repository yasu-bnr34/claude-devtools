# Dependency Upgrade Notes (2026-11-02)

Branch: `deps/update-20261102` (base: `origin/main` 9fed06d)

## ベースラインとの差

| 項目 | ベースライン (main) | 更新後 |
|---|---|---|
| `pnpm check` | exit 0 | exit 0 |
| テスト | 826 passed / 60 files | 826 passed / 60 files |
| lint | 0 errors / 5 warnings | 0 errors / 10 warnings |
| build 時間 (renderer) | 約 16 s | 約 3 s（Vite 8） |
| `pnpm format:check`（check 対象外） | 30 files 不一致 | 30 files 不一致（変化なし） |
| `npx knip`（check 対象外） | 失敗（既存） | 失敗（既存、検出件数増） |

lint warning 増分 (+5): sonarjs 4 で `sonarjs/function-return-type` の disable コメントが不要化 (3)、react-refresh 0.5 の `only-export-components` (2)。いずれも warning のみ。

## 更新したもの

| パッケージ | 旧 → 新 | 追従修正 |
|---|---|---|
| patch/minor 一式（`pnpm update`） | 範囲内最新 | `eslint.config.js`: tailwind config パスを絶対パス化（eslint-plugin-tailwindcss 3.18.3 が相対パスを解決できない） |
| @types/node | 25 → 26 | なし |
| date-fns | 3 → 4 | なし |
| @fastify/static | 9 → 10 | なし |
| mermaid | 11 → 12 | なし |
| lucide-react | 0.562 → 1.66 | なし |
| zustand | 4 → 5 | `ConnectionStatusBadge`: オブジェクトを返す selector を `useShallow` で包む（v5 で無限再レンダの原因になる） |
| react / react-dom / @types/react / @types/react-dom | 18 → 19 | 型追従のみ: `JSX` → `React.JSX`、`useRef()` に初期値、`RefObject<T \| null>`、`MutableRefObject` → `RefObject`、`FormEvent` → `SubmitEvent` |
| happy-dom | 20 → 21 | なし |
| knip | 5 → 6 | なし |
| eslint-plugin-security | 3 → 4 | なし（simple-import-sort と同一コミット） |
| eslint-plugin-simple-import-sort | 12 → 14 | なし |
| eslint-plugin-sonarjs | 3 → 4 | disable コメントのルール名変更 `slow-regex` → `super-linear-regex`（2 箇所） |
| eslint-plugin-boundaries | 5 → 7 | なし（旧設定形式は非推奨警告のみ。renderer→main 違反の検出を手動確認済み） |
| eslint-plugin-react-refresh | 0.4 → 0.5 | なし |
| prettier-plugin-tailwindcss | 0.7 → 0.8 | なし |
| vite / vitest / @vitest/coverage-v8 / @vitejs/plugin-react / electron-vite | 6/3/3/4/2 → 8/5/5/6/6 | テストのみ: `WorktreeGrouper.test` の `vi.mock` をトップレベルへ移動、`useVisibleAIGroup.test` で constructor 用 `vi.fn` を function 化・`act` を react から import・`IS_REACT_ACT_ENVIRONMENT` 設定・unmount を act で包む |
| electron | 40 → 45 | `clipboard.writeText` が Promise を返すため `await`（2 箇所） |

## 見送ったもの

| パッケージ | 対象 | 理由 | エラー（1行） |
|---|---|---|---|
| typescript-eslint | 8.54 → 8.72（minor） | 新ルール挙動で lint error 20 件。解消にはコード修正（`React.memo(function X)` の改名等）が必要 | `'DisplayItemList' is already declared in the upper scope` (@typescript-eslint/no-shadow) ほか no-unnecessary-type-assertion 14 件 |
| eslint-plugin-react-hooks | 7.0 → 7.1（minor） | React Compiler 系ルールで lint error 11 件。解消にはコンポーネント修正が必要 | `Calling setState synchronously within an effect can trigger cascading renders` |
| eslint / @eslint/js | 9 → 10 | eslint-plugin-import（最新 2.32.0）が ESLint 10 非対応 | `Error while loading rule 'import/no-default-export': Cannot use 'in' operator to search for 'sourceType' in undefined` |
| typescript | 5.9 → 7.0 | typescript-eslint が TS 7 非対応（peer `<6.1.0`）。`baseUrl` 削除で tsc は通過したが lint 起動不可 | `@typescript-eslint/typescript-estree ... TypeError: Cannot read properties of undefined (reading 'Cjs')` |
| tailwindcss | 3 → 4 | 設定/CSS の移行（`@tailwindcss/postcss`、CSS-first config）が必要で最小修正の範囲外。未試行 | — |
| eslint-plugin-tailwindcss | 3 → 4 | peer `tailwindcss ^4` のため tailwindcss 4 と連動。未試行 | — |
| electron-builder | 25 → 26 | 配布・署名まわりで `pnpm check` では検証できないため。未試行 | — |

## 注意（動作確認が必要な点）

- `pnpm check` はアプリの起動を含まない。React 19 / zustand 5 / Electron 45 / electron-vite 6 は GUI での起動確認を推奨。
- `@types/node` 26 は Electron 45 同梱の Node より新しい可能性がある（型チェックのみの影響）。

## lint-minor 追補（2026-11-02）

Branch: `deps/lint-minor-20261102`（base: `origin/deps/update-20261102`）

### 更新できたもの

| パッケージ | 旧 → 新 | 追従修正（挙動変更なし） |
|---|---|---|
| typescript-eslint | 8.54.0 → 8.72.1 | `@typescript-eslint/no-shadow`（6件）: `React.memo(function X)` の内側関数名を `XFn` に改名（DisplayItemList / ExecutionTrace / LinkedToolItem / TextItem / ThinkingItem / SessionItem）。`@typescript-eslint/no-unnecessary-type-assertion`（14件）: 不要な `as` を削除。これに伴い未使用となった `ClaudeMdSource` の type import を削除（contextTracker.ts） |

注: 内側関数名の変更により React DevTools 上の表示名が `XFn` になる（実行時の挙動は不変）。`Component` 接尾辞だと ExecutionTrace / LinkedToolItem の行が printWidth 100 を超え Prettier が本体全体を再インデントするため、短い `Fn` にした。

### 見送ったもの

| パッケージ | 対象 | 理由 |
|---|---|---|
| eslint-plugin-react-hooks | 7.0.1 → 7.1.1（minor） | 新ルールの lint error 11 件はいずれも、解消すると effect の実行タイミングや描画回数が変わる（state を render 中に導出・key によるリセット・ref 更新を effect へ移動 等）ため修正せず。error 0 を満たせないため更新を戻した |

react-hooks 7.1.1 の error 詳細（未修正）:

| ファイル | 行 | ルール | 見送り理由 |
|---|---|---|---|
| src/renderer/components/search/CommandPalette.tsx | 342 | react-hooks/set-state-in-effect | UUID 不一致時の `setSessionIdMatch(null)`。render 中導出へ変えると更新タイミングが変わる |
| src/renderer/components/search/CommandPalette.tsx | 376 | react-hooks/set-state-in-effect | 同上（`setPartialIdMatches([])`） |
| src/renderer/components/search/CommandPalette.tsx | 414 | react-hooks/set-state-in-effect | 検索結果クリア（`setSessionResults([])` 等）。同上 |
| src/renderer/components/search/CommandPalette.tsx | 467 | react-hooks/set-state-in-effect | 結果変化時の `setSelectedIndex(0)`。render 中リセットへ変えると描画回数が変わる |
| src/renderer/components/search/SearchBar.tsx | 60 | react-hooks/set-state-in-effect | store→ローカル state 同期。同上 |
| src/renderer/components/settings/hooks/useSettingsConfig.ts | 220 | react-hooks/purity | render 中の `Date.now()`。state/effect 化すると評価タイミングが変わる |
| src/renderer/components/settings/hooks/useSettingsHandlers.ts | 67 | react-hooks/refs | render 中の `configRef.current = config`。effect へ移すと ref 更新が commit 後にずれる |
| src/renderer/components/settings/sections/ConnectionSection.tsx | 89 | react-hooks/set-state-in-effect | mount 時ロード（内部で同期 setState）。呼出し位置変更は実行タイミング変更 |
| src/renderer/components/settings/sections/GeneralSection.tsx | 78 | react-hooks/set-state-in-effect | 同上（`loadClaudeRootInfo`） |
| src/renderer/components/settings/sections/WorkspaceSection.tsx | 82 | react-hooks/set-state-in-effect | 同上（`loadProfiles`） |
| src/renderer/components/settings/sections/WorkspaceSection.tsx | 90 | react-hooks/set-state-in-effect | 編集開始時のフォーム初期化。key リセット等へ変えると描画回数が変わる |

### ベースラインとの差

| 項目 | ベースライン（deps/update-20261102） | 本ブランチ |
|---|---|---|
| `pnpm check` | exit 0 | exit 0 |
| テスト | 826 passed / 60 files | 826 passed / 60 files |
| lint | 0 errors / 10 warnings | 0 errors / 10 warnings（変化なし） |
| `prettier --check`（変更ファイル、check 対象外） | ReadToolViewer / WriteToolViewer が既存不一致 | 同じ（新規不一致なし） |

## react-hooks 追補（2026-11-04）

Branch: `deps/react-hooks-20261104`（base: `origin/main` d984fe5）

### 結論

eslint-plugin-react-hooks 7.0.1 → 7.1.1 は **見送り**（依存は 7.0.1 のまま）。7.1.1 の error 11 件（前節の記録と件数・ファイル・行が一致）のうち 4 件を挙動を変えずに修正し、7 件は見送り。見送りが残るため更新を戻した。修正 4 件は 7.0.1 でも `pnpm check` を通る。ルールの無効化・eslint-disable・設定緩和は行っていない。

テスト方式: 既存と同じ vitest + happy-dom + `react-dom/client` の `createRoot` / `act`（React Testing Library は未導入・追加なし）。描画回数は `React.Profiler` の `onRender` で観測。各テストは修正前のコードで通ることを確認してから修正した。

### 箇所ごとの結果

| ファイル | 行（7.1.1 報告時） | ルール | 結果 | 理由 / 修正内容 | 追加したテスト |
|---|---|---|---|---|---|
| src/renderer/components/settings/hooks/useSettingsHandlers.ts | 67 | react-hooks/refs | 修正した | `configRef.current = config` を `useLayoutEffect` へ移動。ref を読むのはクリック時の export と `await` 後の catch のみで、いずれも commit 後に実行されるため、layout effect（commit 時に同期実行）で更新しても読む値は同じ | test/renderer/components/settings/useSettingsHandlers.test.ts（3件: rerender 後の export が最新 config を出力し callback は同一参照 / config null 時は何もしない / updateTrigger 失敗時の復元値が最新 config） |
| src/renderer/components/settings/sections/WorkspaceSection.tsx | 82 | react-hooks/set-state-in-effect | 修正した | `loadProfiles` は setState が全て `await` 後で、同期 setState は元々なかった（前節の「内部で同期 setState」は誤り）。同じ本体を effect 内の async 関数に展開。API 発行タイミング・setState タイミングとも不変。`loadProfiles` 自体は他のハンドラ用に残置 | test/renderer/components/settings/sectionMountLoad.test.ts（Workspace 2件: mount で config を1回要求・解決前は1コミットのみ・解決後に一覧表示 / 失敗時は空表示＋error ログ） |
| src/renderer/components/settings/sections/GeneralSection.tsx | 78 | react-hooks/set-state-in-effect | 修正した | 同上（`loadClaudeRootInfo` を effect 内に展開。関数自体はパス変更処理用に残置） | 同ファイル（General 2件: mount で1回要求・解決後に1コミット増えてパス表示 / 失敗時にエラーメッセージ表示） |
| src/renderer/components/settings/sections/ConnectionSection.tsx | 89 | react-hooks/set-state-in-effect | 修正した | 同上（`loadProfiles` / `loadClaudeRootInfo` は effect 専用だったため effect 内へ移動。4つの読み込みの発行順は不変） | 同ファイル（Connection 1件: mount で4つの読み込みを各1回発行・解決後に更新・失敗は無音で握りつぶす） |
| src/renderer/components/search/SearchBar.tsx | 60 | react-hooks/set-state-in-effect | 見送り | 実測: 外部の store 変更時、現行は「古い localQuery で1回コミット → 同期後に1回コミット」。render 中調整（prev state 比較）に変えると中間コミットが消え、固定テストが落ちた（`['initial','external']` → `['external']`）。修正を戻した | test/renderer/components/search/SearchBar.test.ts（2件: 初期値 / 外部変更時のコミット列。現行挙動の記録として残置） |
| src/renderer/components/search/CommandPalette.tsx | 342 | react-hooks/set-state-in-effect | 見送り | SearchBar と同じ構造（query 変化で一度コミット後に effect でリセット）。代替は中間コミットを消すため挙動が変わる。同原因のため変種は試していない | なし |
| src/renderer/components/search/CommandPalette.tsx | 376 | react-hooks/set-state-in-effect | 見送り | 同上 | なし |
| src/renderer/components/search/CommandPalette.tsx | 414 | react-hooks/set-state-in-effect | 見送り | 同上 | なし |
| src/renderer/components/search/CommandPalette.tsx | 467 | react-hooks/set-state-in-effect | 見送り | 同上（結果変化時の `setSelectedIndex(0)`） | なし |
| src/renderer/components/settings/sections/WorkspaceSection.tsx | 90 | react-hooks/set-state-in-effect | 見送り | 同上（編集開始時のフォーム初期化。`profiles` 変化時の再初期化もあり、ハンドラへ移すと挙動が変わる） | なし |
| src/renderer/components/settings/hooks/useSettingsConfig.ts | 220 | react-hooks/purity | 見送り | `isSnoozed` は render ごとの `Date.now()` 評価に依存（再描画時に期限切れを反映）。state / lazy init / effect 化は評価時刻が固定・遅延して結果が変わる。関数で包んで検出を避けるのはルール回避のため行わない | なし |

### ベースラインとの差

| 項目 | ベースライン（main d984fe5） | 本ブランチ |
|---|---|---|
| eslint-plugin-react-hooks | 7.0.1 | 7.0.1（7.1.1 は見送り） |
| `pnpm check` | exit 0 | exit 0 |
| テスト | 826 passed / 60 files | 836 passed / 63 files（+10 / +3） |
| lint | 0 errors / 10 warnings | 0 errors / 10 warnings（変化なし） |
| 7.1.1 適用時の lint error | 11 | 7 |

## eslint 10 追補（2026-11-04）

Branch: `deps/eslint10-20261104`（base: `origin/main` 00b94ad）

### 結論

eslint 9.39.5 → 10.x は **見送り**（依存は変更なし）。事前調査（`pnpm view <pkg> peerDependencies`）で eslint 10 を peer で許容しないプラグインが4件あったため、手順どおり更新には進んでいない。overrides / `--force` / `--legacy-peer-deps` による回避は行っていない。

### 事前調査

| 対象 | 確認結果 |
|---|---|
| eslint 10 の Node 要件 | eslint 10.14.0（latest）: engines `node: ^20.19.0 \|\| ^22.13.0 \|\| >=24`。実行環境 Node 22.23.4 は満たす |

### 更新できたもの

| パッケージ | 旧 → 新 | 備考 |
|---|---|---|
| なし | — | 阻害要因があるため更新に進んでいない |

### 見送り（eslint 10 を peer で許容しないもの）

| パッケージ | 現行 | 確認したバージョン | peer `eslint` の範囲 | 備考 |
|---|---|---|---|---|
| eslint-plugin-import | 2.32.0 | 2.32.0（latest。`next` は 2.0.0-beta.1 で旧版） | `^2 \|\| ^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7.2.0 \|\| ^8 \|\| ^9` | 最終更新 2025-06。前々節の試行でも eslint 10 で `import/no-default-export` の読み込みエラー |
| eslint-plugin-jsx-a11y | 6.10.2 | 6.10.2（latest） | `^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8 \|\| ^9` | 最終更新 2024-10 |
| eslint-plugin-react | 7.37.5 | 7.37.5（latest。`next` は 7.8.0-rc.0 で旧版） | `^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8 \|\| ^9.7` | 最終更新 2025-04 |
| eslint-plugin-react-hooks | 7.0.1 | 7.0.1（現行） | `^3.0.0 \|\| … \|\| ^8.0.0-0 \|\| ^9.0.0` | 7.1.1 は `^10.0.0` を許容するが、前節のとおり 7.1.1 は lint error 7 件が残り見送り中。eslint 10 には 7.1.1 への更新が前提になる |

### 参考: eslint 10 を許容するもの（latest で確認）

| パッケージ | 確認したバージョン | peer `eslint` の範囲 |
|---|---|---|
| @eslint/js | 10.0.1 | `^10.0.0`（eslint と同時に 9 → 10 が必要） |
| typescript-eslint（@typescript-eslint/parser・eslint-plugin・utils 同じ） | 8.72.1（現行） | `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| eslint-plugin-react-refresh | 0.5.7（現行） | `^9 \|\| ^10` |
| eslint-plugin-sonarjs | 4.2.2（現行） | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| @eslint-community/eslint-plugin-eslint-comments | 4.8.1（現行） | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| eslint-plugin-boundaries | 7.4.1（現行） | `>=6.0.0` |
| eslint-plugin-simple-import-sort | 14.0.0（現行） | `>=5.0.0` |
| eslint-config-prettier | 10.1.8（現行） | `>=7.0.0` |
| eslint-import-resolver-typescript | 4.4.5（現行） | `*`（ただし eslint-plugin-import に依存） |
| eslint-plugin-security | 4.2.1（現行） | peer 指定なし |
| eslint-plugin-tailwindcss | 3.18.3（現行） | eslint の peer 指定なし（4.x は `^9 \|\| ^10` だが peer `tailwindcss ^4` のため対象外） |
| globals | 17.14.0（現行） | peer 指定なし |

### ベースラインとの差

| 項目 | ベースライン（main 00b94ad） | 本ブランチ |
|---|---|---|
| eslint / @eslint/js | 9.39.5 / 9.39.5 | 9.39.5 / 9.39.5（変更なし） |
| `pnpm check` | exit 0 | exit 0 |
| テスト | 836 passed / 63 files | 836 passed / 63 files（変化なし） |
| lint | 0 errors / 10 warnings | 0 errors / 10 warnings（変化なし） |
| 変更ファイル | — | UPGRADE_NOTES.md のみ |

### 再挑戦の条件

eslint-plugin-import・eslint-plugin-jsx-a11y・eslint-plugin-react が eslint 10 対応版を出し、かつ eslint-plugin-react-hooks 7.1.x の見送り分（前節の 7 件）が解消できること。代替プラグイン（eslint-plugin-import-x 等）への置き換えはルールの意味が変わりうるため今回の範囲外。

## tailwindcss 4 追補（2026-11-05）

Branch: `deps/tailwind4-20261105`（base: `origin/main` 1fc3bc7）

### 結論

tailwindcss 3.4.19 → 4.3.4 に **更新した**。公式の移行ツールで大半を移行し、ツールが扱わない差分を手で直した。更新前後で主要 10 画面（ライト/ダーク）のスクリーンショットを比べ、見た目が変わらないことを確認した。

| パッケージ | 旧 → 新 |
|---|---|
| tailwindcss | 3.4.19 → 4.3.4 |
| @tailwindcss/postcss | 追加（4.3.4） |
| autoprefixer | 削除（v4 は vendor prefix を内蔵） |
| eslint-plugin-tailwindcss | 3.18.3 → 4.4.0（3.x は v4 の設定を読めず lint が停止した） |
| prettier-plugin-tailwindcss / @tailwindcss/typography | 0.8.1 / 0.5.20 のまま（v4 対応済み） |

### 移行ツール（`pnpm dlx @tailwindcss/upgrade@4.3.4`）が行った変更

- `tailwind.config.js` を削除し、色の定義を `src/renderer/index.css` の `@theme` へ移した。あわせて `@tailwind` 3 行を `@import 'tailwindcss'` に置き換え、typography を `@plugin` で読み込むようにした。
- border の既定色を v3 と同じ gray-200 に保つ互換スタイル（`@layer base`）を追加した。
- `postcss.config.cjs` を `@tailwindcss/postcss` に置き換えた。
- 69 ファイルでクラス名を改名・正規化した。

| 変更前 | 変更後 | 件数 |
|---|---|---|
| `rounded` | `rounded-sm` | 127 |
| `rounded-sm` | `rounded-xs` | 22 |
| `outline-none`（`focus:` 付き含む） | `outline-hidden` | 20 |
| `shadow-sm` | `shadow-xs` | 4 |
| `shadow` | `shadow-sm` | 1 |
| `break-words` | `wrap-break-word` | 2 |
| `z-[9999]` / `duration-[3000ms]` / `[var(--x)]` | 正規形 | 7 |

### 手で直したもの（いずれもスクリーンショットまたは生成 CSS で確認）

| 内容 | 箇所 | 理由 |
|---|---|---|
| `*` の margin/padding リセットを `@layer base` へ移動 | `src/renderer/index.css` | v4 はブラウザ標準のカスケードレイヤーを使うため、レイヤー外のリセットが全ユーティリティより優先された。全画面で padding/margin が消えたことをスクリーンショットで確認したうえで修正 |
| `rounded-br-sm` / `rounded-bl-sm` → `-xs` | `UserChatGroup.tsx`、`SystemChatGroup.tsx` | ツールが辺指定の版を改名しなかった（v4 の `-sm` は 0.25rem で、v3 の `-sm` は 0.125rem） |
| CSS 変数の色に付けた不透明度指定を削除（10 箇所） | `CommandPalette.tsx`（8）、`DashboardView.tsx`（2） | `bg-surface-raised/50`、`text-text-muted/60` など。v3 ではクラス自体が生成されていなかった（v3.4.19 の CLI で出力した CSS に存在しないことを確認）。v4 では有効になって見た目が変わるため削除した。意図した効果を出したい場合は、別途デザインとして再追加が必要 |
| Preflight 互換スタイルを追加 | `index.css` | placeholder の色（v3 は gray-400）と、button の `cursor: pointer`。公式ガイドの互換スニペットどおり |
| 行の高さを v3 の値で `@theme` に指定（`text-xs`〜`text-2xl`） | `index.css` | v4 は行の高さを比率（例 `calc(1 / 0.75)`）で定義しており、文字サイズの異なる子要素（`text-xs` 内の `text-[10px]` の kbd など）に比率のまま継承されて約 1px ずれた |
| eslint-plugin-tailwindcss 4 の設定 | `eslint.config.js` | 次の3点を変更<br>・`config`（js）を `cssConfigPath`（`index.css`）に置き換え<br>・`callees` を `functions` に置き換え<br>・`no-custom-classname` に、`index.css` で定義している自前クラス4つを whitelist として追加（v3 版はプラグインが CSS ファイルから読み取っていた） |
| 任意値を v4 の目盛り表記に変更（14 箇所） | 9 ファイル | 例: `min-h-[120px]` → `min-h-30`。`tailwindcss/no-unnecessary-arbitrary-value` の警告への対応。ルート文字サイズは 16px のまま変更していないので計算値は同じ |
| prettier の設定 | `.prettierrc.json` | v4 に必要な `tailwindStylesheet` を追加 |
| prettier の適用（52 ファイル） | — | v4 ではクラスの並び順の規則が変わり、main で整形済みだったファイルが不一致になったため。変更 75 箇所は、すべて同じ行内のクラスの並べ替えか改行位置の変更であることをスクリプトで確認した |
| ドキュメント | `CLAUDE.md`、`.claude/commands/devtools/design-system.md` | Tailwind 4.x と `@theme` の記述に更新 |

### 検証

- **画面比較の方法:** standalone ビルドを `CLAUDE_ROOT` を固定データにして起動し、Playwright（Chromium 153、1440×900、時刻固定）で次の 10 画面をライト/ダークで撮影して、更新前後を比べた。
  - ホーム、プロジェクト選択、セッション（下端・上端）、コマンドパレット、メニュー
  - 設定（General / Notifications / Advanced）、AI 応答の展開
- **画面比較の結果:**
  - 20 枚とも、チャンネル差 16 を超える画素は 0。サイドバーのブランチ名の行は、チェックアウト中のブランチで変わるため除外した。
  - しきい値 0 では 12 枚・計 8,293 画素に最大 9/255 の差がある。互換スタイルの gray-200 / gray-400 など、v4 の既定パレットが oklch で再定義されたことによる丸め差で、目視では判別できない。

| 項目 | ベースライン（main 1fc3bc7） | 本ブランチ |
|---|---|---|
| `pnpm check` | exit 0 | exit 0 |
| テスト | 955 passed / 72 files | 955 passed / 72 files（変化なし） |
| lint | 0 errors / 10 warnings | 0 errors / 10 warnings（変化なし） |
| `pnpm format:check`（check 対象外） | 29 files 不一致 | 29 files 不一致（同じ集合） |

### 未検証（要確認）

- Electron アプリとしての起動。今回の確認は standalone（ブラウザ）のみ。
- 撮影していない画面。コンテキストパネル、通知パネル、更新ダイアログ（`prose`）、サブエージェント・diff・コードの各ビューアなど。
- hover / focus などの状態と、カーソル形状。
- v4 の `hover:` は `@media (hover: hover)` の環境でだけ効く。タッチ専用の端末では hover の見た目が出なくなる。
