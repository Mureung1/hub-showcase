import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class StockCandlesQueryDto {
  @IsOptional()
  @IsIn(['1d', '1m'])
  interval = '1d'

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  count = 120

  @IsOptional()
  @IsString()
  before?: string
}

export class StockTradesQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  count = 50
}

export class StockAnalysisQueryDto {
  @IsOptional()
  @IsIn(['3m', '6m', '1y'])
  period = '6m'
}

export class TradingCalendarQueryDto {
  @IsOptional()
  @IsString()
  date?: string
}
