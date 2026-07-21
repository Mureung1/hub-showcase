const GAS_CONSTANT = 8.314 // J/(mol·K)

export interface DistributionPoint {
  speed: number // m/s
  density: number // probability density (s/m), integrates to 1 over speed
}

/** Maxwell-Boltzmann speed distribution f(v) for a gas at temperature T. */
export function maxwellBoltzmannDistribution(
  temperatureK: number,
  molarMassKgPerMol: number,
  maxSpeed: number,
  pointCount = 200,
): DistributionPoint[] {
  const points: DistributionPoint[] = []
  const factor = Math.pow(molarMassKgPerMol / (2 * Math.PI * GAS_CONSTANT * temperatureK), 1.5)
  for (let i = 0; i <= pointCount; i++) {
    const v = (maxSpeed * i) / pointCount
    const density =
      4 *
      Math.PI *
      factor *
      v *
      v *
      Math.exp((-molarMassKgPerMol * v * v) / (2 * GAS_CONSTANT * temperatureK))
    points.push({ speed: v, density })
  }
  return points
}

/** Speed at the peak of the distribution — the single most common molecular speed. */
export function mostProbableSpeed(temperatureK: number, molarMassKgPerMol: number): number {
  return Math.sqrt((2 * GAS_CONSTANT * temperatureK) / molarMassKgPerMol)
}
