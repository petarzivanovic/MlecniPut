import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StorySection from "@/components/StorySection";
import WindingRoad from "@/components/WindingRoad";
import FloatingDoodles from "@/components/FloatingDoodles";
import Footer from "@/components/Footer";
import DemandForecast from "@/components/DemandForecast";

const Index = () => {
  return (
    <div className="relative">
      <Navbar />
      <WindingRoad />
      <FloatingDoodles />
      <HeroSection />
      <DemandForecast />
      <StorySection />
      <Footer />
    </div>
  );
};

export default Index;
