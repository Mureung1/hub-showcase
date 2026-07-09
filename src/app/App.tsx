import { RouterProvider } from 'react-router'
import { router } from './router'

export default function App() {
  return (
    <main className="app">
      <RouterProvider router={router} />
    </main>
  )
}
