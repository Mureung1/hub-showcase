import styled from '@emotion/styled'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react'

import { fetchMarketSignals, type MarketSignal } from '../api/market'
import { useWatchlistStore } from '../stores/useWatchlistStore'

const PageHeader = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 24px;
`

const Title = styled.h1`
  margin: 0;
  color: #111827;
  font-size: clamp(2rem, 4vw, 3.25rem);
  line-height: 1.1;
`

const Description = styled.p`
  max-width: 720px;
  margin: 0;
  color: #596273;
  font-size: 1rem;
  line-height: 1.7;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 28px 0 16px;
  gap: 12px;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`

const SectionTitle = styled.h2`
  margin: 0;
  color: #252b36;
  font-size: 1rem;
`

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #cfd6df;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  cursor: pointer;
  font: inherit;
  font-weight: 700;

  &:hover {
    border-color: #9aa6b2;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`

const SignalCard = styled.article`
  display: grid;
  gap: 16px;
  min-height: 260px;
  padding: 20px;
  border: 1px solid #dde1e7;
  border-radius: 8px;
  background: #ffffff;
`

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const Symbol = styled.p`
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 800;
`

const Name = styled.p`
  margin: 4px 0 0;
  color: #596273;
  font-size: 0.9rem;
`

const TrendBadge = styled.span<{ trend: MarketSignal['trend'] }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: ${({ trend }) =>
    trend === 'up' ? '#e8f7ef' : trend === 'down' ? '#fff0f0' : '#edf3ff'};
  color: ${({ trend }) => (trend === 'up' ? '#147a45' : trend === 'down' ? '#bf3030' : '#315caa')};
`

const Confidence = styled.div`
  display: grid;
  gap: 8px;
`

const ConfidenceLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4b5563;
  font-size: 0.9rem;
  font-weight: 700;
`

const ProgressTrack = styled.div`
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e9ef;
`

const ProgressValue = styled.div<{ value: number }>`
  width: ${({ value }) => value}%;
  height: 100%;
  border-radius: inherit;
  background: #1f6feb;
`

const ReasonList = styled.ul`
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  color: #374151;
  list-style: none;
  line-height: 1.5;
`

const ReasonItem = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
`

const AddButton = styled.button`
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 800;

  &:disabled {
    background: #9aa6b2;
    cursor: default;
  }
`

const Message = styled.p`
  padding: 18px;
  border: 1px solid #dde1e7;
  border-radius: 8px;
  margin: 0;
  background: #ffffff;
  color: #4b5563;
`

function getTrendIcon(trend: MarketSignal['trend']) {
  if (trend === 'up') {
    return <ArrowUpRight size={20} aria-hidden="true" />
  }

  if (trend === 'down') {
    return <ArrowDownRight size={20} aria-hidden="true" />
  }

  return <ArrowRight size={20} aria-hidden="true" />
}

export function HomePage() {
  const addSymbol = useWatchlistStore((state) => state.addSymbol)
  const symbols = useWatchlistStore((state) => state.symbols)
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['market-signals'],
    queryFn: fetchMarketSignals,
  })

  return (
    <>
      <PageHeader>
        <Title>시장 판단 보조 대시보드</Title>
        <Description>
          투자 결정을 대신하지 않고, 현재 종목별 신호와 근거를 빠르게 훑어볼 수 있도록 정리하는
          출발점입니다.
        </Description>
      </PageHeader>

      <Toolbar>
        <SectionTitle>오늘의 샘플 시그널</SectionTitle>
        <RefreshButton type="button" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw size={17} aria-hidden="true" />
          새로고침
        </RefreshButton>
      </Toolbar>

      {isLoading ? <Message>시그널을 불러오는 중입니다.</Message> : null}
      {isError ? <Message>시그널을 불러오지 못했습니다.</Message> : null}

      {data ? (
        <Grid>
          {data.map((signal) => {
            const isSaved = symbols.includes(signal.symbol)

            return (
              <SignalCard key={signal.symbol}>
                <CardTop>
                  <div>
                    <Symbol>{signal.symbol}</Symbol>
                    <Name>{signal.name}</Name>
                  </div>
                  <TrendBadge trend={signal.trend}>{getTrendIcon(signal.trend)}</TrendBadge>
                </CardTop>

                <Confidence>
                  <ConfidenceLabel>
                    <span>판단 신뢰도</span>
                    <span>{signal.confidence}%</span>
                  </ConfidenceLabel>
                  <ProgressTrack aria-hidden="true">
                    <ProgressValue value={signal.confidence} />
                  </ProgressTrack>
                </Confidence>

                <ReasonList>
                  {signal.reasons.map((reason) => (
                    <ReasonItem key={reason}>
                      <ArrowRight size={15} aria-hidden="true" />
                      {reason}
                    </ReasonItem>
                  ))}
                </ReasonList>

                <AddButton
                  type="button"
                  onClick={() => addSymbol(signal.symbol)}
                  disabled={isSaved}
                >
                  {isSaved ? '추가됨' : '관심종목 추가'}
                </AddButton>
              </SignalCard>
            )
          })}
        </Grid>
      ) : null}
    </>
  )
}
