/**
 * Behavior-pinning tests for useSettingsHandlers' configRef.
 * Handlers must read the latest committed `config` prop via the ref.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../../../src/renderer/types/data';

const updateTrigger = vi.fn();

vi.mock('@renderer/api', () => ({
  api: { config: { updateTrigger: (...args: unknown[]) => updateTrigger(...args) } },
}));

vi.mock('@renderer/store', () => ({
  useStore: { setState: vi.fn() },
}));

const { useSettingsHandlers } =
  await import('../../../../src/renderer/components/settings/hooks/useSettingsHandlers');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Handlers = ReturnType<typeof useSettingsHandlers>;

function makeConfig(tag: string): AppConfig {
  return {
    tag,
    notifications: { triggers: [{ id: 't1', name: 'x' }] },
  } as unknown as AppConfig;
}

describe('useSettingsHandlers configRef', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let handlers: Handlers | null;
  const setOptimisticConfig = vi.fn();
  const setError = vi.fn();

  function Harness({ config }: { config: AppConfig | null }): React.JSX.Element {
    handlers = useSettingsHandlers({
      config,
      setSaving: () => undefined,
      setError,
      setConfig: () => undefined,
      setOptimisticConfig,
      updateConfig: async () => undefined,
    });
    return React.createElement('div');
  }

  function renderWith(config: AppConfig | null): void {
    act(() => {
      root.render(React.createElement(Harness, { config }));
    });
  }

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    handlers = null;
    setOptimisticConfig.mockReset();
    setError.mockReset();
    updateTrigger.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('export serializes the latest config after a rerender, with a stable callback', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const blobSpy = vi.spyOn(globalThis, 'Blob');

    renderWith(makeConfig('A'));
    const firstExport = handlers!.handleExportConfig;
    renderWith(makeConfig('B'));
    expect(handlers!.handleExportConfig).toBe(firstExport);

    handlers!.handleExportConfig();
    expect(blobSpy).toHaveBeenCalledTimes(1);
    const parts = blobSpy.mock.calls[0][0] as string[];
    expect(JSON.parse(parts[0]).tag).toBe('B');
  });

  it('export does nothing when config is null', () => {
    const blobSpy = vi.spyOn(globalThis, 'Blob');
    renderWith(null);
    handlers!.handleExportConfig();
    expect(blobSpy).not.toHaveBeenCalled();
  });

  it('updateTrigger failure reverts to the latest config prop', async () => {
    updateTrigger.mockRejectedValue(new Error('boom'));
    renderWith(makeConfig('A'));
    renderWith(makeConfig('B'));

    await act(async () => {
      await handlers!.handleUpdateTrigger('t1', { name: 'y' });
    });

    const last = setOptimisticConfig.mock.calls[setOptimisticConfig.mock.calls.length - 1][0];
    expect((last as { tag: string }).tag).toBe('B');
    expect(setError).toHaveBeenCalledWith('boom');
  });
});
