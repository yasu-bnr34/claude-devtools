# テスト追加メモ (test/coverage-20261101)

ベース: origin/main (1486f20)。`src/`・package.json・lockfile・vitest/tsconfig/eslint 設定は未変更。

## 追加テストとカバレッジ(Lines %、前 → 後)

| 対象ファイル | テストファイル | 追加件数 | Lines 前 → 後 | Branches 前 → 後 |
|---|---|---:|---|---|
| src/shared/utils/errorHandling.ts | test/shared/utils/errorHandling.test.ts | 9 | 0 → 100 | 100 → 100 |
| src/shared/utils/teammateMessageParser.ts | test/shared/utils/teammateMessageParser.test.ts | 9 | 47.82 → 100 | 50 → 100 |
| src/main/utils/toolExtraction.ts | test/main/utils/toolExtraction.test.ts | 13 | 50 → 100 | 73.68 → 100 |
| src/shared/utils/contentSanitizer.ts | test/shared/utils/contentSanitizer.test.ts | 25 | 34.88 → 95.34 | 66.66 → 94.28 |
| src/main/utils/sessionStateDetection.ts | test/main/utils/sessionStateDetection.test.ts | 17 | 1.19 → 98.8 | 100 → 96.15 |
| src/main/ipc/guards.ts | test/main/ipc/guardsIds.test.ts | 31 | 59.61 → 98.07 | 73.91 → 97.95 |
| **合計** | 6 ファイル | **104** | | |

`pnpm test`: 60 files / 826 tests 全通過 (exit 0)。追加前は 54 files / 722 tests(722 + 104 = 826)。
停止理由: 追加テスト 100 件の上限に到達(ファイル数は 6 / 15)。

## 疑わしい挙動

なし(仕様と食い違う実装は見つからなかった)。

## 外したテスト

なし。

## 未着手の候補(低カバレッジ)

- src/main/utils/metadataExtraction.ts (25%)、src/shared/utils/logger.ts (55%)
- src/shared/constants/{trafficLights,triggerColors}.ts (0%)
- src/main/ipc/validation.ts (0%: electron / fs のモックが必要なため後回し)
