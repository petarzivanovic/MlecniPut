import ScrollSection from "./ScrollSection";
import { ArrowDoodle, HeartDoodle, ScribbleCircle, StarDoodle } from "./DoodleOverlays";
import farmerImg from "@/assets/farmer.jpg";
import milkImg from "@/assets/milk-pour.jpg";
import landscapeImg from "@/assets/rural-landscape.jpg";

const StorySection = () => {
  return (
    <div className="relative">
      {/* Section 1 — Our Story */}
      <ScrollSection id="story" direction="left" className="bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src={farmerImg}
                alt="Srpski farmer"
                className="rounded-2xl shadow-2xl w-full object-fill"
                loading="lazy"
                width={800}
                height={1080}
              />
              <HeartDoodle className="absolute -top-4 -right-4 scale-125" />
              <StarDoodle className="absolute -bottom-3 -left-3" />
            </div>
            <div>
              <span className="font-handwritten text-primary font-semibold text-xl">Naša priča</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                <span className="marker-underline">Spasavamo srpsko selo, litar po litar.</span>
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-6">
                Broj krava u Srbiji drastično opada, a zvanična statistika pokazuje da preko 600 sela više nema nijednu kravu. Platforma je nastala sa jednom jasnom misijom: da sačuvamo preostale heroje našeg stočarstva i vratimo pravo, netaknuto mleko na vaše trpeze.
              </p>
              <p className="font-handwritten text-xl text-earth-green">
                ✦ Od farme do vašeg stola — bez posrednika ✦
              </p>
            </div>
          </div>
        </div>
      </ScrollSection>

      {/* Section 2 — How It Works */}
      <ScrollSection direction="right" className="bg-muted">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <span className="font-handwritten text-primary font-semibold text-xl">Mi nismo samo logistika, već zajednica koja vraća tradiciju.</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                Kako funkcionišemo?
              </h2>
              <div className="space-y-6">
                {[
                  { title: "Farmer muze kravu u zoru", desc: "Zaboravite na masovnu proizvodnju, naručuje se tačno onoliko koliko je potrebno! Time čuvamo stopostotnu svežinu i sprečavavamo rasipanje." },
                  { title: "Mleko se preuzima istog dana", desc: "Naša napredna tehnologija svakog jutra preračunava idealne rute kako bi mleko u najkraćem mogućem roku bilo preuzeto sa lokalnih gazdinstava." },
                  { title: "Vozač dostavlja do vaših vrata", desc: "Vođeni strogim vremenskim prozorima, vozači Vam mleko ostavljaju pravo na kućni prag." },
                  { title: "Vi uživate u svežem mleku", desc: "Potpuno domaće, neprerađeno i bogato nutrijentima – ukus zdravlja koji ste dugo tražili, a Vaše je samo da mleko prokuvate u prvih 24h!" }
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center font-display font-bold text-primary-foreground text-lg">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-body font-semibold text-foreground text-lg">{step.title}</p>
                      <p className="font-body text-muted-foreground text-sm mt-1">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2 relative">
              <img
                src={landscapeImg}
                alt="Srpsko selo — put dostave"
                className="rounded-2xl shadow-2xl w-full object-fill"
                loading="lazy"
                width={1920}
                height={1080}
              />
              <ScribbleCircle className="absolute -top-6 -left-6 opacity-60" />
              <ArrowDoodle className="absolute -bottom-8 right-8" />
            </div>
          </div>
        </div>
      </ScrollSection>

      {/* Section 3 — Quality */}
      <ScrollSection direction="left" className="bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src={milkImg}
                alt="Sveže mleko"
                className="rounded-2xl shadow-2xl w-full object-fill"
                loading="lazy"
                width={800}
                height={1080}
              />
              <StarDoodle className="absolute -top-4 right-8 scale-150" />
              <HeartDoodle className="absolute bottom-4 -left-4" />
            </div>
            <div>
              <span className="font-handwritten text-primary font-semibold text-xl">Kvalitet bez kompromisa</span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
                <span className="marker-underline">Zaboravite na mleko u prahu.</span>
              </h2>
              <p className="font-body text-lg text-muted-foreground leading-relaxed mb-6">
                Da li ste znali da Srbija samo u jednoj godini uveze i do 10.000 tona mleka u prahu koje završava u mlečnim proizvodima industrijskih giganata? Mi Vam donosimo vam 100% prirodno sirovo kravlje mleko sa seoskih pašnjaka, bez hormona, antibiotika i veštačkih procesa obogaćivanja. Pre nego što stigne do vas, svaka isporuka prolazi kroz višestruki sistem verifikacije koji rigorozno proverava sanitarne uslove i mikrobiološke potvrde farmera.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                {["100% Prirodno", "Bez hormona", "Sveže svaki dan", "Lokalno"].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-primary/20 text-foreground font-body text-sm font-medium rounded-full border border-primary/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollSection>

      {/* Section 4 — Community */}
      <ScrollSection direction="right" className="bg-accent text-accent-foreground">
        <div className="container mx-auto px-6 text-center">
          <StarDoodle className="mx-auto mb-4 scale-150" />
          <span className="font-handwritten text-primary font-semibold text-xl">Zajednica</span>
          <h2 className="font-display text-4xl md:text-6xl font-black mt-2 mb-8">
            Ne damo srpsko mleko!
          </h2>
          <p className="font-body text-lg text-accent-foreground/80 leading-relaxed max-w-3xl mx-auto mb-12">
            Ostvarujemo pravedniju zaradu za selo i bolji proizvod za gradsku porodicu. Vaša pretplata direktno oživljava seoska gazdinstva. Svaki višak mleka automatski preusmeravamo kao direktnu donaciju narodnim kuhinjama, bolnicama i vrtićima. 
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: "50+", label: "Farmera" },
              { num: "1200+", label: "Kupaca" },
              { num: "3000+", label: "Litara dnevno" },
              { num: "10+", label: "Sela" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-4xl md:text-5xl font-black text-primary">{stat.num}</p>
                <p className="font-handwritten text-xl mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollSection>
    </div>
  );
};

export default StorySection;
