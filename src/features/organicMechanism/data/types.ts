/** 0-based index of an atom as it appears in that step's own SMILES string. */
export type AtomIndex = number

/**
 * The origin of a curly arrow's tail, i.e. what kind of electron pair is moving.
 * - 'lone-pair': electrons come from a non-bonding lone pair on a single atom.
 * - 'sigma-bond': electrons come from an existing single bond, breaking heterolytically.
 * - 'pi-bond': electrons come from a pi bond between two atoms (e.g. an alkene).
 */
export type ArrowSource =
  | { kind: 'lone-pair'; atom: AtomIndex }
  | { kind: 'sigma-bond'; atoms: [AtomIndex, AtomIndex] }
  | { kind: 'pi-bond'; atoms: [AtomIndex, AtomIndex] }

/** A single curly arrow: electron pair moves from `source` and lands on `target`. */
export interface CurlyArrow {
  id: string
  source: ArrowSource
  target: AtomIndex
  /** Curve bulge direction; flips which side of the straight line the arc bows to. */
  bend?: 'left' | 'right'
}

/**
 * One frame of a mechanism: a structure (by SMILES) plus the curly arrows drawn
 * on top of it that show the transformation FROM this structure TO the next step.
 * The last step in a reaction has no arrows.
 */
export interface MechanismStep {
  id: string
  /** SMILES for the species shown at this step (multiple molecules joined by '.'). */
  smiles: string
  title: string
  description: string
  arrows: CurlyArrow[]
}

export interface ReactionTemplate {
  id: string
  name: string
  summary: string
  /** Ordered mechanism frames; steps[0] is the starting reactant(s), last is the product. */
  steps: MechanismStep[]
}
