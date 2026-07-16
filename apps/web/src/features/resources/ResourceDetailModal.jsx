import { Modal } from '../../components/ui/Modal.jsx'
import { ResourceIcon } from '../../components/ui/ResourceIcon.jsx'
import { RESOURCE_TYPE_LABEL } from '../../constants/labels.js'
import { formatShortDate } from '../../lib/format.js'
import styles from './ResourcesPage.module.css'

export function ResourceDetailModal({ resource, owner, onClose }) {
  return (
    <Modal title="자료 상세" onClose={onClose} width={460} footer={<button type="button" className={styles.detailClose} onClick={onClose}>확인</button>}>
      <div className={styles.detailBody}>
        <div className={styles.detailTitle}><ResourceIcon type={resource.type} /><div><h3>{resource.name}</h3><p>{RESOURCE_TYPE_LABEL[resource.type]}</p></div></div>
        <dl>
          <div><dt>등록자</dt><dd>{owner?.name ?? '알 수 없음'}</dd></div>
          <div><dt>수정일</dt><dd>{formatShortDate(resource.updatedAt)}</dd></div>
          <div className={styles.fullDetail}><dt>설명</dt><dd>{resource.description || '등록된 설명이 없습니다.'}</dd></div>
        </dl>
        <p className={styles.readOnlyNotice}>이 프로토타입에서는 자료 정보를 읽기 전용으로 제공합니다.</p>
      </div>
    </Modal>
  )
}
