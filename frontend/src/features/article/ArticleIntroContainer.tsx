import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import ContentLoadingScreen from '../../shared/ui/ContentLoadingScreen/ContentLoadingScreen'
import ArticleIntro, { type ArticleIntroState } from './ArticleIntro'

type ArticleIntroContainerProps = {
  articleId: string
  onBack: () => void
  onGoToMyGgaem: () => void
}

export default function ArticleIntroContainer({
  articleId,
  onBack,
  onGoToMyGgaem,
}: ArticleIntroContainerProps) {
  const [state, setState] = useState<ArticleIntroState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState({ status: 'loading' })
      try {
        const article = await api.getArticleDetail(articleId)
        if (cancelled) return
        setState({ status: 'success', article })
      } catch {
        if (cancelled) return
        setState({
          status: 'error',
          message: '글을 불러오지 못했어요.',
          onRetry: load,
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [articleId])

  if (state.status === 'loading') {
    return (
      <ContentLoadingScreen
        message="오늘의 글을 불러오고 있어요"
        description="잠시만요, 곧 준비돼요"
      />
    )
  }

  return (
    <ArticleIntro
      state={state}
      onBack={onBack}
      onSubmitMission={(request) => api.createMissionRecord(request)}
      onGoToMyGgaem={onGoToMyGgaem}
    />
  )
}
