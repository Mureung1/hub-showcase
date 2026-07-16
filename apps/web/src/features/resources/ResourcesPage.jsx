import { RESOURCE_TYPE } from '@teamflow/shared'
import ArrowDownUp from 'lucide-react/dist/esm/icons/arrow-down-up.mjs'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.mjs'
import FolderPlus from 'lucide-react/dist/esm/icons/folder-plus.mjs'
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
import { CreateFolderModal } from './CreateFolderModal.jsx'
import { ResourceDetailModal } from './ResourceDetailModal.jsx'
import styles from './ResourcesPage.module.css'

export function ResourcesPage() {
  const { project } = useOutletContext()
  const { state } = useTeamFlow()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [newestFirst, setNewestFirst] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showFolderCreate, setShowFolderCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const memberById = useMemo(() => new Map(state.members.map((member) => [member.id, member])), [state.members])
  const projectResources = useMemo(() => state.resources.filter((resource) => resource.projectId === project.id), [state.resources, project.id])
  const folders = useMemo(() => projectResources.filter((resource) => resource.type === RESOURCE_TYPE.FOLDER && resource.parentId == null), [projectResources])
  const currentFolder = folders.find((folder) => folder.id === currentFolderId) ?? null
  const selected = state.resources.find((resource) => resource.id === selectedId) ?? null

  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const matchesQuery = (resource) => `${resource.name} ${resource.description ?? ''} ${memberById.get(resource.ownerId)?.name ?? ''}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
  const byUpdatedAt = (a, b) => newestFirst ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)
  const visibleFolders = currentFolderId == null && type === 'all'
    ? folders.filter(matchesQuery).sort(byUpdatedAt)
    : []
  const visibleFiles = projectResources
    .filter((resource) => resource.type !== RESOURCE_TYPE.FOLDER)
    .filter((resource) => (resource.parentId ?? null) === currentFolderId)
    .filter((resource) => type === 'all' || resource.type === type)
    .filter(matchesQuery)
    .sort(byUpdatedAt)

  function openFolder(folderId) {
    setCurrentFolderId(folderId)
    setQuery('')
    setType('all')
  }

  function goRoot() {
    setCurrentFolderId(null)
    setQuery('')
    setType('all')
  }

  return (
    <section className={workspace.scrollPage} aria-labelledby="resources-title">
      <div className={workspace.container}>
        <header className={workspace.pageHeader}>
          <div>
            <p>{project.name} · 자료실</p>
            <h1 id="resources-title" className={styles.breadcrumb}>
              {currentFolder ? <button type="button" onClick={goRoot}>자료실</button> : <span>자료실</span>}
              {currentFolder ? <><ChevronRight size={18} aria-hidden="true" /><span>{currentFolder.name}</span></> : null}
            </h1>
          </div>
          <div className={styles.createActions}>
            {currentFolderId == null ? <button className={workspace.secondaryButton} type="button" onClick={() => setShowFolderCreate(true)}><FolderPlus size={15} />새 폴더</button> : null}
            <button className={workspace.primaryButton} type="button" onClick={() => setShowAdd(true)}><Plus size={15} />자료 추가</button>
          </div>
        </header>
        <div className={styles.toolbar}>
          <div className={workspace.searchField}><Search size={15} /><label className="visually-hidden" htmlFor="resource-search">자료 검색</label><input id="resource-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="현재 위치에서 검색" /></div>
          <div className={styles.filters}>
            <label><span className="visually-hidden">자료 유형</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">전체 유형</option>{Object.values(RESOURCE_TYPE).filter((value) => value !== RESOURCE_TYPE.FOLDER).map((value) => <option key={value} value={value}>{RESOURCE_TYPE_LABEL[value]}</option>)}</select></label>
            <button type="button" onClick={() => setNewestFirst((value) => !value)} aria-label={newestFirst ? '오래된 자료부터 정렬' : '최근 자료부터 정렬'}><ArrowDownUp size={14} />{newestFirst ? '최근 수정순' : '오래된 순'}</button>
          </div>
        </div>

        {currentFolderId == null && type === 'all' ? (
          <section className={styles.folderSection} aria-labelledby="folders-title">
            <header className={styles.sectionTitle}><h2 id="folders-title">폴더</h2><span>{visibleFolders.length}개</span></header>
            {visibleFolders.length > 0 ? <div className={styles.folderGrid}>{visibleFolders.map((folder) => { const itemCount = projectResources.filter((resource) => resource.parentId === folder.id).length; return <button className={styles.folderCard} type="button" key={folder.id} onClick={() => openFolder(folder.id)}><ResourceIcon type={RESOURCE_TYPE.FOLDER} /><span><strong>{folder.name}</strong><small>{itemCount}개 항목 · {formatShortDate(folder.updatedAt)}</small></span><ChevronRight size={16} aria-hidden="true" /></button> })}</div> : <p className={styles.folderEmpty}>{query ? '검색 조건에 맞는 폴더가 없습니다.' : '아직 폴더가 없습니다.'}</p>}
          </section>
        ) : null}

        <section className={styles.fileSection} aria-labelledby="files-title">
          <header className={styles.sectionTitle}><h2 id="files-title">파일</h2><span>{visibleFiles.length}개</span></header>
          <div className={`${workspace.card} ${styles.resourceCard}`}>
            <table className={workspace.table}>
              <thead><tr><th>자료 이름</th><th>유형</th><th>등록자</th><th>수정일</th></tr></thead>
              <tbody>{visibleFiles.map((resource) => { const owner = memberById.get(resource.ownerId); return <tr className={workspace.clickableRow} key={resource.id} role="button" tabIndex="0" aria-label={`${resource.name} 상세 보기`} onClick={() => setSelectedId(resource.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(resource.id) } }}><td><div className={styles.resourceName}><ResourceIcon type={resource.type} /><div><p className={workspace.cellTitle}>{resource.name}</p><p className={workspace.cellDescription}>{resource.description || '설명 없음'}</p></div></div></td><td>{RESOURCE_TYPE_LABEL[resource.type]}</td><td>{owner?.name ?? '알 수 없음'}</td><td className={workspace.mono}>{formatShortDate(resource.updatedAt)}</td></tr> })}</tbody>
            </table>
            {visibleFiles.length === 0 ? <p className={workspace.empty}>현재 위치에 조건에 맞는 파일이 없습니다.</p> : null}
          </div>
        </section>
      </div>
      {showFolderCreate ? <CreateFolderModal projectId={project.id} onClose={() => setShowFolderCreate(false)} /> : null}
      {showAdd ? <AddResourceModal projectId={project.id} folders={folders} defaultParentId={currentFolderId} onClose={() => setShowAdd(false)} /> : null}
      {selected ? <ResourceDetailModal resource={selected} owner={memberById.get(selected.ownerId)} onClose={() => setSelectedId(null)} /> : null}
    </section>
  )
}
