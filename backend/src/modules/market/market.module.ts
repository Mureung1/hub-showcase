import { Module } from '@nestjs/common'
import { MarketCalendarController } from './controllers/market-calendar.controller'
import { MarketDataController } from './controllers/market-data.controller'
import { MarketDisclosureController } from './controllers/market-disclosure.controller'
import { MarketNewsController } from './controllers/market-news.controller'
import { FmpProvider } from './providers/fmp.provider'
import { FredProvider } from './providers/fred.provider'
import { NaverNewsProvider } from './providers/naver-news.provider'
import { OpenDartProvider } from './providers/open-dart.provider'
import { TossSecuritiesProvider } from './providers/toss-securities.provider'
import { MacroDataService } from './services/macro-data.service'
import { MarketCacheService } from './services/market-cache.service'
import { MarketCalendarService } from './services/market-calendar.service'
import { MarketDisclosureService } from './services/market-disclosure.service'
import { MarketHttpService } from './services/market-http.service'
import { MarketNewsService } from './services/market-news.service'
import { StockMarketService } from './services/stock-market.service'

@Module({
  controllers: [
    MarketNewsController,
    MarketCalendarController,
    MarketDisclosureController,
    MarketDataController,
  ],
  providers: [
    MarketHttpService,
    MarketCacheService,
    NaverNewsProvider,
    FmpProvider,
    OpenDartProvider,
    FredProvider,
    TossSecuritiesProvider,
    MarketNewsService,
    MarketCalendarService,
    MarketDisclosureService,
    MacroDataService,
    StockMarketService,
  ],
})
export class MarketModule {}
