import MechanismViewer from '../../features/organicMechanism/components/MechanismViewer'
import { electrophilicAdditionReaction } from '../../features/organicMechanism/data/electrophilicAddition'

export default function AlkeneAdditionPage() {
  return <MechanismViewer title="알켄 첨가 반응" reactions={[electrophilicAdditionReaction]} />
}
