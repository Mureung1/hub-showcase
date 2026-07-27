import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator'
import { MARKET_NEWS_CATEGORIES } from '../constants/market.constants'
import type { MarketNewsCategory } from '../types/market.types'

export class MarketNewsQueryDto {
  @IsOptional()
  @IsIn(MARKET_NEWS_CATEGORIES)
  category?: MarketNewsCategory

  @IsOptional()
  @IsString()
  query?: string

  @IsOptional()
  @Matches(/^[A-Za-z0-9.-]{1,20}$/)
  symbol?: string

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20
}
