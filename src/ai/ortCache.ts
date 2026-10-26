// No imports: vite.config.ts loads this file directly to name the service worker's runtime cache.

/** The service worker's cache for the ONNX Runtime files. */
export const ORT_CACHE = 'ort-runtime'

/** Named after the runtime version, so an upgrade never pairs old .wasm files with new code. */
export const ortCacheName = (version: string): string => `${ORT_CACHE}-${version}`
