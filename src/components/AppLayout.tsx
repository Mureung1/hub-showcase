import styled from '@emotion/styled'
import { BarChart3, ListChecks } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const Shell = styled.div`
  min-height: 100vh;
  background: #f6f7f9;
  color: #191f2a;
`

const Header = styled.header`
  border-bottom: 1px solid #dde1e7;
  background: #ffffff;
`

const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 18px 0;
  gap: 16px;

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

const Brand = styled.div`
  display: grid;
  gap: 2px;
`

const BrandName = styled.p`
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 800;
`

const BrandDescription = styled.p`
  margin: 0;
  color: #596273;
  font-size: 0.9rem;
`

const Navigation = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
`

const navigationLinkStyles = `
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  color: #4b5563;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;

  &.active {
    background: #111827;
    color: #ffffff;
  }
`

const StyledNavLink = styled(NavLink)`
  ${navigationLinkStyles}
`

const Main = styled.main`
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
`

export function AppLayout() {
  return (
    <Shell>
      <Header>
        <HeaderInner>
          <Brand>
            <BrandName>GAZUA</BrandName>
            <BrandDescription>AI 기반 투자 판단 보조 서비스</BrandDescription>
          </Brand>
          <Navigation aria-label="주요 메뉴">
            <StyledNavLink to="/" end>
              <BarChart3 size={18} aria-hidden="true" />
              대시보드
            </StyledNavLink>
            <StyledNavLink to="/watchlist">
              <ListChecks size={18} aria-hidden="true" />
              관심종목
            </StyledNavLink>
          </Navigation>
        </HeaderInner>
      </Header>
      <Main>
        <Outlet />
      </Main>
    </Shell>
  )
}
