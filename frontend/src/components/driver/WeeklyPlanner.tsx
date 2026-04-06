import { motion } from "framer-motion";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import { sr } from "date-fns/locale";

interface WeeklyPlannerProps {
  scheduledDays: string[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const WeeklyPlanner = ({ scheduledDays, selectedDate, onSelectDate }: WeeklyPlannerProps) => {
  const today = startOfToday();
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="mb-8 p-5 rounded-2xl bg-card border-2 border-border">
      <h2 className="font-display text-xl font-bold text-foreground mb-1">Nedeljni Planer</h2>
      <p className="font-handwritten text-lg text-primary mb-4">~ izaberi dan za rutu ~</p>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {next7Days.map((date) => {
          const dayKey = DAY_MAP[date.getDay()];
          const isScheduled = scheduledDays.includes(dayKey);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);

          return (
            <motion.button
              key={date.toISOString()}
              whileTap={{ scale: 0.93 }}
              onClick={() => onSelectDate(date)}
              className={`flex-shrink-0 w-[72px] p-3 rounded-xl border-2 text-center transition-all ${
                isSelected
                  ? "border-primary bg-primary/15 ring-2 ring-primary/40 shadow-lg"
                  : isScheduled
                  ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                {format(date, "EEE", { locale: sr })}
              </p>
              <p className={`font-display text-xl font-black mt-0.5 ${
                isSelected ? "text-primary" : "text-foreground"
              }`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {format(date, "dd")}
              </p>
              <p className="font-body text-[9px] text-muted-foreground">
                {format(date, "MMM", { locale: sr })}
              </p>
              {isScheduled && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto">
                    <circle cx="8" cy="8" r="6" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="3 2" fill="hsl(var(--primary))" fillOpacity="0.25" />
                  </svg>
                </motion.div>
              )}
              {isToday && (
                <p className="font-handwritten text-[9px] text-primary mt-0.5">danas</p>
              )}
            </motion.button>
          );
        })}
      </div>

      {scheduledDays.length === 0 && (
        <p className="font-body text-sm text-muted-foreground text-center mt-4">
          Dispečer još nije dodelio radne dane.
        </p>
      )}
    </div>
  );
};

export default WeeklyPlanner;
