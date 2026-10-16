export async function checkStorage(idb: IDBFactory | undefined = globalThis.indexedDB): Promise<'ok' | 'unavailable'> {
  if (!idb) return 'unavailable'
  try {
    return await new Promise(resolve => {
      const req = idb.open('spelling-pets-check')
      req.onsuccess = () => { req.result?.close?.(); resolve('ok') }
      req.onerror = () => resolve('unavailable')
    })
  } catch {
    return 'unavailable'
  }
}

export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
