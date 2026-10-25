// Checks on the browser's copy of the AI model, so the app never downloads 0.9 GB without being asked (review I3).
import { TIP_MODEL } from './tipModel'

/** The Cache Storage name Transformers.js keeps model files in. */
export const MODEL_CACHE = 'transformers-cache'

const FILES = ['config.json', 'generation_config.json', 'tokenizer.json', 'tokenizer_config.json', `onnx/model_${TIP_MODEL.dtype}.onnx`, `onnx/model_${TIP_MODEL.dtype}.onnx_data`]

/** The addresses Transformers.js caches the model files under (as found on the family laptop); loading needs all of them. */
export const modelFileUrls = (): string[] => FILES.map(f => `https://huggingface.co/${TIP_MODEL.id}/resolve/${TIP_MODEL.revision}/${f}`)

/** True when every model file is in the browser's cache, so loading the model needs no download. */
export async function hasModelFiles(storage: Pick<CacheStorage, 'has' | 'open'>): Promise<boolean> {
  if (!(await storage.has(MODEL_CACHE))) return false
  const urls = new Set((await (await storage.open(MODEL_CACHE)).keys()).map(r => r.url))
  return modelFileUrls().every(u => urls.has(u))
}

const ORT_CACHE = 'ort-runtime'

/** The service worker's cache for the ONNX Runtime files, named after its version so an upgrade never mixes old and new. */
export const ortCacheName = (version: string): string => `${ORT_CACHE}-${version}`

/** "Remove the AI model": deletes the model files and the AI runtime files, and leaves every other cache alone. */
export async function clearAiCaches(storage: Pick<CacheStorage, 'keys' | 'delete'>): Promise<void> {
  for (const name of await storage.keys()) if (name === MODEL_CACHE || name === ORT_CACHE || name.startsWith(`${ORT_CACHE}-`)) await storage.delete(name)
}

/** Why the download shouldn't start when the browser says there isn't room for it; null when there is, or it can't tell. */
export async function notEnoughSpace(storage: Pick<StorageManager, 'estimate'> | undefined, neededMB = TIP_MODEL.approxMB * 1.2): Promise<string | null> {
  const est = await storage?.estimate().catch(() => undefined)
  if (est?.quota === undefined || est.usage === undefined) return null
  if ((est.quota - est.usage) / 1e6 >= neededMB) return null
  return `There isn't enough free space on this laptop for the AI model: it needs about ${(Math.ceil(neededMB / 100) / 10).toFixed(1)} GB.`
}
