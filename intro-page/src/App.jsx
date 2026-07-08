import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Intro from './pages/Intro.jsx'
import Overview from './pages/Overview.jsx'
import Problem from './pages/Problem.jsx'
import ServiceFlow from './pages/ServiceFlow.jsx'

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
}

const pageTransition = { duration: 0.35, ease: 'easeInOut' }

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Intro /></AnimatedPage>} />
        <Route path="/overview" element={<AnimatedPage><Overview /></AnimatedPage>} />
        <Route path="/problem" element={<AnimatedPage><Problem /></AnimatedPage>} />
        <Route path="/service-flow" element={<AnimatedPage><ServiceFlow /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}

export default App
