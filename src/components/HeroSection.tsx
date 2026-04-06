import { motion } from "framer-motion";
import heroCow from "@/assets/hero-cow.jpg";
import { CrownDoodle, CloudDoodle, StarDoodle } from "./DoodleOverlays";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image — full bleed, object-cover */}
      <div className="absolute inset-0">
        <img
          src={heroCow}
          alt="Krava na srpskom selu"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 via-transparent to-foreground/50" />
      </div>

      {/* Floating doodles */}
      <CrownDoodle className="absolute top-[16%] left-[12%] md:left-[16%] z-20 scale-75 md:scale-100" />
      <StarDoodle className="absolute top-[12%] right-[28%] z-20" />
      <StarDoodle className="absolute top-[40%] left-[5%] z-20 scale-125" />
      <CloudDoodle className="absolute top-[14%] right-[8%] z-20 opacity-80" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 mt-10">
        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-handwritten text-xl md:text-2xl text-primary mb-2 drop-shadow-lg"
        >
          ~ od srca do praga ~
        </motion.p>

        {/* Main title */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-black text-warm-white leading-none mb-2 hero-text-shadow">
            {"Mle\u010Dni"}{" "}
            <span className="font-handwritten text-primary italic text-7xl md:text-9xl lg:text-[10rem] drop-shadow-lg">
              put
            </span>
          </h1>
        </motion.div>

        {/* Slogan with marker highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mt-4 max-w-xl mx-auto"
        >
          <p className="font-handwritten text-xl md:text-3xl text-primary leading-relaxed drop-shadow-lg">
            <span className="marker-underline">{'"Uz pravo mleko nema straha,'}</span>
            <br />
            <span className="marker-underline">{"be\u017Eimo od mle\u010Dnog praha.\""}</span>
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="/partner"
            className="px-10 py-4 bg-primary text-primary-foreground font-body font-bold text-lg rounded-sm hover:scale-105 transition-transform shadow-lg inline-flex items-center gap-2"
          >
            Postani Partner <span className="text-xl">&#x1F91D;</span>
          </a>
          <a
            href="#story"
            className="px-10 py-4 border-2 border-foreground text-warm-white font-body font-bold text-lg rounded-sm hover:bg-warm-white hover:text-foreground transition-all inline-flex items-center gap-2"
          >
            {"Istra\u017Ei Pri\u010Du"} <span className="text-sm">&#x2193;</span>
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-warm-white/60 flex justify-center pt-2">
          <div className="w-1.5 h-3 rounded-full bg-warm-white/60" />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
