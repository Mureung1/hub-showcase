import MechanismViewer from '../../features/organicMechanism/components/MechanismViewer'
import { fischerEsterificationReaction } from '../../features/organicMechanism/data/fischerEsterification'

export default function AcylSubstitutionPage() {
  return <MechanismViewer title="카르복시산 유도체 반응" reactions={[fischerEsterificationReaction]} />
}
