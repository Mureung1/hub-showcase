import type { NavSection } from '../model/navItems'
import { NavButton, NavLinkButton, NavSectionGroup, SectionTitle } from './SidebarWidget.styles'

interface SidebarNavSectionProps {
  section: NavSection
}

export const SidebarNavSection = ({ section }: SidebarNavSectionProps) => (
  <NavSectionGroup>
    <SectionTitle>{section.title}</SectionTitle>
    {section.items.map((item) => {
      const Icon = item.icon

      if (item.to) {
        return (
          <NavLinkButton key={item.id} to={item.to} isActive>
            <Icon size={18} />
            {item.label}
          </NavLinkButton>
        )
      }

      return (
        <NavButton key={item.id} type="button">
          <Icon size={18} />
          {item.label}
        </NavButton>
      )
    })}
  </NavSectionGroup>
)
