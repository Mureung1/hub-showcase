import { useState } from 'react'
import ListingUploadPage from './pages/ListingUploadPage'
import UserInfoPage from './pages/UserInfoPage'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('user-info')

  if (currentPage === 'upload') {
    return <ListingUploadPage onBack={() => setCurrentPage('user-info')} />
  }

  return <UserInfoPage onComplete={() => setCurrentPage('upload')} />
}

export default App
