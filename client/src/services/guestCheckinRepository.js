const DEFAULT_DB_NAME = 'haru-checkout'
const DB_VERSION = 1
const STORE_NAME = 'checkins'

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('브라우저 저장소 요청에 실패했습니다.'))
  })
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('브라우저 저장소 처리에 실패했습니다.'))
    transaction.onabort = () => reject(transaction.error || new Error('브라우저 저장소 처리가 중단되었습니다.'))
  })
}

function defaultCreateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createGuestCheckinRepository({
  indexedDBFactory = globalThis.indexedDB,
  dbName = DEFAULT_DB_NAME,
  now = () => new Date(),
  createId = defaultCreateId,
} = {}) {
  let databasePromise

  function getDatabase() {
    if (!indexedDBFactory) {
      return Promise.reject(new Error('이 브라우저에서는 기기 저장을 사용할 수 없습니다.'))
    }

    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDBFactory.open(dbName, DB_VERSION)

        request.onupgradeneeded = () => {
          const database = request.result
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' })
          }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error || new Error('기기 저장소를 열지 못했습니다.'))
        request.onblocked = () => reject(new Error('다른 탭에서 저장소를 사용 중입니다. 다른 탭을 닫고 다시 시도해 주세요.'))
      })
    }

    return databasePromise
  }

  async function getCheckins() {
    const database = await getDatabase()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const records = await requestToPromise(transaction.objectStore(STORE_NAME).getAll())

    return records.sort((left, right) => (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ))
  }

  async function createCheckin(entry) {
    const database = await getDatabase()
    const checkin = {
      id: createId(),
      rawText: entry.rawText,
      mood: entry.mood || null,
      imageUrl: entry.imageUrl || null,
      emotion: entry.emotion,
      cause: entry.cause,
      action: entry.action,
      createdAt: now().toISOString(),
      storageMode: 'guest',
    }
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const completed = transactionToPromise(transaction)
    transaction.objectStore(STORE_NAME).put(checkin)
    await completed

    return checkin
  }

  async function deleteCheckin(id) {
    const database = await getDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const completed = transactionToPromise(transaction)
    transaction.objectStore(STORE_NAME).delete(id)
    await completed
  }

  async function clearCheckins() {
    const database = await getDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const completed = transactionToPromise(transaction)
    transaction.objectStore(STORE_NAME).clear()
    await completed
  }

  return {
    getCheckins,
    createCheckin,
    deleteCheckin,
    clearCheckins,
  }
}

export function fileToDataUrl(file) {
  if (!file) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('사진을 기기 저장용으로 변환하지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}
