import { Controller, Get, Query } from '@nestjs/common'
import { EconomicCalendarQueryDto, MarketCalendarQueryDto } from '../dto/market-calendar-query.dto'
import { MarketCalendarService } from '../services/market-calendar.service'

@Controller('api/market/calendar')
export class MarketCalendarController {
  constructor(private readonly marketCalendarService: MarketCalendarService) {}

  @Get()
  getMarketCalendar(@Query() query: MarketCalendarQueryDto) {
    return this.marketCalendarService.getMarketCalendar(query)
  }

  @Get('economic')
  getEconomicCalendar(@Query() query: EconomicCalendarQueryDto) {
    return this.marketCalendarService.getEconomicCalendar(query)
  }
}
