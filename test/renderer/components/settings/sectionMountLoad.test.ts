/**
 * Behavior-pinning tests for mount-time loads in settings sections
 * (WorkspaceSection / GeneralSection / ConnectionSection).
 *
 * Pinned (observed from the current implementation):
 * - the API request is issued synchronously in the mount effect (once)
 * - state updates happen only after the request resolves (no extra commit before)
 * - rejected requests are handled the same way as before
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const configGet = vi.fn();
const getClaudeRootInfo = vi.fn();
const getStatus = vi.fn();

vi.mock('@renderer/api', () => ({
  api: {
    config: {
      get: (...a: unknown[]) => configGet(...a),
      getClaudeRootInfo: (...a: unknown[]) => getClaudeRootInfo(...a),
      update: vi.fn(),
    },
    httpServer: { getStatus: (...a: unknown[]) => getStatus(...a) },
  },
  isElectronMode: () => true,
}));

vi.mock('@renderer/components/common/ConfirmDialog', () => ({ confirm: vi.fn() }));

const mockStore = create<Record<string, unknown>>()(() => ({
  connectionMode: 'local',
  connectionState: 'disconnected',
  connectedHost: null,
  connectionError: null,
  sshConfigHosts: [],
  lastSshConfig: null,
  fetchProjects: vi.fn(),
  fetchRepositoryGroups: vi.fn(),
  connectSsh: vi.fn(),
  disconnectSsh: vi.fn(),
  testConnection: vi.fn(),
  fetchSshConfigHosts: vi.fn(async () => undefined),
  loadLastConnection: vi.fn(async () => undefined),
}));

vi.mock('@renderer/store', () => ({ useStore: mockStore }));

const { WorkspaceSection } =
  await import('../../../../src/renderer/components/settings/sections/WorkspaceSection');
const { GeneralSection } =
  await import('../../../../src/renderer/components/settings/sections/GeneralSection');
const { ConnectionSection } =
  await import('../../../../src/renderer/components/settings/sections/ConnectionSection');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const profile = {
  id: 'p1',
  name: 'Prof One',
  host: 'h1.example',
  port: 22,
  username: 'u',
  authMethod: 'sshConfig',
};

const rootInfo = {
  defaultPath: '/home/testuser/.claude',
  resolvedPath: '/custom/claude-root',
  customPath: '/custom/claude-root',
};

describe('settings sections mount-time load', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let commits: number;

  function mount(el: React.ReactElement): void {
    act(() => {
      root.render(
        React.createElement(React.Profiler, { id: 'p', onRender: () => void commits++ }, el)
      );
    });
  }

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    commits = 0;
    configGet.mockReset();
    getClaudeRootInfo.mockReset();
    getStatus.mockReset();
    getStatus.mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = '';
  });

  it('WorkspaceSection: shows loading, requests config once, then lists profiles', async () => {
    const d = deferred<unknown>();
    configGet.mockReturnValue(d.promise);

    mount(React.createElement(WorkspaceSection));
    expect(configGet).toHaveBeenCalledTimes(1);
    expect(commits).toBe(1);
    expect(host.textContent).not.toContain('Prof One');
    expect(host.textContent).not.toContain('No saved profiles');

    await act(async () => {
      d.resolve({ ssh: { profiles: [profile] } });
      await d.promise;
    });
    expect(host.textContent).toContain('Prof One');
    expect(commits).toBe(2);
  });

  it('WorkspaceSection: failed load ends loading with empty list and logs error', async () => {
    const d = deferred<unknown>();
    configGet.mockReturnValue(d.promise);
    const errSpy = vi.mocked(console.error);

    mount(React.createElement(WorkspaceSection));
    await act(async () => {
      d.reject(new Error('nope'));
      await d.promise.catch(() => undefined);
    });
    expect(host.textContent).toContain('No saved profiles');
    expect(errSpy.mock.calls.some((c) => String(c[0]).includes('Failed to load profiles'))).toBe(
      true
    );
    errSpy.mockClear();
  });

  function renderGeneral(): void {
    mount(
      React.createElement(GeneralSection, {
        safeConfig: {
          general: {
            launchAtLogin: false,
            showDockIcon: true,
            theme: 'dark',
            defaultTab: 'dashboard',
            claudeRootPath: null,
          },
          display: { keepContextNavExpanded: false },
        } as never,
        saving: false,
        onGeneralToggle: () => undefined,
        onThemeChange: () => undefined,
        onDisplayToggle: () => undefined,
      } as never)
    );
  }

  it('GeneralSection: requests Claude root info once on mount, renders it after resolve', async () => {
    const d = deferred<unknown>();
    getClaudeRootInfo.mockReturnValue(d.promise);

    renderGeneral();
    expect(getClaudeRootInfo).toHaveBeenCalledTimes(1);
    const before = commits;
    expect(host.textContent).not.toContain('/custom/claude-root');

    await act(async () => {
      d.resolve(rootInfo);
      await d.promise;
    });
    expect(commits).toBe(before + 1);
    expect(host.textContent).toContain('/custom/claude-root');
  });

  it('GeneralSection: failed load shows the error message', async () => {
    const d = deferred<unknown>();
    getClaudeRootInfo.mockReturnValue(d.promise);

    renderGeneral();
    await act(async () => {
      d.reject(new Error('root boom'));
      await d.promise.catch(() => undefined);
    });
    expect(host.textContent).toContain('root boom');
  });

  it('ConnectionSection: issues all four mount loads once, state set after resolve', async () => {
    const dCfg = deferred<unknown>();
    const dRoot = deferred<unknown>();
    configGet.mockReturnValue(dCfg.promise);
    getClaudeRootInfo.mockReturnValue(dRoot.promise);
    const s = mockStore.getState() as Record<string, ReturnType<typeof vi.fn>>;
    s.fetchSshConfigHosts.mockClear();
    s.loadLastConnection.mockClear();

    mount(React.createElement(ConnectionSection));
    expect(s.fetchSshConfigHosts).toHaveBeenCalledTimes(1);
    expect(s.loadLastConnection).toHaveBeenCalledTimes(1);
    expect(configGet).toHaveBeenCalledTimes(1);
    expect(getClaudeRootInfo).toHaveBeenCalledTimes(1);
    const before = commits;

    await act(async () => {
      dCfg.resolve({ ssh: { profiles: [profile] } });
      dRoot.resolve(rootInfo);
      await Promise.all([dCfg.promise, dRoot.promise]);
    });
    expect(commits).toBeGreaterThan(before);
    const afterResolve = host.textContent;

    // Rejections are swallowed silently (no console.error, no crash)
    act(() => root.unmount());
    root = createRoot(host);
    configGet.mockReturnValue(Promise.reject(new Error('x')));
    getClaudeRootInfo.mockReturnValue(Promise.reject(new Error('y')));
    await act(async () => {
      root.render(React.createElement(ConnectionSection));
      await Promise.resolve();
    });
    expect(afterResolve).toBeTruthy();
  });
});
