# 疑わしい挙動の判定メモ (test/suspect-20261104)

ベース: origin/main (00b94ad)。`src/`・package.json・lockfile・設定ファイルは未変更。追加は `test/suspect/` 配下の新規テスト 4 ファイル（23 件）と本ファイルのみ。

- ベースライン `pnpm check`: exit 0 / 63 files・836 tests / lint 0 errors
- 追加後 `pnpm check`: exit 0 / 67 files・859 tests / lint 0 errors

再現テストの期待値はすべて現行コードの観測値。「現在の挙動（要確認）」コメント付きのテストは、疑わしい挙動をそのまま固定している（修正時はテストも更新が必要）。

## 判定一覧

| # | 候補 | 該当ファイル・行 | 再現テスト | 判定 | 根拠 |
|---|---|---|---|---|---|
| 1 | contentSanitizer の空タグ | `src/shared/utils/contentSanitizer.ts:36-46, 94-99` | `test/suspect/contentSanitizerEmptyTag.test.ts` S1-a〜S1-i | 判定不能 | 空/空白のみの `<local-command-stdout>` は `''` を返さず生 XML のまま返る（S1-a,b,d）。空 stdout＋非空 stderr でも stderr は採用されない（S1-c）。docstring「Command output: Extracted from tags」とは食い違う。ただし完全一致の空 stdout/stderr は上流 `isParsedHardNoiseMessage`（`src/main/types/messages.ts:328`）で表示・検索前に除外され（S1-i）、コマンド出力は SystemChunk で `ChunkFactory` 側が抽出するため、UI に実害が出る経路は確認できず |
| 2 | hex 色 | `src/shared/constants/triggerColors.ts:42, 58, 91-94, 121-124`／入力側 `src/renderer/components/settings/NotificationTriggerSettings/components/ColorPaletteSelector.tsx:24` | `test/suspect/triggerColorsHex.test.ts` H-a〜H-f | **バグ** | 正規表現 `{3,8}` が CSS で無効な 5/7 桁を受理（H-a）。ハイライトは hex 末尾に alpha 2 桁を文字列連結するため、6 桁以外（3/4/8 桁）では `#f600D` 等の無効色になる（H-d,e）。happy-dom でも無効値は style から落ちる（H-f）。設定 UI は 3 桁等をそのまま受理・保存するので、カスタム色の通知ハイライトが表示されない |
| 3a | symlink：`~/.claude` 自体が symlink | `src/main/utils/pathValidation.ts:103-115, 177-196, 244-263` | `test/suspect/pathValidationSymlink.test.ts` SL-a, SL-b（対照 SL-d, SL-e） | **バグ** | 実在ファイルの realpath は symlink 先に解決されるが、許可ルート側は project のみ realpath 化（`:186-188`）され Claude ルート（`getClaudeBasePath()`）は未解決のまま比較される。結果、`~/.claude → dotfiles/claude` の環境では `~/.claude/CLAUDE.md` 等が「allowed directories 外」で拒否される（SL-a,b）。非 symlink（SL-d）・symlink の project（SL-e）は許可されており、扱いが非対称 |
| 3b | symlink：存在しないパス | 同上 `:177-179` | 同 SL-c | 仕様どおり | コメント「If target exists, validate real path containment」のとおり、存在しないパスは realpath 検証を省略 |
| 3c | symlink：ディレクトリ走査 | `src/main/services/infrastructure/LocalFileSystemProvider.ts:44-64` | 同 SL-f | 判定不能 | `isFile()/isDirectory()` は Dirent 由来で symlink を辿らず、symlink のファイル/ディレクトリはどちらも false（ProjectScanner/FileWatcher の対象外になる）。一方 mtime は symlink を辿る `stat` で取得しており一貫していない。ただし symlink を対象にすべきという仕様・記述は見当たらず、ループ回避の意図の可能性もある |
| 4 | 不明 1（報告との対応は不明。今回 TEST_NOTES.md の対象ファイルを走査して発見） | `src/shared/utils/teammateMessageParser.ts:20-21` | `test/suspect/teammateAttrGt.test.ts` T-a, T-b | 判定不能 | 属性部を `[^>]*` で切るため、`summary="A -> B"` のように属性値に `>` があると summary が空になり残りが content に混入（T-b）。Claude Code が属性値の `>` をエスケープするかは実データがなく不明 |
| 5 | 不明 2 | — | — | 特定できず | guards.ts / toolExtraction.ts / errorHandling.ts を走査したが、仕様との食い違いと言える挙動は見つからず |

## 再現手順（バグ判定分）

### #2 hex 色
```bash
pnpm vitest run test/suspect/triggerColorsHex.test.ts
```
アプリ上（コードからの推定・実機未確認）: 設定 → 通知トリガー → カスタム色に `f60` を入力して Enter → そのトリガーで通知されたチャットへ遷移しても、ハイライトの背景・リングが表示されない（`#ff6600` なら表示される）。

### #3a `~/.claude` が symlink
```bash
pnpm vitest run test/suspect/pathValidationSymlink.test.ts
```
アプリ上（コードからの推定・実機未確認）: `~/.claude` を別ディレクトリへの symlink にした環境で、`~/.claude/` 配下の実在ファイルを IPC（`src/main/ipc/utility.ts:107, 197`）経由で読む/開くと「Path is outside allowed directories」で拒否される。

## 未着手

なし（`src/main/utils/sessionStateDetection.ts` は詳細走査していない）。
