import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import HomePage from './pages/HomePage.tsx'
import NewAppointmentPage from './pages/NewAppointmentPage.tsx'
import AppointmentPage from './pages/AppointmentPage.tsx'
import SchedulePage from './pages/SchedulePage.tsx'
import ResultPage from './pages/ResultPage.tsx'
import './App.css'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/new', element: <NewAppointmentPage />, handle: { title: '약속 만들기' } },
      { path: '/a/:id', element: <AppointmentPage />, handle: { title: '약속 진입점' } },
      {
        path: '/a/:id/schedule',
        element: <SchedulePage />,
        handle: { title: '일정 입력' },
      },
      { path: '/a/:id/result', element: <ResultPage />, handle: { title: '최종 결과' } },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
