import { Controller, Get, Param, Query } from '@nestjs/common'
import { MacroIndicatorsQueryDto, MacroSeriesQueryDto } from '../dto/macro-query.dto'
import {
  StockAnalysisQueryDto,
  StockCandlesQueryDto,
  StockTradesQueryDto,
  TradingCalendarQueryDto,
} from '../dto/stock-query.dto'
import { MacroDataService } from '../services/macro-data.service'
import { StockMarketService } from '../services/stock-market.service'

@Controller('api/market')
export class MarketDataController {
  constructor(
    private readonly macroDataService: MacroDataService,
    private readonly stockMarketService: StockMarketService,
  ) {}

  @Get('macro/series/:seriesId')
  getMacroSeries(@Param('seriesId') seriesId: string, @Query() query: MacroSeriesQueryDto) {
    return this.macroDataService.getSeries(seriesId, query)
  }

  @Get('macro/indicators')
  getMacroIndicators(@Query() query: MacroIndicatorsQueryDto) {
    return this.macroDataService.getIndicators(query)
  }

  @Get('stocks/:symbol')
  getStockInfo(@Param('symbol') symbol: string) {
    return this.stockMarketService.getStockInfo(symbol)
  }

  @Get('stocks/:symbol/quote')
  getStockQuote(@Param('symbol') symbol: string) {
    return this.stockMarketService.getQuote(symbol)
  }

  @Get('stocks/:symbol/orderbook')
  getOrderbook(@Param('symbol') symbol: string) {
    return this.stockMarketService.getOrderbook(symbol)
  }

  @Get('stocks/:symbol/trades')
  getTrades(@Param('symbol') symbol: string, @Query() query: StockTradesQueryDto) {
    return this.stockMarketService.getTrades(symbol, query)
  }

  @Get('stocks/:symbol/candles')
  getCandles(@Param('symbol') symbol: string, @Query() query: StockCandlesQueryDto) {
    return this.stockMarketService.getCandles(symbol, query)
  }

  @Get('stocks/:symbol/analysis')
  getAnalysis(@Param('symbol') symbol: string, @Query() query: StockAnalysisQueryDto) {
    return this.stockMarketService.getAnalysis(symbol, query)
  }

  @Get('exchange-rate')
  getExchangeRate() {
    return this.stockMarketService.getExchangeRate()
  }

  @Get('trading-calendar')
  getTradingCalendar(@Query() query: TradingCalendarQueryDto) {
    return this.stockMarketService.getTradingCalendar(query)
  }

  @Get('indices')
  getIndices() {
    return this.stockMarketService.getIndices()
  }
}
