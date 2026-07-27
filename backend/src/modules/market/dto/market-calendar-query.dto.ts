import { IsIn, IsOptional, IsString } from 'class-validator'
import type { MarketEventImportance } from '../types/market.types'

const MARKET_EVENT_IMPORTANCE = ['LOW', 'MEDIUM', 'HIGH'] as const

export class EconomicCalendarQueryDto {
  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsIn(MARKET_EVENT_IMPORTANCE)
  importance?: MarketEventImportance
}

export class MarketCalendarQueryDto extends EconomicCalendarQueryDto {
  @IsOptional()
  @IsString()
  types?: string
}
