import { Controller, Get, Query } from '@nestjs/common'
import { MarketNewsQueryDto } from '../dto/market-news-query.dto'
import { MarketNewsService } from '../services/market-news.service'

@Controller('api/market')
export class MarketNewsController {
  constructor(private readonly marketNewsService: MarketNewsService) {}

  @Get('news')
  getNews(@Query() query: MarketNewsQueryDto) {
    return this.marketNewsService.getNews(query)
  }
}
