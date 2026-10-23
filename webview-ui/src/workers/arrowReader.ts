import { CompressionType, compressionRegistry, tableFromIPC } from 'apache-arrow';
import { decompress as decompressLz4 } from 'lz4js';
import { decompress as decompressZstd } from 'fzstd';

// Feather V2 (including R's write_feather defaults) uses compressed Arrow IPC.
compressionRegistry.set(CompressionType.LZ4_FRAME, { decode: decompressLz4 });
compressionRegistry.set(CompressionType.ZSTD, {
  // fzstd may return an unaligned subarray; Arrow constructs typed views.
  decode: bytes => decompressZstd(bytes).slice(),
});

export function readArrowIPC(bytes: Uint8Array) {
  return tableFromIPC(bytes);
}
