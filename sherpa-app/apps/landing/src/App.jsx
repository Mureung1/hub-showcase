import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import Problems from "./components/Problems";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Audience from "./components/Audience";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <Problems />
        <Features />
        <HowItWorks />
        <Audience />
      </main>
      <Footer />
    </>
  );
}
