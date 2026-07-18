import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateMockCurriculum } from '../data/curriculumGenerator'
import type { GeneratedCurriculumSnapshot } from './useGeneratedCurriculumStore'

const storageKey = 'icu.generatedCurriculum'

function createLocalStorage(initialEntries: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialEntries))

  return {
    get length() {
      return storage.size
    },
    clear: vi.fn(() => storage.clear()),
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  } as Storage
}

async function importStore(localStorage: Storage) {
  vi.stubGlobal('window', { localStorage })
  const module = await import('./useGeneratedCurriculumStore')

  return module
}

describe('useGeneratedCurriculumStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('restores a generated curriculum snapshot from localStorage', async () => {
    const plan = generateMockCurriculum('백엔드 개발자가 되고 싶어')
    const snapshot: GeneratedCurriculumSnapshot = {
      goal: plan.goal,
      plan,
      generatedAt: '2026-07-18T09:00:00.000Z',
    }
    const localStorage = createLocalStorage({ [storageKey]: JSON.stringify(snapshot) })
    const { useGeneratedCurriculumStore } = await importStore(localStorage)

    expect(useGeneratedCurriculumStore.getState().generatedCurriculum).toEqual(snapshot)
  })

  it('persists the generated plan when saving a curriculum', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T10:30:00.000Z'))
    const localStorage = createLocalStorage()
    const { useGeneratedCurriculumStore } = await importStore(localStorage)
    const plan = generateMockCurriculum('FastAPI로 API 서버 만들고 싶어')

    useGeneratedCurriculumStore.getState().saveGeneratedCurriculum(plan.goal, plan)

    const snapshot = useGeneratedCurriculumStore.getState().generatedCurriculum
    expect(snapshot).toEqual({
      goal: plan.goal,
      plan,
      generatedAt: '2026-07-18T10:30:00.000Z',
    })
    expect(localStorage.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify(snapshot))
  })

  it('falls back to an empty snapshot when localStorage is invalid', async () => {
    const localStorage = createLocalStorage({ [storageKey]: '{invalid' })
    const { useGeneratedCurriculumStore } = await importStore(localStorage)

    expect(useGeneratedCurriculumStore.getState().generatedCurriculum).toBeNull()
  })

  it('resolves the saved generated plan before the fallback plan', async () => {
    const backendPlan = generateMockCurriculum('백엔드 개발자가 되고 싶어')
    const frontendPlan = generateMockCurriculum('React를 배우고 싶어')
    const snapshot: GeneratedCurriculumSnapshot = {
      goal: backendPlan.goal,
      plan: backendPlan,
      generatedAt: '2026-07-18T11:00:00.000Z',
    }
    const localStorage = createLocalStorage()
    const { resolveGeneratedCurriculumPlan } = await importStore(localStorage)

    expect(resolveGeneratedCurriculumPlan(snapshot, frontendPlan)).toBe(backendPlan)
    expect(resolveGeneratedCurriculumPlan(null, frontendPlan)).toBe(frontendPlan)
  })

  it('clears the generated curriculum snapshot', async () => {
    const plan = generateMockCurriculum('백엔드 개발자가 되고 싶어')
    const snapshot: GeneratedCurriculumSnapshot = {
      goal: plan.goal,
      plan,
      generatedAt: '2026-07-18T09:00:00.000Z',
    }
    const localStorage = createLocalStorage({ [storageKey]: JSON.stringify(snapshot) })
    const { useGeneratedCurriculumStore } = await importStore(localStorage)

    useGeneratedCurriculumStore.getState().resetGeneratedCurriculum()

    expect(localStorage.removeItem).toHaveBeenCalledWith(storageKey)
    expect(useGeneratedCurriculumStore.getState().generatedCurriculum).toBeNull()
  })
})
