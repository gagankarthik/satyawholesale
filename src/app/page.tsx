import StoreJsonLd from "@/components/landing/StoreJsonLd";
import LandingEffects from "@/components/landing/LandingEffects";
import ContactBar from "@/components/landing/ContactBar";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import TrustBand from "@/components/landing/TrustBand";
import Departments from "@/components/landing/Departments";
import HowWeServe from "@/components/landing/HowWeServe";
import WhySatya from "@/components/landing/WhySatya";
import AccountGate from "@/components/landing/AccountGate";
import Contact from "@/components/landing/Contact";
import Cta from "@/components/landing/Cta";
import Footer from "@/components/landing/Footer";

/* =======================================================================
   Landing page — composition only. Each section lives in its own module
   under src/components/landing/*. Static sections are server components;
   the nav, hero and contact form are client islands.
   ======================================================================= */
export default function Home() {
  return (
    <>
      <StoreJsonLd />
      <LandingEffects />
      <ContactBar />
      <Header />
      <main id="main">
        <Hero />
        <TrustBand />
        <Departments />
        <HowWeServe />
        <WhySatya />
        <AccountGate />
        <Contact />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
