import { IsOptional, IsString } from 'class-validator'

export class MacroSeriesQueryDto {
  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}

export class MacroIndicatorsQueryDto extends MacroSeriesQueryDto {
  @IsOptional()
  @IsString()
  names?: string
}
