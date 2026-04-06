import { motion } from "framer-motion";

const RouteLoadingAnimation = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="p-8 rounded-2xl bg-card border-2 border-primary/20 text-center mb-8"
  >
    <div className="relative h-24 mb-4 overflow-hidden">
      <svg width="100%" height="80" viewBox="0 0 300 80" fill="none" className="absolute bottom-0">
        <path d="M0 60 Q75 30 150 60 Q225 90 300 60" stroke="hsl(45, 90%, 63%)" strokeWidth="3" strokeDasharray="8 6" fill="none" />
      </svg>
      <motion.div
        animate={{ x: [0, 260] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-4 text-3xl"
      >
        🚛
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 right-4 text-2xl"
      >
        🥛
      </motion.div>
    </div>
    <p className="font-handwritten text-xl text-primary">AI optimizuje tvoju rutu...</p>
    <p className="font-body text-xs text-muted-foreground mt-1">Prikupljam podatke o farmerima i narudžbinama</p>
    <motion.div
      animate={{ width: ["0%", "100%"] }}
      transition={{ duration: 8, ease: "easeInOut" }}
      className="h-1.5 bg-primary rounded-full mt-4"
    />
  </motion.div>
);

export default RouteLoadingAnimation;
