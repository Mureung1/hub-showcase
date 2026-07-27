import { Controller, Get, Param, Query } from '@nestjs/common'
import {
  CompanyFinancialsQueryDto,
  MarketDisclosureQueryDto,
} from '../dto/market-disclosure-query.dto'
import { MarketDisclosureService } from '../services/market-disclosure.service'

@Controller('api/market')
export class MarketDisclosureController {
  constructor(private readonly marketDisclosureService: MarketDisclosureService) {}

  @Get('disclosures')
  getDisclosures(@Query() query: MarketDisclosureQueryDto) {
    return this.marketDisclosureService.getDisclosures(query)
  }

  @Get('companies/:symbol')
  getCompany(@Param('symbol') symbol: string) {
    return this.marketDisclosureService.getCompany(symbol)
  }

  @Get('companies/:symbol/financials')
  getCompanyFinancials(@Param('symbol') symbol: string, @Query() query: CompanyFinancialsQueryDto) {
    return this.marketDisclosureService.getFinancials(symbol, query)
  }
}
