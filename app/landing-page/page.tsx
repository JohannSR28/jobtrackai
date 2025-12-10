import Header from "@/components/landing-page/Header";
import Hero from "@/components/landing-page/Hero";
import Amplify from "@/components/landing-page/Amplify";
import HowItWorks from "@/components/landing-page/HowItWorks";
import Benefits from "@/components/landing-page/Benefits";
import FAQ from "@/components/landing-page/FAQ";
import Footer from "@/components/landing-page/Footer";

export default function Home() {
  return (
    <main>
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-br from-gray-50 via-white to-orange-50 -z-50 pointer-events-none"></div>
      <Header />
      <Hero />
      <Amplify />
      <HowItWorks />
      <Benefits />
      <FAQ />
      <Footer />
    </main>
  );
}
