export interface GasPreset {
  id: string
  label: string
  molarMassKgPerMol: number
}

export const GAS_PRESETS: GasPreset[] = [
  { id: 'h2', label: '수소 (H₂)', molarMassKgPerMol: 0.002016 },
  { id: 'he', label: '헬륨 (He)', molarMassKgPerMol: 0.004003 },
  { id: 'n2', label: '질소 (N₂)', molarMassKgPerMol: 0.028014 },
  { id: 'o2', label: '산소 (O₂)', molarMassKgPerMol: 0.031998 },
  { id: 'co2', label: '이산화탄소 (CO₂)', molarMassKgPerMol: 0.04401 },
]
