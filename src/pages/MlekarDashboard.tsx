import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WindingRoad from "@/components/WindingRoad";
import { StarDoodle } from "@/components/DoodleOverlays";
import FarmerDemandForecast from "@/components/dashboard/FarmerDemandForecast";

const DAYS = [
  { label: "Ponedeljak", value: "monday" },
  { label: "Utorak", value: "tuesday" },
  { label: "Sreda", value: "wednesday" },
  { label: "Četvrtak", value: "thursday" },
  { label: "Petak", value: "friday" },
  { label: "Subota", value: "saturday" },
  { label: "Nedelja", value: "sunday" },
];

const MlekarDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dailyOffers, setDailyOffers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchApplication();
    fetchDailyOffers();
  }, [user]);

  const fetchDailyOffers = async () => {
    const { data } = await supabase
      .from("farmer_daily_offers")
      .select("day_of_week, liters")
      .eq("user_id", user!.id);
    if (data) {
      const offers: Record<string, string> = {};
      data.forEach((row: any) => {
        offers[row.day_of_week] = String(row.liters);
      });
      setDailyOffers(offers);
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const fetchApplication = async () => {
    const { data } = await supabase
      .from("partner_applications")
      .select("status")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setApplicationStatus(data.status);
  };

  const handleLiterChange = (day: string, value: string) => {
    setDailyOffers((prev) => ({ ...prev, [day]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const entries = DAYS.map((day) => ({
      user_id: user!.id,
      day_of_week: day.value,
      liters: Number(dailyOffers[day.value]) || 0,
    }));

    // Upsert each day
    for (const entry of entries) {
      const { error } = await supabase
        .from("farmer_daily_offers")
        .upsert(entry, { onConflict: "user_id,day_of_week" });
      if (error) {
        toast({ title: "Greška", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({
      title: "Ponuda sačuvana! ⭐",
      description: "Vaša dnevna ponuda mleka je ažurirana.",
    });
    setSaving(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="font-handwritten text-2xl text-primary">
          Učitavanje... 🐄
        </motion.p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />
      <WindingRoad />

      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-handwritten text-xl text-primary">~ mlekar na misiji ~</p>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground">
              Moj Dashboard
            </h1>
          </div>
          <button onClick={signOut} className="px-5 py-2 border-2 border-border text-muted-foreground font-body text-sm rounded-lg hover:bg-muted transition-colors">
            Odjavi se
          </button>
        </div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-card border-2 border-border"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
              <span className="text-4xl">🐄</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {profile?.display_name || user?.email}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-body font-bold ${
                  applicationStatus === "approved"
                    ? "bg-secondary/20 text-secondary"
                    : applicationStatus === "pending"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {applicationStatus === "approved" ? "Odobren Mlekar 👑" : applicationStatus === "pending" ? "Na čekanju..." : "Status nepoznat"}
                </span>
              </div>
            </div>
            {applicationStatus === "approved" && (
              <div className="ml-auto hidden md:block">
                <StarDoodle className="w-12 h-12" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Demand Forecast Section - top */}
        <div className="mb-8">
          <p className="font-handwritten text-xl text-primary mb-4">~ predikcija potražnje za narednu nedelju ~</p>
          <FarmerDemandForecast />
        </div>

        {/* Daily Offer Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-2xl bg-card border-2 border-dashed border-primary/30"
        >
          <div className="mb-6">
            <h3 className="font-display text-xl font-bold text-foreground">Dnevna Ponuda</h3>
            <p className="font-handwritten text-lg text-primary mt-1">~ koliko litara možeš da ponudiš? ~</p>
          </div>

          <div className="space-y-3">
            {DAYS.map((day, i) => (
              <motion.div
                key={day.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-32 flex-shrink-0">
                  <p className="font-body font-bold text-sm text-foreground">{day.label}</p>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={dailyOffers[day.value] || ""}
                    onChange={(e) => handleLiterChange(day.value, e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="font-handwritten text-primary text-base flex-shrink-0">litara</span>
                </div>
                {dailyOffers[day.value] && Number(dailyOffers[day.value]) > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="hsl(var(--secondary))" strokeWidth="2" strokeDasharray="3 2" fill="hsl(var(--secondary))" fillOpacity="0.15" />
                      <path d="M8 12 L11 15 L16 9" stroke="hsl(var(--secondary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-4 bg-primary text-primary-foreground font-body font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50"
            >
              {saving ? "Čuvanje..." : "Sačuvaj ponudu ⭐"}
            </button>
            <div className="text-right">
              <p className="font-handwritten text-base text-primary">Ukupno:</p>
              <p className="font-display text-2xl font-black text-foreground">
                {Object.values(dailyOffers).reduce((sum, v) => sum + (Number(v) || 0), 0)}L
              </p>
            </div>
          </div>
        </motion.div>

      </div>

      <Footer />
    </div>
  );
};

export default MlekarDashboard;
