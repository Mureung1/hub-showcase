import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator'

export class MarketDisclosureQueryDto {
  @IsOptional()
  @Matches(/^[0-9]{6}$/)
  symbol?: string

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string

  @IsOptional()
  @IsIn(['MAJOR'])
  type?: 'MAJOR'

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30
}

export class CompanyFinancialsQueryDto {
  @IsOptional()
  @Matches(/^[0-9]{4}$/)
  year?: string

  @IsOptional()
  @IsIn(['11013', '11012', '11014', '11011'])
  reportCode?: string
}
