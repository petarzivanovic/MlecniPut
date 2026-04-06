import { motion } from "framer-motion";

const DayOffDoodle = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-8 rounded-2xl bg-card border-2 border-border text-center mb-8"
  >
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="text-5xl mb-4"
    >
      🥛
    </motion.div>
    <svg width="80" height="40" viewBox="0 0 80 40" fill="none" className="mx-auto mb-3">
      <path
        d="M10 35 Q20 5 40 20 Q60 35 70 10"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="10" cy="35" r="3" fill="hsl(var(--primary))" fillOpacity="0.4" />
      <circle cx="70" cy="10" r="3" fill="hsl(var(--primary))" fillOpacity="0.4" />
    </svg>
    <h3 className="font-display text-xl font-bold text-foreground">Danas si slobodan!</h3>
    <p className="font-handwritten text-lg text-primary mt-1">Odmori uz čašu hladnog mleka 🐄✨</p>
  </motion.div>
);

export default DayOffDoodle;
