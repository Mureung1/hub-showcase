import { useState } from 'react'
import InterestSelect from './screens/InterestSelect'
import Today from './screens/Today'

type Screen = 'onboarding' | 'today'

function App() {
  const [screen, setScreen] = useState<Screen>('onboarding')

  if (screen === 'onboarding') {
    return <InterestSelect onComplete={() => setScreen('today')} />
  }

  return <Today />
}

export default App
