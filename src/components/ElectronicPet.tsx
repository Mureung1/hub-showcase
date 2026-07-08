import type { WorldState } from "../domain/types";

interface ElectronicPetProps {
  world: WorldState;
  compact?: boolean;
}

export function ElectronicPet({ world, compact = false }: ElectronicPetProps) {
  return (
    <div className={`electronic-pet ${world.managerMood} ${compact ? "compact" : ""}`} aria-label="전자 생물 매니저">
      <span className="pet-antenna" />
      <span className="pet-ear left" />
      <span className="pet-ear right" />
      <span className="pet-head" />
      <span className="pet-face">
        <i />
        <i />
        <b />
      </span>
      <span className="pet-body" />
      <span className="pet-shadow" />
    </div>
  );
}
