import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import landscapeImg from "@/assets/rural-landscape.jpg";
import { StarDoodle, HeartDoodle } from "@/components/DoodleOverlays";

const Partner = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const [formData, setFormData] = useState({
    bpg: "",
    jmbg: "",
    ime: "",
    adresa: "",
    kapacitet: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === "email") setExistingAccount(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bpg || !formData.jmbg || !formData.ime || !formData.adresa || !formData.kapacitet) {
      toast({ title: "Greška", description: "Sva polja su obavezna.", variant: "destructive" });
      return;
    }

    setLoading(true);
    let currentUserId = user?.id;
    let currentEmail = user?.email || formData.email;

    // If not logged in, handle auth
    if (!user) {
      if (!formData.email || !formData.password) {
        toast({ title: "Greška", description: "Email i lozinka su obavezni.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { display_name: formData.ime },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        // Check if user already exists
        if (signUpError.message?.includes("already registered") || signUpError.message?.includes("already been registered")) {
          setExistingAccount(true);
          setLoading(false);
          return;
        }
        toast({ title: "Greška", description: signUpError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // If signup returned a user with identities length 0, it means the user already exists
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        setExistingAccount(true);
        setLoading(false);
        return;
      }

      currentUserId = signUpData.user?.id;
      currentEmail = formData.email;
    }

    // Insert partner application
    const { error } = await supabase.from("partner_applications").insert({
      bpg: formData.bpg.trim(),
      jmbg: formData.jmbg.trim(),
      full_name: formData.ime.trim(),
      address: formData.adresa.trim(),
      capacity_liters_per_day: Number(formData.kapacitet),
      user_id: currentUserId || null,
      email: currentEmail || null,
    } as any);

    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Prijava poslata! 🎉", description: "Kontaktiraćemo vas u roku od 48h." });
    }
    setLoading(false);
  };

  return (
    <div className="relative">
      <Navbar />

      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-20">
        <div className="absolute inset-0">
          <img src={landscapeImg} alt="Srpsko selo" className="w-full h-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-foreground/50" />
        </div>

        <StarDoodle className="absolute top-32 left-10 z-20 scale-150 hidden md:block" />
        <HeartDoodle className="absolute bottom-20 right-10 z-20 scale-125 hidden md:block" />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-full max-w-xl mx-6"
        >
          <div className="glass-card rounded-3xl p-8 md:p-12">
            {submitted ? (
              <div className="text-center py-8">
                <p className="text-5xl mb-4">🐄</p>
                <h2 className="font-display text-3xl font-black text-warm-white">Prijava primljena!</h2>
                <p className="font-body text-warm-white/70 mt-3">Kontaktiraćemo vas u roku od 48 sati.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <span className="font-handwritten text-2xl text-primary">Misija za tebe</span>
                  <h1 className="font-display text-3xl md:text-4xl font-black text-warm-white mt-2">Postani Partner</h1>
                  <p className="font-body text-warm-white/70 mt-3 text-sm">
                    Popuni formular ispod i pridruži se mreži mlekara koja menja način na koji Srbija pije mleko.
                  </p>
                  {!user && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5"
                    >
                      <p className="font-handwritten text-base text-primary">
                        ✏️ Kreiraćemo ti nalog automatski kako bi mogao da pratiš status svoje prijave!
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Existing account notification */}
                {existingAccount && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 p-4 rounded-2xl border-2 border-dashed border-primary bg-primary/10"
                  >
                    <div className="flex items-start gap-3">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="flex-shrink-0 mt-1">
                        <circle cx="16" cy="16" r="14" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray="4 3" fill="hsl(var(--primary))" fillOpacity="0.15" />
                        <text x="16" y="22" textAnchor="middle" fill="hsl(var(--primary))" fontSize="18" fontWeight="bold">!</text>
                      </svg>
                      <div>
                        <p className="font-handwritten text-lg text-primary">
                          Već imaš nalog kod nas!
                        </p>
                        <p className="font-body text-sm text-warm-white/70 mt-1">
                          Molimo te,{" "}
                          <Link to="/auth" className="text-primary font-bold underline hover:text-primary/80 transition-colors">
                            Prijavi se
                          </Link>{" "}
                          pre nego što pošalješ prijavu za farmera.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Auth fields for guests */}
                  {!user && (
                    <>
                      <div>
                        <label className="font-handwritten text-lg text-primary block mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="vas@email.com"
                          required
                          className="w-full px-4 py-3 rounded-xl bg-warm-white/10 border border-warm-white/20 text-warm-white placeholder:text-warm-white/40 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="font-handwritten text-lg text-primary block mb-1">Lozinka</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="w-full px-4 py-3 rounded-xl bg-warm-white/10 border border-warm-white/20 text-warm-white placeholder:text-warm-white/40 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                    </>
                  )}

                  {user && (
                    <div className="p-3 rounded-xl border border-primary bg-inherit">
                      <p className="font-handwritten text-base text-primary">
                        ✓ Prijavljeni ste kao {user.email}
                      </p>
                    </div>
                  )}

                  {[
                    { label: "BPG", name: "bpg", type: "text", placeholder: "Broj poljoprivrednog gazdinstva" },
                    { label: "JMBG", name: "jmbg", type: "text", placeholder: "Jedinstveni matični broj" },
                    { label: "Ime i Prezime", name: "ime", type: "text", placeholder: "Vaše puno ime" },
                    { label: "Adresa", name: "adresa", type: "text", placeholder: "Adresa farme" },
                    { label: "Kapacitet (litara/dan)", name: "kapacitet", type: "number", placeholder: "Dnevni kapacitet mleka" },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="font-handwritten text-lg text-primary block mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={formData[field.name as keyof typeof formData]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl bg-warm-white/10 border border-warm-white/20 text-warm-white placeholder:text-warm-white/40 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-primary-foreground font-body font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform mt-4 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Šalje se..." : "Pošalji prijavu 🐄"}
                  </button>
                </form>

                <p className="font-body text-warm-white/40 text-xs text-center mt-6">
                  Vaši podaci su zaštićeni. Kontaktiraćemo vas u roku od 48h.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Partner;
