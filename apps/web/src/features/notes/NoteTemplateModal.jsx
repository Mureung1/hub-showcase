import CheckSquare from 'lucide-react/dist/esm/icons/square-check-big.mjs'
import FileText from 'lucide-react/dist/esm/icons/file-text.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import Search from 'lucide-react/dist/esm/icons/search.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'

import { Modal } from '../../components/ui/Modal.jsx'
import styles from './NotesPage.module.css'

const noteTemplates = [
  { id: 'blank', label: '빈 문서', title: '제목 없음', content: '', icon: FileText },
  { id: 'plan', label: '기획 문서', title: '기획 문서', content: '# 기획 문서\n\n## 목적\n\n## 범위\n\n## 주요 기능\n\n## 일정', icon: Layers3 },
  { id: 'decision', label: '결정 기록', title: '결정 기록', content: '# 결정 기록\n\n## 결정 사항\n\n## 배경 및 이유\n\n## 대안 검토\n\n## 영향 범위', icon: CheckSquare },
  { id: 'research', label: '조사 노트', title: '조사 노트', content: '# 조사 노트\n\n## 조사 목적\n\n## 주요 내용\n\n## 참고 자료\n\n## 결론', icon: Search },
  { id: 'meeting', label: '회의 정리', title: '회의 정리', content: '# 회의 정리\n\n## 일시 및 참석자\n\n## 논의 사항\n\n## 결정 사항\n\n## 다음 액션 아이템', icon: Users },
]

export function NoteTemplateModal({ onSelect, onClose }) {
  return <Modal title="템플릿 선택" width={380} onClose={onClose}><div className={styles.templateList}>{noteTemplates.map(({ icon: Icon, ...template }) => <button type="button" key={template.id} onClick={() => onSelect(template)}><span><Icon size={17} /></span>{template.label}</button>)}</div></Modal>
}
