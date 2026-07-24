import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

import type { MarketDirection } from '../model/watchlistMock'

export const SidebarAside = styled.aside`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  width: ${({ theme }) => theme.components.sidebar.width};
  flex-shrink: 0;
  height: 100%;
  padding: ${({ theme }) => theme.space[5]} ${({ theme }) => theme.space[3]};
  background: ${({ theme }) => theme.components.sidebar.background};
  border-right: 1px solid ${({ theme }) => theme.components.sidebar.border};
`

export const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: 0 ${({ theme }) => theme.space[1]};
`

export const LogoBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.size.icon.xl};
  height: ${({ theme }) => theme.size.icon.xl};
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.fill.brand};
  color: ${({ theme }) => theme.colors.text.inverse};
  border-radius: ${({ theme }) => theme.radius.sm};
  ${({ theme }) => theme.typography.labelLarge};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
`

export const BrandName = styled.span`
  ${({ theme }) => theme.typography.labelLarge};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const NavSectionList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

export const NavSectionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &:first-of-type {
    padding-top: 0;
    border-top: none;
  }
`

export const SectionTitle = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  padding: 0 ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[1]};
`

const navButtonStyles = ({ theme, isActive }: { theme: import('@emotion/react').Theme; isActive?: boolean }) => css`
  display: flex;
  align-items: center;
  gap: ${theme.space[3]};
  width: 100%;
  padding: ${theme.space[2]} ${theme.space[3]};
  border: none;
  border-radius: ${theme.radius.sm};
  background: ${isActive ? theme.colors.fill.brandWeak : 'transparent'};
  color: ${isActive ? theme.colors.text.brand : theme.colors.text.tertiary};
  ${theme.typography.labelMedium};
  cursor: pointer;
  text-decoration: none;
  text-align: left;

  &:hover {
    background: ${isActive ? theme.colors.fill.brandWeak : theme.colors.fill.neutralHover};
  }
`

export const NavButton = styled.button<{ isActive?: boolean }>`
  ${navButtonStyles}
`

export const NavLinkButton = styled(Link, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>`
  ${navButtonStyles}
`

export const WatchlistSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`

export const WatchlistRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.sm};
`

export const WatchlistInfo = styled.div`
  display: flex;
  flex-direction: column;
`

export const WatchlistName = styled.span`
  ${({ theme }) => theme.typography.labelMedium};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const WatchlistSymbol = styled.span`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

const marketColor = (direction: MarketDirection) => (theme: import('@emotion/react').Theme) => {
  if (direction === 'rise') return theme.colors.market.rise
  if (direction === 'fall') return theme.colors.market.fall
  return theme.colors.market.unchanged
}

export const WatchlistChangeRate = styled.span<{ market: MarketDirection }>`
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme, market }) => marketColor(market)(theme)};
`

export const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  padding-top: ${({ theme }) => theme.space[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`
