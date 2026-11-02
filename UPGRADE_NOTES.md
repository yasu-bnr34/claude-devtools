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
