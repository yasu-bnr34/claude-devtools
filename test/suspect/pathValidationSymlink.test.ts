/**
 * 疑わしい挙動 #3: symlink の扱い（再現テスト）
 *
 * 対象: src/main/utils/pathValidation.ts, src/main/services/infrastructure/LocalFileSystemProvider.ts
 * 期待値は現行コードの観測値。判定は SUSPECT_NOTES.md を参照。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalFileSystemProvider } from '../../src/main/services/infrastructure/LocalFileSystemProvider';
import { setClaudeBasePathOverride } from '../../src/main/utils/pathDecoder';
import { validateFilePath, validateOpenPath } from '../../src/main/utils/pathValidation';

const isWin = process.platform === 'win32';

describe('suspect#3 symlink handling', () => {
  let tempRoot: string;
  let realClaude: string;
  let linkClaude: string;
  let project: string;

  beforeEach(() => {
    tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'suspect-symlink-')));
    realClaude = path.join(tempRoot, 'dotfiles', 'claude');
    linkClaude = path.join(tempRoot, 'home', '.claude');
    project = path.join(tempRoot, 'project');
    fs.mkdirSync(path.join(realClaude, 'projects'), { recursive: true });
    fs.mkdirSync(path.dirname(linkClaude), { recursive: true });
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(path.join(realClaude, 'CLAUDE.md'), '# global', 'utf8');
    if (!isWin) fs.symlinkSync(realClaude, linkClaude, 'dir');
  });

  afterEach(() => {
    setClaudeBasePathOverride(null);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  // 修正済み: ~/.claude 自体が symlink でも、その配下の実在ファイルは許可される
  it('SL-a: existing file under symlinked Claude root is accepted by validateFilePath', () => {
    if (isWin) return;
    setClaudeBasePathOverride(linkClaude);
    const p = path.join(linkClaude, 'CLAUDE.md');
    expect(validateFilePath(p, null)).toEqual({ valid: true, normalizedPath: p });
  });

  it('SL-b: same for validateOpenPath', () => {
    if (isWin) return;
    setClaudeBasePathOverride(linkClaude);
    const p = path.join(linkClaude, 'CLAUDE.md');
    expect(validateOpenPath(p, null)).toEqual({ valid: true, normalizedPath: p });
  });

  it('SL-g: symlink inside symlinked Claude root that escapes it is still rejected', () => {
    if (isWin) return;
    const outside = path.join(tempRoot, 'outside');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'x.txt'), 'x', 'utf8');
    fs.symlinkSync(path.join(outside, 'x.txt'), path.join(realClaude, 'escape.txt'));
    setClaudeBasePathOverride(linkClaude);
    expect(validateFilePath(path.join(linkClaude, 'escape.txt'), null)).toEqual({
      valid: false,
      error: 'Path is outside allowed directories (project or Claude root)',
    });
    expect(validateOpenPath(path.join(linkClaude, 'escape.txt'), null).valid).toBe(false);
  });

  it('SL-c: non-existent file under symlinked Claude root is accepted (realpath skipped)', () => {
    if (isWin) return;
    setClaudeBasePathOverride(linkClaude);
    const p = path.join(linkClaude, 'missing.md');
    expect(validateFilePath(p, null)).toEqual({ valid: true, normalizedPath: p });
  });

  it('SL-d: control — non-symlinked Claude root accepts the same file', () => {
    setClaudeBasePathOverride(realClaude);
    const p = path.join(realClaude, 'CLAUDE.md');
    expect(validateFilePath(p, null)).toEqual({ valid: true, normalizedPath: p });
  });

  it('SL-e: control — symlinked project root accepts files inside it (project is realpath-ed)', () => {
    if (isWin) return;
    const realProj = path.join(tempRoot, 'real-proj');
    const linkProj = path.join(tempRoot, 'link-proj');
    fs.mkdirSync(realProj);
    fs.writeFileSync(path.join(realProj, 'a.ts'), 'x', 'utf8');
    fs.symlinkSync(realProj, linkProj, 'dir');
    setClaudeBasePathOverride(realClaude);
    const p = path.join(linkProj, 'a.ts');
    expect(validateFilePath(p, linkProj)).toEqual({ valid: true, normalizedPath: p });
  });

  // 現在の挙動（要確認）: readdir の isFile/isDirectory は symlink を辿らない（Dirent 由来）
  it('SL-f: LocalFileSystemProvider.readdir reports symlinked file/dir as neither file nor dir', async () => {
    if (isWin) return;
    const dir = path.join(tempRoot, 'scan');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(tempRoot, 'real.jsonl'), '{}\n', 'utf8');
    fs.symlinkSync(path.join(tempRoot, 'real.jsonl'), path.join(dir, 'link.jsonl'));
    fs.symlinkSync(realClaude, path.join(dir, 'linkdir'), 'dir');
    fs.writeFileSync(path.join(dir, 'plain.jsonl'), '{}\n', 'utf8');

    const entries = await new LocalFileSystemProvider().readdir(dir);
    const byName = Object.fromEntries(
      entries.map((e) => [
        e.name,
        { f: e.isFile(), d: e.isDirectory(), m: e.mtimeMs !== undefined },
      ])
    );
    expect(byName).toEqual({
      'link.jsonl': { f: false, d: false, m: true },
      linkdir: { f: false, d: false, m: true },
      'plain.jsonl': { f: true, d: false, m: true },
    });
  });
});
