import { Search, Settings, TriangleAlert } from 'lucide-react'

import { Input } from '@/shared/ui/Input'

import { NAV_SECTIONS } from '../model/navItems'
import { WATCHLIST_MOCK } from '../model/watchlistMock'
import { SidebarNavSection } from './SidebarNavSection'
import { SidebarWatchlistRow } from './SidebarWatchlistRow'
import {
  BrandName,
  FooterSection,
  LogoBadge,
  LogoRow,
  NavButton,
  NavSectionList,
  SectionTitle,
  SidebarAside,
  WatchlistSection,
} from './SidebarWidget.styles'

export const SidebarWidget = () => (
  <SidebarAside>
    <LogoRow>
      <LogoBadge>가</LogoBadge>
      <BrandName>가즈아</BrandName>
    </LogoRow>

    <Input placeholder="종목·지표 검색" leadingIcon={<Search size={15} />} />

    <NavSectionList>
      {NAV_SECTIONS.map((section) => (
        <SidebarNavSection key={section.id} section={section} />
      ))}

      <WatchlistSection>
        <SectionTitle>관심 종목</SectionTitle>
        {WATCHLIST_MOCK.map((item) => (
          <SidebarWatchlistRow key={item.id} item={item} />
        ))}
      </WatchlistSection>
    </NavSectionList>

    <FooterSection>
      <NavButton type="button">
        <TriangleAlert size={16} />
        투자 유의사항
      </NavButton>
      <NavButton type="button">
        <Settings size={16} />
        설정
      </NavButton>
    </FooterSection>
  </SidebarAside>
)
