import styled from '@emotion/styled'
import { Trash2 } from 'lucide-react'

import { useWatchlistStore } from '@/features/watchlist'

const Header = styled.div`
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

const List = styled.ul`
  display: grid;
  gap: 12px;
  max-width: 560px;
  padding: 0;
  margin: 0;
  list-style: none;
`

const Item = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  padding: 0 16px;
  border: 1px solid #dde1e7;
  border-radius: 8px;
  background: #ffffff;
  font-weight: 800;
`

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #d6dce5;
  border-radius: 8px;
  background: #ffffff;
  color: #bf3030;
  cursor: pointer;

  &:hover {
    border-color: #bf3030;
  }
`

const EmptyState = styled.p`
  max-width: 560px;
  padding: 18px;
  border: 1px solid #dde1e7;
  border-radius: 8px;
  margin: 0;
  background: #ffffff;
  color: #4b5563;
`

export default function WatchlistPage() {
  const symbols = useWatchlistStore((state) => state.symbols)
  const removeSymbol = useWatchlistStore((state) => state.removeSymbol)

  return (
    <>
      <Header>
        <Title>관심종목</Title>
        <Description>대시보드에서 저장한 종목을 한곳에 모아 추적할 수 있습니다.</Description>
      </Header>

      {symbols.length > 0 ? (
        <List>
          {symbols.map((symbol) => (
            <Item key={symbol}>
              {symbol}
              <RemoveButton
                type="button"
                aria-label={`${symbol} 관심종목 제거`}
                onClick={() => removeSymbol(symbol)}
              >
                <Trash2 size={18} aria-hidden="true" />
              </RemoveButton>
            </Item>
          ))}
        </List>
      ) : (
        <EmptyState>아직 저장된 관심종목이 없습니다.</EmptyState>
      )}
    </>
  )
}
