import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollSection from "@/components/ScrollSection";
import FloatingDoodles from "@/components/FloatingDoodles";
import { StarDoodle, HeartDoodle, ScribbleCircle } from "@/components/DoodleOverlays";
import milkImg from "@/assets/milk-pour.jpg";
import farmerImg from "@/assets/baka-krave-2.jpg";
import heroCow from "@/assets/hero-cow.jpg";

const plans = [
  {
    name: "Mali potrošač",
    type: "mali_potrosac",
    liters: "16L / mesečno",
    price: "2.080",
    days: "2 dana dostave",
    emoji: "🥛",
    description: "Za one koji vole lagano — idealno za solo život ili parove koji cene kvalitet.",
    color: "from-primary/20 to-primary/5",
  },
  {
    name: "Porodični standard",
    type: "porodicni_standard",
    liters: "32L / mesečno",
    price: "4.000",
    days: "2 dana dostave",
    emoji: "🏡",
    description: "Cela porodica sita, mama mirna. Dovoljno mleka za kafu, musli i večernji čaj.",
    color: "from-secondary/30 to-secondary/10",
  },
  {
    name: "Zdravo detinjstvo",
    type: "zdravo_detinjstvo",
    liters: "48L / mesečno",
    price: "5.760",
    days: "3 dana dostave",
    emoji: "👶",
    description: "Za decu koja rastu zdravo uz pravo mleko. Premium plan za porodice sa decom.",
    color: "from-earth-green/20 to-earth-green/5",
  },
];

const Proizvodi = () => {
  return (
    <div className="relative">
      <Navbar />
      <FloatingDoodles />

      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <img src={milkImg} alt="Sveže mleko" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/60" />
        </div>
        <div className="relative z-10 text-center px-6">
          <StarDoodle className="mx-auto mb-4 scale-150" />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-handwritten text-2xl text-primary"
          >
            ~ naša ponuda ~
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-5xl md:text-7xl font-black text-warm-white mt-2"
          >
            Proizvodi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-body text-warm-white/70 mt-4 max-w-md mx-auto"
          >
            Sveže mleko, domaći kajmak, pravi jogurt — sve od naših farmera, direktno do vaših vrata.
          </motion.p>
        </div>
      </section>

      {/* Fresh Milk Section */}
      <ScrollSection direction="left" className="bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img src={heroCow} alt="Krava na pašnjaku" className="rounded-2xl shadow-2xl w-full" loading="lazy" />
              <HeartDoodle className="absolute -top-4 -right-4 scale-125" />
              <ScribbleCircle className="absolute -bottom-6 -left-6 opacity-50" />
            </div>
            <div>
              <span className="font-handwritten text-2xl text-primary">Glavna zvezda</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                <span className="marker-underline">Sveže mleko</span>
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-4">
                Pravo mleko, pomuzeno ujutru, isporučeno do vaših vrata istog dana.
                Bez prerade, bez hormona, bez kompromisa. Kao što su naše bake pile.
              </p>
              <p className="font-handwritten text-xl text-earth-green">
                ✦ 100% prirodno · Bez konzervansa · Sveže svaki dan ✦
              </p>
            </div>
          </div>
        </div>
      </ScrollSection>

      {/* Subscription Plans */}
      <section className="py-20 md:py-32 bg-muted">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="font-handwritten text-2xl text-primary">~ izaberi svoj ritam ~</span>
            <h2 className="font-display text-4xl md:text-6xl font-black text-foreground mt-2">
              Planovi pretplate
            </h2>
            <p className="font-body text-muted-foreground mt-4 max-w-lg mx-auto">
              Sveže mleko stiže do tebe po rasporedu koji ti odgovara. Bez ugovora — pauziraj kad hoćeš.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.type}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative group"
              >
                <div
                  className={`p-8 rounded-2xl bg-gradient-to-br ${plan.color} border-2 border-foreground/10 hover:border-primary/40 transition-all hover:shadow-xl`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%23333' stroke-width='2' stroke-dasharray='14%2C 8' stroke-dashoffset='0' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundSize: "100% 100%",
                  }}
                >
                  <div className="text-5xl mb-4">{plan.emoji}</div>
                  <h3 className="font-display text-2xl font-black text-foreground">{plan.name}</h3>
                  <p className="font-body text-muted-foreground text-sm mt-2 min-h-[3rem]">{plan.description}</p>

                  <div className="mt-6 space-y-1">
                    <p className="font-handwritten text-lg text-primary">{plan.liters}</p>
                    <p className="font-body text-xs text-muted-foreground">{plan.days} (Pon · Sre · Sub)</p>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-black text-primary">{plan.price}</span>
                    <span className="font-body text-sm text-muted-foreground">RSD/mes</span>
                  </div>

                  <Link
                    to="/auth?mode=signup"
                    className="mt-6 block w-full py-3 text-center bg-foreground text-warm-white font-body font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-md"
                  >
                    Izaberi ovaj plan ✏️
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* One-off */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto mt-12 p-6 rounded-2xl bg-card border-2 border-dashed border-primary/30 text-center"
          >
            <p className="text-3xl mb-2">🧐</p>
            <h3 className="font-display text-xl font-bold text-foreground">Ja bih samo da probam</h3>
            <p className="font-body text-muted-foreground text-sm mt-1">Minimum 3L, jedna dostava. Bez obaveze!</p>
            <p className="font-display text-2xl font-black text-primary mt-3">390 <span className="text-sm font-body text-muted-foreground">RSD</span></p>
            <Link
              to="/auth?mode=signup"
              className="mt-4 inline-block px-8 py-3 bg-primary text-primary-foreground font-body font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Probaj sad 🐄
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Add-ons showcase */}
      <ScrollSection direction="right" className="bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="font-handwritten text-2xl text-primary">Domaći dodaci</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                <span className="marker-underline">Više od mleka</span>
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-8">
                Uz svaku dostavu možeš dodati domaće proizvode naših farmera.
                Sir, kajmak, jogurt — sve provereno i sveže.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { emoji: "🧀", name: "Domaći sir" },
                  { emoji: "🫕", name: "Kajmak" },
                  { emoji: "🥛", name: "Jogurt" },
                ].map((item) => (
                  <div key={item.name} className="text-center p-4 rounded-xl bg-muted border border-border">
                    <p className="text-4xl mb-2">{item.emoji}</p>
                    <p className="font-body text-sm font-semibold text-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img src={farmerImg} alt="Domaći proizvodi" className="rounded-2xl shadow-2xl w-full" loading="lazy" />
              <StarDoodle className="absolute -top-4 right-8 scale-150" />
            </div>
          </div>
        </div>
      </ScrollSection>

      <Footer />
    </div>
  );
};

export default Proizvodi;
