import { Chip, ChipRow } from './FilterChipRow.styles'

export interface FilterChipOption<T extends string> {
  id: T
  label: string
}

interface FilterChipRowProps<T extends string> {
  options: FilterChipOption<T>[]
  activeFilter: T
  onSelectFilter: (filter: T) => void
}

export const FilterChipRow = <T extends string,>({ options, activeFilter, onSelectFilter }: FilterChipRowProps<T>) => (
  <ChipRow>
    {options.map((option) => (
      <Chip
        key={option.id}
        type="button"
        isActive={option.id === activeFilter}
        onClick={() => onSelectFilter(option.id)}
      >
        {option.label}
      </Chip>
    ))}
  </ChipRow>
)
