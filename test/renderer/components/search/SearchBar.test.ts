/**
 * Behavior-pinning tests for SearchBar's store -> local query sync.
 * Expected values are observed from the current implementation.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

interface MockState {
  searchQuery: string;
  searchVisible: boolean;
  searchResultCount: number;
  currentSearchIndex: number;
  searchResultsCapped: boolean;
  conversation: null;
  tabSessionData: Record<string, never>;
  setSearchQuery: (q: string) => void;
  hideSearch: () => void;
  nextSearchResult: () => void;
  previousSearchResult: () => void;
}

const mockStore = create<MockState>()((set) => ({
  searchQuery: '',
  searchVisible: true,
  searchResultCount: 0,
  currentSearchIndex: 0,
  searchResultsCapped: false,
  conversation: null,
  tabSessionData: {},
  setSearchQuery: (q: string) => set({ searchQuery: q }),
  hideSearch: () => set({ searchVisible: false, searchQuery: '' }),
  nextSearchResult: () => undefined,
  previousSearchResult: () => undefined,
}));

vi.mock('@renderer/store', () => ({ useStore: mockStore }));

const { SearchBar } = await import('../../../../src/renderer/components/search/SearchBar');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SearchBar store -> local query sync', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let committedValues: string[];

  function input(): HTMLInputElement {
    return host.querySelector('input')!;
  }

  beforeEach(() => {
    mockStore.setState({ searchQuery: 'initial', searchVisible: true });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    committedValues = [];
    act(() => {
      root.render(
        React.createElement(
          React.Profiler,
          {
            id: 'sb',
            onRender: () => {
              committedValues.push(host.querySelector('input')?.value ?? '<none>');
            },
          },
          React.createElement(SearchBar)
        )
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = '';
  });

  it('initializes the input from the store query', () => {
    expect(input().value).toBe('initial');
    expect(committedValues).toEqual(['initial']);
  });

  it('follows an external store query change (stale value committed once, then synced)', () => {
    committedValues = [];
    act(() => {
      mockStore.setState({ searchQuery: 'external' });
    });
    expect(input().value).toBe('external');
    // Current behavior: one commit with the previous local value, then the synced commit
    expect(committedValues).toEqual(['initial', 'external']);
  });
});
