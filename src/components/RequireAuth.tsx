import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../api/client.ts'

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) {
    return <Navigate replace to="/login" />
  }

  return children
}

export default RequireAuth
