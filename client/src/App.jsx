import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import StudioGrid from "./components/StudioGrid.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import Footer from "./components/Footer.jsx";
import "./index.css";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <StudioGrid />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
