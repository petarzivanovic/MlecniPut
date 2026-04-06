import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollSection from "@/components/ScrollSection";
import WindingRoad from "@/components/WindingRoad";
import FloatingDoodles from "@/components/FloatingDoodles";
import { StarDoodle, HeartDoodle, CrownDoodle, ArrowDoodle } from "@/components/DoodleOverlays";
import farmerImg from "@/assets/baka-krave-1.jpg";
import landscapeImg from "@/assets/rural-landscape.jpg";
import heroCow from "@/assets/hero-cow.jpg";

const Farmeri = () => {
  return (
    <div className="relative">
      <Navbar />
      <WindingRoad />
      <FloatingDoodles />
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <img src={landscapeImg} alt="Srpski pašnjaci" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/50" />
        </div>
        <CrownDoodle className="absolute top-32 left-10 z-20 scale-150 hidden md:block" />
        <HeartDoodle className="absolute bottom-20 right-16 z-20 scale-125 hidden md:block" />
        <div className="relative z-10 text-center px-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-handwritten text-2xl text-primary"
          >
            ~ priča o ljudima iza mleka ~
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-5xl md:text-7xl font-black text-warm-white mt-2"
          >
            Naši Farmeri
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-body text-warm-white/70 mt-4 max-w-lg mx-auto text-lg"
          >
            Svaka kap mleka ima svoju priču. Upoznajte ljude koji ustaju u zoru da bi vaše jutro počelo pravim ukusom.
          </motion.p>
        </div>
      </section>

      {/* Story 1 */}
      <ScrollSection direction="left" className="bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img src={farmerImg} alt="Srpski farmer" className="rounded-2xl shadow-2xl w-full" loading="lazy" />
              <HeartDoodle className="absolute -top-4 -right-4 scale-125" />
              <StarDoodle className="absolute -bottom-3 -left-3" />
            </div>
            <div>
              <span className="font-handwritten text-2xl text-primary">Poglavlje 1</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                <span className="marker-underline">Ljudi koji su pobedili statistiku</span>
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-4">
                Srpsko selo se gasi. Mladi odlaze, stari ostaju sa kravama i praznim ambarima.
                Ali ima onih koji se bore. Farmeri koji veruju da pravo mleko ima budućnost,
                da poštena cena nije utopija, i da selo može da živi.
              </p>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-4">
                Platforma je nastala sa jednom jasnom misijom: da sačuvamo preostale heroje našeg stočarstva i vratimo pravo, netaknuto mleko na vaše trpeze.
              </p>
              <p className="font-handwritten text-xl text-earth-green">
                ✦ Svaki farmer ima ime, priču i dostojanstvo ✦
              </p>
            </div>
          </div>
        </div>
      </ScrollSection>

      {/* Story 2 */}
      <ScrollSection direction="right" className="bg-muted">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <span className="font-handwritten text-2xl text-primary">Poglavlje 2</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                <span className="marker-underline">Kako pomažemo selu?</span>
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-4">
                Mlečni put nije samo dostava mleka — to je pokret. Svaka litara koju kupite
                direktno podržava srpskog farmera. Bez posrednika, bez otkupnih stanica
                koje plaćaju manje od cene hrane za krave.
              </p>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-4">
                Trenutna otkupna cena sirovog mleka pala je na istorijski minimum od svega 49 dinara, što je često niže od cene flaširane vode.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                {["Fer cena", "Direktna isplata", "Bez posrednika", "Podrška zajednici"].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-primary/20 text-foreground font-body text-sm font-medium rounded-full border border-primary/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2 relative">
              <img src={landscapeImg} alt="Srpski pašnjaci" className="rounded-2xl shadow-2xl w-full" loading="lazy" />
              <ArrowDoodle className="absolute -bottom-8 right-8" />
            </div>
          </div>
        </div>
      </ScrollSection>

      {/* Story 3 — The Road */}
      <ScrollSection direction="left" className="bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img src={heroCow} alt="Krave na pašnjaku" className="rounded-2xl shadow-2xl w-full" loading="lazy" />
              <CrownDoodle className="absolute top-4 left-4 scale-110" />
            </div>
            <div>
              <span className="font-handwritten text-2xl text-primary">Poglavlje 3</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                <span className="marker-underline">Brzina koju priroda zaslužuje</span>
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-4">
                Industrijsko mleko na policama marketa često putuje danima i prolazi kroz agresivne procese obrade kako bi preživelo transport.
              </p>
              <p className="font-body text-lg text-muted-foreground leading-relaxed">
                Mleko se muze u zoru. Pre nego što sunce ogreje, naš vozač ga preuzima. Do podne je na vašem stolu — svežije nego u bilo kojoj prodavnici.
              </p>
            </div>
          </div>
        </div>
      </ScrollSection>

      {/* Community stats */}
      <section className="py-20 md:py-32 bg-accent text-accent-foreground">
        <div className="container mx-auto px-6 text-center">
          <StarDoodle className="mx-auto mb-4 scale-150" />
          <span className="font-handwritten text-2xl text-primary">Zajednica</span>
          <h2 className="font-display text-4xl md:text-6xl font-black mt-2 mb-12">
            Brojevi koji govore
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: "50+", label: "Farmera" },
              { num: "1200+", label: "Zadovoljnih kupaca" },
              { num: "3000+", label: "Litara dnevno" },
              { num: "10+", label: "Sela u mreži" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-4xl md:text-5xl font-black text-primary">{stat.num}</p>
                <p className="font-handwritten text-xl mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Farmeri;
