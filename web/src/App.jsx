import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import FlowDiagram from './components/FlowDiagram.jsx'
import CardSection from './components/CardSection.jsx'
import Footer from './components/Footer.jsx'
import {
  heroContent,
  flowContent,
  problemContent,
  featureContent,
  effectContent,
} from './data/content.js'
import './App.css'

function App() {
  return (
    <div className="page">
      <Header />
      <main>
        <Hero {...heroContent} />
        <FlowDiagram {...flowContent} />
        <CardSection tone="red" {...problemContent} />
        <CardSection id="features" tone="green" {...featureContent} />
        <CardSection tone="blue" {...effectContent} />
      </main>
      <Footer />
    </div>
  )
}

export default App
