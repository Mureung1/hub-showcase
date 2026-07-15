import { RESOURCE_TYPE } from '@teamflow/shared'
import ArrowDownUp from 'lucide-react/dist/esm/icons/arrow-down-up.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Search from 'lucide-react/dist/esm/icons/search.mjs'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { ResourceIcon } from '../../components/ui/ResourceIcon.jsx'
import { RESOURCE_TYPE_LABEL } from '../../constants/labels.js'
import { formatShortDate } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import workspace from '../../styles/workspace.module.css'
import { AddResourceModal } from './AddResourceModal.jsx'
import { ResourceDetailModal } from './ResourceDetailModal.jsx'
import styles from './ResourcesPage.module.css'

export function ResourcesPage() {
  const { project } = useOutletContext()
  const { state } = useTeamFlow()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [newestFirst, setNewestFirst] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const memberById = useMemo(() => new Map(state.members.map((member) => [member.id, member])), [state.members])

  const resources = useMemo(() => state.resources
    .filter((resource) => resource.projectId === project.id)
    .filter((resource) => type === 'all' || resource.type === type)
    .filter((resource) => `${resource.name} ${resource.description ?? ''} ${memberById.get(resource.ownerId)?.name ?? ''}`.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR')))
    .sort((a, b) => newestFirst ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)), [state.resources, project.id, type, query, newestFirst, memberById])

  return (
    <section className={workspace.scrollPage} aria-labelledby="resources-title">
      <div className={workspace.container}>
        <header className={workspace.pageHeader}>
          <div><p>{project.name} · 자료실</p><h1 id="resources-title">자료실</h1></div>
          <button className={workspace.primaryButton} type="button" onClick={() => setShowAdd(true)}><Plus size={15} />자료 추가</button>
        </header>
        <div className={styles.toolbar}>
          <div className={workspace.searchField}><Search size={15} /><label className="visually-hidden" htmlFor="resource-search">자료 검색</label><input id="resource-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="자료 검색" /></div>
          <div className={styles.filters}>
            <label><span className="visually-hidden">자료 유형</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">전체 유형</option>{Object.values(RESOURCE_TYPE).map((value) => <option key={value} value={value}>{RESOURCE_TYPE_LABEL[value]}</option>)}</select></label>
            <button type="button" onClick={() => setNewestFirst((value) => !value)} aria-label={newestFirst ? '오래된 자료부터 정렬' : '최근 자료부터 정렬'}><ArrowDownUp size={14} />{newestFirst ? '최근 수정순' : '오래된 순'}</button>
          </div>
        </div>
        <div className={`${workspace.card} ${styles.resourceCard}`}>
          <table className={workspace.table}>
            <thead><tr><th>자료 이름</th><th>유형</th><th>등록자</th><th>수정일</th></tr></thead>
            <tbody>{resources.map((resource) => { const owner = memberById.get(resource.ownerId); return <tr className={workspace.clickableRow} key={resource.id} tabIndex="0" onClick={() => setSelected(resource)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(resource) } }}><td><div className={styles.resourceName}><ResourceIcon type={resource.type} /><div><p className={workspace.cellTitle}>{resource.name}</p><p className={workspace.cellDescription}>{resource.description || '설명 없음'}</p></div></div></td><td>{RESOURCE_TYPE_LABEL[resource.type]}</td><td>{owner?.name ?? '알 수 없음'}</td><td className={workspace.mono}>{formatShortDate(resource.updatedAt)}</td></tr> })}</tbody>
          </table>
          {resources.length === 0 ? <p className={workspace.empty}>조건에 맞는 자료가 없습니다.</p> : null}
        </div>
      </div>
      {showAdd ? <AddResourceModal projectId={project.id} onClose={() => setShowAdd(false)} /> : null}
      {selected ? <ResourceDetailModal resource={selected} owner={memberById.get(selected.ownerId)} onClose={() => setSelected(null)} /> : null}
    </section>
  )
}
