import MechanismViewer from '../../features/organicMechanism/components/MechanismViewer'
import { acylSubstitutionAspirinReaction } from '../../features/organicMechanism/data/acylSubstitutionAspirin'

export default function AcylSubstitutionPage() {
  return <MechanismViewer title="카르복시산 유도체 반응" reactions={[acylSubstitutionAspirinReaction]} />
}
