import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CrownDoodle, StarDoodle, CloudDoodle, HeartDoodle } from "../DoodleOverlays";

const DAY_LABELS: Record<string, string> = {
  monday: "Ponedeljak",
  tuesday: "Utorak",
  wednesday: "Sreda",
  thursday: "Četvrtak",
  friday: "Petak",
  saturday: "Subota",
  sunday: "Nedelja",
};

const DAY_SHORT: Record<string, string> = {
  monday: "Pon",
  tuesday: "Uto",
  wednesday: "Sre",
  thursday: "Čet",
  friday: "Pet",
  saturday: "Sub",
  sunday: "Ned",
};

interface ForecastDay {
  day: string;
  liters: number;
}

interface PredictResponse {
  weekly_forecast?: ForecastDay[];
  customer_message: string;
  customer_prediction?: string;
  peak_day: string;
}

const WeeklyRecommendation = () => {
  const [data, setData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke("predict-demand");
        if (fnErr) throw fnErr;
        const payload = fnData?.prediction || fnData;
        if (payload?.peak_day) {
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
      <div className="animate-pulse p-6 rounded-2xl bg-card border-2 border-border h-40" />
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-card border-2 border-border text-center">
        <p className="font-body text-sm text-muted-foreground">
          ⚠️ Nije moguće učitati preporuke. Pokušaj ponovo kasnije.
        </p>
      </div>
    );
  }

  const forecast = data.weekly_forecast || [];
  const maxLiters = forecast.length > 0 ? Math.max(...forecast.map((f) => f.liters), 1) : 1;

  const peakDayLabel = DAY_LABELS[data.peak_day.toLowerCase()] || data.peak_day;
  const message = `📦 Potražnja u ${peakDayLabel.toLowerCase()} sledeće nedelje će biti najveća — poručite vaše zalihe na vreme!`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border-2 border-border p-6 relative overflow-hidden"
      style={{ borderLeftWidth: "4px", borderLeftColor: "hsl(30, 90%, 55%)" }}
    >
      {/* Animated doodle stickers */}
      <div className="absolute inset-0 pointer-events-none">
        <CrownDoodle className="absolute -top-1 -right-2 scale-50 opacity-20" />
        <StarDoodle className="absolute bottom-2 right-4 scale-75 opacity-20" />
        <HeartDoodle className="absolute top-1 left-[60%] scale-50 opacity-15" />
        <CloudDoodle className="absolute -bottom-2 left-2 scale-50 opacity-15" />
      </div>

      <div className="relative z-[1]">
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>

        {forecast.length > 0 && (
          <div className="flex items-end justify-between gap-2 h-24 mt-4">
            {forecast.map((item, i) => {
              const pct = (item.liters / maxLiters) * 100;
              const isPeak = item.day.toLowerCase() === data.peak_day.toLowerCase();
              return (
                <div key={item.day} className="flex flex-col items-center flex-1 h-full justify-end">
                  <motion.div
                    className="w-full max-w-[32px] rounded-t-md"
                    style={{ backgroundColor: isPeak ? "hsl(30, 90%, 55%)" : "hsl(var(--muted))" }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct, 5)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                  <span
                    className="mt-1 text-[10px] font-semibold"
                    style={{ color: isPeak ? "hsl(30, 90%, 55%)" : undefined }}
                  >
                    {DAY_SHORT[item.day.toLowerCase()] || item.day}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WeeklyRecommendation;
