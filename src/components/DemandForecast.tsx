import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CrownDoodle, StarDoodle, CloudDoodle, HeartDoodle } from "./DoodleOverlays";

interface ForecastDay {
  day: string;
  liters: number;
}

interface PredictResponse {
  weekly_forecast: ForecastDay[];
  customer_message: string;
  peak_day: string;
}

const DAY_LABELS: Record<string, string> = {
  monday: "Pon",
  tuesday: "Uto",
  wednesday: "Sre",
  thursday: "Čet",
  friday: "Pet",
  saturday: "Sub",
  sunday: "Ned",
};

const DemandForecast = () => {
  const [data, setData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndPredict = async () => {
      try {
        const { data: fnData, error } = await supabase.functions.invoke("predict-demand");

        if (error) {
          console.error("Edge function error:", error);
          return;
        }

        const payload = fnData?.prediction || fnData;
        if (payload?.weekly_forecast && Array.isArray(payload.weekly_forecast)) {
          setData(payload);
        }
      } catch (e) {
        console.error("Demand prediction error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAndPredict();
  }, []);

  if (loading) {
    return (
      <section className="py-20 md:py-32 bg-background relative overflow-hidden">
        <div className="container mx-auto px-6 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-border rounded mx-auto" />
            <div className="h-48 bg-border rounded-2xl max-w-2xl mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (!data || !Array.isArray(data.weekly_forecast) || data.weekly_forecast.length === 0) return null;

  const maxLiters = Math.max(...data.weekly_forecast.map((d) => d.liters), 1);

  return (
    <section className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Animated doodle stickers */}
      <div className="absolute inset-0 pointer-events-none">
        <CrownDoodle className="absolute top-6 left-[5%] scale-75 opacity-30" />
        <StarDoodle className="absolute top-10 right-[6%] scale-110 opacity-25" />
        <CloudDoodle className="absolute bottom-8 left-[8%] opacity-20" />
        <HeartDoodle className="absolute bottom-12 right-[4%] scale-90 opacity-25" />
        <StarDoodle className="absolute top-[40%] left-[2%] scale-75 opacity-20" />
        <CloudDoodle className="absolute top-[30%] right-[3%] scale-75 opacity-15" />
      </div>

      <div className="container mx-auto px-6 relative z-[1]">
        <div className="text-center mb-12">
          <span className="font-handwritten text-2xl text-primary">
            ~ predikcija ~
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mt-2">
            <span className="marker-underline">Potražnja ove nedelje</span>
          </h2>
        </div>

        {/* Bar chart */}
        <div className="max-w-2xl mx-auto bg-card rounded-2xl shadow-xl p-6 md:p-10 border-2 border-border relative">
          <div className="flex items-end justify-between gap-3 md:gap-6 h-56 md:h-64">
            {data.weekly_forecast.map((item, i) => {
              const pct = (item.liters / maxLiters) * 100;
              const isPeak =
                item.day.toLowerCase() === data.peak_day.toLowerCase();

              return (
                <div
                  key={item.day}
                  className="flex flex-col items-center flex-1 h-full justify-end"
                >
                  <motion.div
                    className={`w-full max-w-[48px] rounded-t-lg ${
                      isPeak ? "bg-primary" : "bg-secondary"
                    }`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.08,
                      ease: "easeOut",
                    }}
                  />
                  <span
                    className={`mt-2 font-data text-xs md:text-sm font-semibold ${
                      isPeak
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {DAY_LABELS[item.day.toLowerCase()] || item.day}
                  </span>
                  <span className="font-data text-[10px] md:text-xs text-muted-foreground">
                    {item.liters}L
                  </span>
                </div>
              );
            })}
          </div>

          {/* Peak badge */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-primary" />
            <span className="font-body text-sm text-muted-foreground">
              Najfrekventniji dan:{" "}
              <strong className="text-foreground">
                {DAY_LABELS[data.peak_day.toLowerCase()] || data.peak_day}
              </strong>
            </span>
          </div>
        </div>

        {/* Marketing message */}
        {data.customer_message && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center font-handwritten text-xl md:text-2xl text-foreground max-w-xl mx-auto"
          >
            "{data.customer_message}"
          </motion.p>
        )}
      </div>
    </section>
  );
};

export default DemandForecast;
