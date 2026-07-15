import { getPriorityLevel, priorityLevelLabel } from "../utils/priorityLevel";

function PriorityBadge({ priorityScore }) {
  const level = getPriorityLevel(priorityScore);

  return (
    <span className={`badge badge-${level}`}>
      {priorityLevelLabel[level]}
    </span>
  );
}

export default PriorityBadge;
