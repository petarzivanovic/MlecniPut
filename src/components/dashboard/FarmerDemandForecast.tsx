import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CrownDoodle, StarDoodle, CloudDoodle, HeartDoodle } from "../DoodleOverlays";

interface ForecastDay {
  day: string;
  liters: number;
}

interface PredictResponse {
  weekly_forecast: ForecastDay[];
  farmer_message: string;
  peak_day: string;
}

const DAY_LABELS: Record<string, string> = {
  monday: "Ponedeljak",
  tuesday: "Utorak",
  wednesday: "Sreda",
  thursday: "Četvrtak",
  friday: "Petak",
  saturday: "Subota",
  sunday: "Nedelja",
};

const getTrend = (liters: number, max: number) => {
  const pct = liters / max;
  if (pct >= 0.7) return { label: "Visok", color: "text-secondary bg-secondary/15" };
  if (pct >= 0.4) return { label: "Srednji", color: "text-primary bg-primary/15" };
  return { label: "Nizak", color: "text-muted-foreground bg-muted" };
};

const FarmerDemandForecast = () => {
  const [data, setData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke("predict-demand");
        if (fnErr) throw fnErr;
        const payload = fnData?.prediction || fnData;
        if (payload?.weekly_forecast && Array.isArray(payload.weekly_forecast)) {
          setData(payload);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse p-6 rounded-2xl bg-card border-2 border-border h-48" />
        <div className="animate-pulse p-6 rounded-2xl bg-card border-2 border-border h-24" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-card border-2 border-border text-center">
        <p className="font-body text-sm text-muted-foreground">
          ⚠️ Nije moguće učitati predikciju potražnje. Pokušajte ponovo kasnije.
        </p>
      </div>
    );
  }

  const maxLiters = Math.max(...data.weekly_forecast.map((d) => d.liters), 1);
  const peakLabel = DAY_LABELS[data.peak_day?.toLowerCase()] || data.peak_day;

  return (
    <div className="space-y-6">
      {/* Section 1: Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-card border-2 border-border relative overflow-hidden"
      >
        {/* Animated doodle stickers */}
        <div className="absolute inset-0 pointer-events-none">
          <StarDoodle className="absolute top-2 right-4 scale-75 opacity-20" />
          <CloudDoodle className="absolute -bottom-2 right-8 scale-50 opacity-15" />
          <HeartDoodle className="absolute top-12 -left-1 scale-50 opacity-15" />
        </div>

        <div className="relative z-[1]">
          <h3 className="font-display text-xl font-bold text-foreground mb-1">
            📊 Potražnja po danima
          </h3>
          <p className="font-handwritten text-base text-primary mb-4">~ šta kupci traže ove nedelje ~</p>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-body text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Dan</th>
                  <th className="text-right font-body text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Litri</th>
                  <th className="text-center font-body text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.weekly_forecast.map((item, i) => {
                  const trend = getTrend(item.liters, maxLiters);
                  const isPeak = item.day.toLowerCase() === data.peak_day?.toLowerCase();
                  return (
                    <motion.tr
                      key={item.day}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`border-t border-border ${isPeak ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`font-body text-sm ${isPeak ? "font-bold text-foreground" : "text-foreground"}`}>
                          {DAY_LABELS[item.day.toLowerCase()] || item.day}
                          {isPeak && <span className="ml-2 text-primary">★</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-display text-base font-black text-foreground">{item.liters}L</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-body font-bold ${trend.color}`}>
                          {trend.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Section 2: Farmer recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-6 rounded-2xl bg-primary/10 border-2 border-primary/25 relative overflow-hidden"
      >
        {/* Animated doodle stickers */}
        <div className="absolute inset-0 pointer-events-none">
          <CrownDoodle className="absolute -top-2 right-6 scale-50 opacity-25" />
          <StarDoodle className="absolute bottom-2 left-4 scale-75 opacity-20" />
        </div>

        <div className="relative z-[1]">
          <h3 className="font-display text-xl font-bold text-foreground mb-2">
            ⚠️ Preporuka za pripremu
          </h3>
          <p className="font-body text-sm text-foreground leading-relaxed">
            {data.farmer_message || "Pripremite dovoljne količine mleka za narednu nedelju."}
          </p>
          <div className="mt-4 p-3 rounded-xl bg-card/60 border border-primary/20 text-center">
            <p className="font-body text-xs text-muted-foreground">Najtraženiji dan</p>
            <p className="font-display text-2xl font-black text-primary uppercase tracking-wide mt-1">
              {peakLabel}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FarmerDemandForecast;
