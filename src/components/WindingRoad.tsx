import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const WindingRoad = () => {
  const { scrollYProgress } = useScroll();
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="fixed left-4 md:left-10 top-0 h-screen z-30 pointer-events-none hidden lg:block opacity-15">
      <svg
        width="60"
        height="100%"
        viewBox="0 0 60 800"
        fill="none"
        preserveAspectRatio="none"
        className="h-full"
      >
        <motion.path
          d="M30 0 Q50 100 20 200 Q0 300 40 400 Q60 500 20 600 Q0 700 30 800"
          stroke="hsl(45, 90%, 63%)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="8 6"
          style={{ pathLength }}
        />
        {/* Milestone dots */}
        <motion.circle cx="30" cy="0" r="5" fill="hsl(45, 90%, 63%)" />
        <motion.circle cx="20" cy="200" r="5" fill="hsl(120, 25%, 30%)" opacity={0.7} />
        <motion.circle cx="40" cy="400" r="5" fill="hsl(45, 90%, 63%)" />
        <motion.circle cx="20" cy="600" r="5" fill="hsl(120, 25%, 30%)" opacity={0.7} />
        <motion.circle cx="30" cy="800" r="5" fill="hsl(45, 90%, 63%)" />
      </svg>
    </div>
  );
};

export default WindingRoad;
