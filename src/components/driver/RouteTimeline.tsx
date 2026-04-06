import { motion } from "framer-motion";

interface RouteStop {
  type: string;
  name: string;
  address: string;
  liters: number;
  time: string;
}

interface RouteTimelineProps {
  route: RouteStop[];
  completedStops: Set<number>;
  onToggleStop: (index: number) => void;
  dateLabel: string;
}

const isPickup = (type: string) =>
  type?.toLowerCase().includes("pickup") ||
  type?.toLowerCase().includes("farmer") ||
  type?.toLowerCase().includes("preuzimanje");

const RouteTimeline = ({ route, completedStops, onToggleStop, dateLabel }: RouteTimelineProps) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
    {/* Route header */}
    <div className="text-center mb-6">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" className="mx-auto mb-2">
          <circle cx="25" cy="25" r="22" stroke="hsl(120, 25%, 30%)" strokeWidth="2.5" strokeDasharray="6 4" fill="hsl(120, 25%, 30%)" fillOpacity="0.1" />
          <path d="M15 25 L22 32 L35 19" stroke="hsl(120, 25%, 30%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </motion.div>
      <h3 className="font-display text-xl font-bold text-foreground">Ruta je spremna!</h3>
      <p className="font-handwritten text-lg text-primary">~ {route.length} stanica za {dateLabel} ~</p>
      <p className="font-body text-xs text-muted-foreground mt-1">
        {completedStops.size}/{route.length} završeno
      </p>
    </div>

    {/* Winding road connector */}
    <div className="flex justify-center mb-4">
      <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
        <path d="M20 0 Q30 15 10 25 Q0 35 20 50" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray="5 4" fill="none" />
      </svg>
    </div>

    {/* Vertical timeline */}
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-0.5">
        <svg width="6" height="100%" className="absolute left-[-2px]" preserveAspectRatio="none">
          <line x1="3" y1="0" x2="3" y2="100%" stroke="hsl(45, 90%, 63%)" strokeWidth="3" strokeDasharray="8 6" />
        </svg>
      </div>

      {route.map((stop, i) => {
        const pickup = isPickup(stop.type);
        const completed = completedStops.has(i);

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="relative mb-6 last:mb-0"
          >
            <div className="absolute -left-5 top-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle
                  cx="11" cy="11" r="9"
                  stroke={pickup ? "hsl(120, 40%, 45%)" : "hsl(200, 70%, 50%)"}
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  fill={completed ? (pickup ? "hsl(120, 40%, 45%)" : "hsl(200, 70%, 50%)") : "hsl(var(--background))"}
                  fillOpacity={completed ? 0.3 : 1}
                />
                {completed && (
                  <path d="M7 11 L10 14 L15 8" stroke={pickup ? "hsl(120, 40%, 45%)" : "hsl(200, 70%, 50%)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                )}
              </svg>
            </div>

            <div
              className={`p-4 rounded-2xl border-2 transition-all ${
                completed
                  ? "opacity-60 border-muted bg-muted/20"
                  : pickup
                  ? "border-[hsl(120,40%,45%)]/40 bg-[hsl(120,40%,45%)]/5"
                  : "border-[hsl(200,70%,50%)]/40 bg-[hsl(200,70%,50%)]/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-xs font-bold border ${
                    pickup
                      ? "border-[hsl(120,40%,45%)]/50 text-[hsl(120,40%,45%)]"
                      : "border-[hsl(200,70%,50%)]/50 text-[hsl(200,70%,50%)]"
                  }`}
                >
                  {pickup ? "🌾 Preuzimanje" : "🏠 Dostava"}
                </span>
                <span className="font-body text-sm font-bold text-foreground">{stop.time}</span>
              </div>

              <h4 className={`font-display text-base font-bold text-foreground ${completed ? "line-through decoration-2 decoration-primary" : ""}`}>
                {stop.name}
              </h4>
              <p className="font-body text-xs text-muted-foreground mt-0.5">{stop.address}</p>

              <div className="flex items-center justify-between mt-3">
                <span className="font-handwritten text-lg text-primary">{stop.liters}L 🥛</span>
                <button
                  onClick={() => onToggleStop(i)}
                  className={`px-3 py-1.5 rounded-xl font-body text-xs font-bold border-2 transition-all ${
                    completed
                      ? "border-muted text-muted-foreground bg-muted/30 hover:bg-muted/50"
                      : "border-secondary/50 text-secondary bg-secondary/10 hover:bg-secondary/20"
                  }`}
                >
                  {completed ? "↩ Vrati" : "✓ Završeno"}
                </button>
              </div>

              {!completed && stop.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 font-body text-xs text-primary hover:underline"
                >
                  📍 Otvori u Google Maps
                </a>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>

    {completedStops.size === route.length && route.length > 0 && (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-8 p-6 rounded-2xl bg-secondary/10 border-2 border-secondary/30 text-center"
      >
        <motion.p animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: 3 }} className="text-4xl mb-2">🎉</motion.p>
        <h3 className="font-display text-xl font-bold text-foreground">Sve isporuke završene!</h3>
        <p className="font-handwritten text-lg text-secondary mt-1">Odlično obavljen posao 🚛✨</p>
      </motion.div>
    )}
  </motion.div>
);

export default RouteTimeline;
