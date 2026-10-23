import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gridStore } from '../stores/grid.svelte.js';
import { setupMessageHandler } from './messageHandler.js';

vi.mock('../stores/grid.svelte.js', () => ({
  gridStore: { loadRawBinary: vi.fn(), loadRawBinaryParts: vi.fn() },
}));
vi.mock('../stores/ui.svelte.js', () => ({ uiStore: {} }));
vi.mock('./vscode.js', () => ({ postMessage: vi.fn() }));

describe('binary webview messages', () => {
  let receive: (event: { data: unknown }) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      addEventListener: (_type: string, handler: typeof receive) => { receive = handler; },
    });
    setupMessageHandler();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('forwards an ArrayBuffer without base64 encoding or copying', () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    receive({ data: {
      type: '__RAW_BINARY__',
      payload: { buffers: [buffer], fileType: 'arrow', duckBundles: {} },
    } });

    expect(gridStore.loadRawBinary).toHaveBeenCalledWith(buffer, 'arrow', {}, undefined);
    expect(vi.mocked(gridStore.loadRawBinary).mock.calls[0][0]).toBe(buffer);
    expect(gridStore.loadRawBinaryParts).not.toHaveBeenCalled();
  });

  it('keeps partitioned files as separate buffers', () => {
    const buffers = [new ArrayBuffer(1), new ArrayBuffer(2)];
    receive({ data: {
      type: '__RAW_BINARY__',
      payload: { buffers, fileType: 'parquet', duckBundles: {} },
    } });

    expect(gridStore.loadRawBinaryParts).toHaveBeenCalledWith(buffers, 'parquet', {});
    expect(gridStore.loadRawBinary).not.toHaveBeenCalled();
  });

  it.each(['json', 'excel'] as const)('joins base64 chunks for %s', fileType => {
    receive({ data: {
      type: '__RAW_BINARY__',
      payload: { base64Parts: ['AQI=', 'AwQ='], fileType, duckBundles: {} },
    } });

    const [buffer, type] = vi.mocked(gridStore.loadRawBinary).mock.calls[0];
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(type).toBe(fileType);
    expect(gridStore.loadRawBinaryParts).not.toHaveBeenCalled();
  });

  it('still accepts base64 messages used by other formats', () => {
    receive({ data: {
      type: '__RAW_BINARY__',
      payload: { base64: 'AQID', fileType: 'excel', duckBundles: {} },
    } });

    const [buffer, type] = vi.mocked(gridStore.loadRawBinary).mock.calls[0];
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3]));
    expect(type).toBe('excel');
  });
});
