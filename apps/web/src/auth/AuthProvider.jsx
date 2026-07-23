import { useCallback, useEffect, useMemo, useState } from 'react'

import { AuthContext } from './AuthContext.js'

const GUEST_KEY = 'teamflow:guest'
const RETURN_TO_KEY = 'teamflow:return-to'

function hasGuestSession() {
  return globalThis.sessionStorage?.getItem(GUEST_KEY) === '1'
}

function profileFromSession(session) {
  const metadata = session?.user?.user_metadata ?? {}
  const email = session?.user?.email ?? ''
  return session?.user ? {
    id: session.user.id,
    email,
    displayName: metadata.full_name || metadata.name || email.split('@')[0] || 'TeamFlow 사용자',
    avatarUrl: metadata.avatar_url || metadata.picture || '',
  } : null
}

export function AuthProvider({ children, client, configError = '' }) {
  const [state, setState] = useState({ status: 'loading', session: null, error: '' })

  useEffect(() => {
    let active = true

    if (!client) {
      setState({ status: hasGuestSession() ? 'guest' : 'anonymous', session: null, error: configError })
      return undefined
    }

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setState({ status: hasGuestSession() ? 'guest' : 'anonymous', session: null, error: '로그인 상태를 확인하지 못했습니다.' })
        return
      }
      if (data.session) {
        globalThis.sessionStorage?.removeItem(GUEST_KEY)
        setState({ status: 'authenticated', session: data.session, error: '' })
      } else {
        setState({ status: hasGuestSession() ? 'guest' : 'anonymous', session: null, error: configError })
      }
    })

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session) {
        globalThis.sessionStorage?.removeItem(GUEST_KEY)
        setState({ status: 'authenticated', session, error: '' })
      } else {
        setState({ status: hasGuestSession() ? 'guest' : 'anonymous', session: null, error: configError })
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [client, configError])

  const signInWithGoogle = useCallback(async (returnTo = '/projects') => {
    if (!client) {
      setState((current) => ({ ...current, error: configError || 'Google 로그인 설정이 필요합니다.' }))
      return { error: new Error(configError || 'Google 로그인 설정이 필요합니다.') }
    }
    globalThis.sessionStorage?.removeItem(GUEST_KEY)
    globalThis.sessionStorage?.setItem(RETURN_TO_KEY, returnTo)
    const result = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${globalThis.location.origin}/auth/callback` },
    })
    if (result.error) setState((current) => ({ ...current, error: 'Google 로그인을 시작하지 못했습니다.' }))
    return result
  }, [client, configError])

  const enterGuest = useCallback(() => {
    globalThis.sessionStorage?.setItem(GUEST_KEY, '1')
    setState({ status: 'guest', session: null, error: '' })
  }, [])

  const signOut = useCallback(async () => {
    globalThis.sessionStorage?.removeItem(GUEST_KEY)
    globalThis.sessionStorage?.removeItem(RETURN_TO_KEY)
    if (client && state.session) await client.auth.signOut()
    setState({ status: 'anonymous', session: null, error: configError })
  }, [client, state.session, configError])

  const getAccessToken = useCallback(async () => {
    if (!client) return null
    const { data, error } = await client.auth.getSession()
    if (error) return null
    return data.session?.access_token ?? null
  }, [client])

  const uploadToSignedUrl = useCallback(async ({ bucket, path, token, file }) => {
    if (!client || !state.session) throw new Error('로그인 상태를 확인한 뒤 다시 시도해 주세요.')
    if (!file) throw new Error('업로드할 파일을 선택해 주세요.')

    const { error } = await client.storage
      .from(bucket)
      .uploadToSignedUrl(path, token, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
      })

    if (error) throw new Error('파일을 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }, [client, state.session])

  const consumeReturnTo = useCallback(() => {
    const value = globalThis.sessionStorage?.getItem(RETURN_TO_KEY) ?? '/projects'
    globalThis.sessionStorage?.removeItem(RETURN_TO_KEY)
    return value.startsWith('/') && !value.startsWith('//') ? value : '/projects'
  }, [])

  const value = useMemo(() => ({
    ...state,
    user: profileFromSession(state.session),
    signInWithGoogle,
    enterGuest,
    signOut,
    getAccessToken,
    uploadToSignedUrl,
    consumeReturnTo,
    clearError: () => setState((current) => ({ ...current, error: '' })),
  }), [state, signInWithGoogle, enterGuest, signOut, getAccessToken, uploadToSignedUrl, consumeReturnTo])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
