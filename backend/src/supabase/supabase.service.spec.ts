import { Test, TestingModule } from '@nestjs/testing'
import { SUPABASE_CLIENT } from './supabase.constants'
import { SupabaseService } from './supabase.service'

describe('SupabaseService', () => {
  let supabaseService: SupabaseService
  const fakeClient = { from: jest.fn() }

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [SupabaseService, { provide: SUPABASE_CLIENT, useValue: fakeClient }],
    }).compile()

    supabaseService = app.get<SupabaseService>(SupabaseService)
  })

  it('exposes the injected Supabase client', () => {
    expect(supabaseService.client).toBe(fakeClient)
  })
})
