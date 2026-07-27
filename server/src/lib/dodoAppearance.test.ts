import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db.js', () => ({
  prisma: {
    dodoAppearance: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

const { prisma } = await import('../db.js')
const { toAppearanceResponse, updateDodoBaseAppearance } = await import('./dodoAppearance.js')

describe('updateDodoBaseAppearance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('처음 저장하는 유저는 onboardedAt을 새로 기록한다', async () => {
    vi.mocked(prisma.dodoAppearance.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.dodoAppearance.upsert).mockResolvedValue({ bodyColor: '#98bce7', eyeCount: 1 } as never)

    await updateDodoBaseAppearance('user-1', { bodyColor: '#98bce7', eyeCount: 1 })

    const call = vi.mocked(prisma.dodoAppearance.upsert).mock.calls[0][0] as { create: { onboardedAt: Date }; update: { onboardedAt: Date } }
    expect(call.create.onboardedAt).toBeInstanceOf(Date)
    expect(call.update.onboardedAt).toBeInstanceOf(Date)
  })

  it('이미 온보딩을 끝낸 유저가 다시 제출해도 최초 onboardedAt을 그대로 유지한다(멱등)', async () => {
    const firstOnboardedAt = new Date('2026-01-01T00:00:00.000Z')
    vi.mocked(prisma.dodoAppearance.findUnique).mockResolvedValue({ onboardedAt: firstOnboardedAt } as never)
    vi.mocked(prisma.dodoAppearance.upsert).mockResolvedValue({ bodyColor: '#98bce7', eyeCount: 1 } as never)

    await updateDodoBaseAppearance('user-1', { bodyColor: '#98bce7', eyeCount: 1 })

    const call = vi.mocked(prisma.dodoAppearance.upsert).mock.calls[0][0] as { update: { onboardedAt: Date } }
    expect(call.update.onboardedAt).toBe(firstOnboardedAt)
  })
})

describe('toAppearanceResponse', () => {
  it('bodyColor·eyeCount는 포함하지만 onboarded/onboardedAt은 포함하지 않는다 (친구 방문에도 재사용되는 공용 응답이라 자기 전용 정보는 새면 안 됨)', () => {
    const appearance = {
      bodyColor: '#f2a58d',
      eyeCount: 2,
      onboardedAt: new Date(),
      hatItem: null, hatColor: null,
      glassesItem: null, glassesColor: null,
      outfitItem: null, outfitColor: null,
      accessoryItem: null, accessoryColor: null,
    } as never

    const response = toAppearanceResponse(appearance)

    expect(response).toEqual({ bodyColor: '#f2a58d', eyeCount: 2, hat: null, glasses: null, outfit: null, accessory: null })
    expect(response).not.toHaveProperty('onboarded')
    expect(response).not.toHaveProperty('onboardedAt')
  })
})
