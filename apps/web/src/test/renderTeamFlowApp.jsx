import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import App from '../App.jsx'
import { AuthProvider } from '../auth/AuthProvider.jsx'
import { testTeamFlowRepository } from './createTestTeamFlowRepository.js'

export const authenticatedSession = {
  access_token: 'test-access-token',
  user: {
    id: 'auth-user-1',
    email: 'tester@example.com',
    user_metadata: { full_name: '테스트 사용자', avatar_url: '' },
  },
}

export function createTestAuthClient(session = authenticatedSession) {
  return {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
    },
  }
}

export function renderAuthenticatedApp(initialEntry = '/projects', repository = testTeamFlowRepository) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider client={createTestAuthClient()}>
        <App authenticatedRepository={repository} />
      </AuthProvider>
    </MemoryRouter>,
  )
}
