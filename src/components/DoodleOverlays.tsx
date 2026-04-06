import { motion } from "framer-motion";

export const CrownDoodle = ({ className = "" }: { className?: string }) => (
  <motion.svg
    className={`animate-float ${className}`}
    width="80"
    height="60"
    viewBox="0 0 80 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 50 L10 20 L25 35 L40 10 L55 35 L70 20 L70 50 Z"
      stroke="hsl(45, 90%, 63%)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="hsl(45, 90%, 63%)"
      fillOpacity="0.2"
    />
    <circle cx="10" cy="18" r="3" fill="hsl(45, 90%, 63%)" />
    <circle cx="40" cy="8" r="3" fill="hsl(45, 90%, 63%)" />
    <circle cx="70" cy="18" r="3" fill="hsl(45, 90%, 63%)" />
  </motion.svg>
);

export const HeartDoodle = ({ className = "" }: { className?: string }) => (
  <motion.svg
    className={`animate-float-delayed ${className}`}
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20 35 C10 25 2 18 2 12 C2 6 7 2 12 2 C16 2 19 5 20 7 C21 5 24 2 28 2 C33 2 38 6 38 12 C38 18 30 25 20 35Z"
      stroke="hsl(0, 70%, 55%)"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="hsl(0, 70%, 55%)"
      fillOpacity="0.15"
    />
  </motion.svg>
);

export const CloudDoodle = ({ className = "" }: { className?: string }) => (
  <motion.svg
    className={`animate-float-slow ${className}`}
    width="100"
    height="50"
    viewBox="0 0 100 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20 40 Q5 40 5 30 Q5 22 15 20 Q12 10 25 8 Q35 5 42 12 Q48 5 58 8 Q68 10 68 18 Q78 16 82 22 Q90 25 88 32 Q90 40 78 40 Z"
      stroke="hsl(var(--foreground))"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      strokeDasharray="4 3"
    />
  </motion.svg>
);

export const StarDoodle = ({ className = "" }: { className?: string }) => (
  <motion.svg
    className={`animate-wiggle ${className}`}
    width="30"
    height="30"
    viewBox="0 0 30 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 2 L18 11 L28 11 L20 18 L23 28 L15 22 L7 28 L10 18 L2 11 L12 11 Z"
      stroke="hsl(45, 90%, 63%)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="hsl(45, 90%, 63%)"
      fillOpacity="0.3"
    />
  </motion.svg>
);

export const SunglassesDoodle = ({ className = "" }: { className?: string }) => (
  <motion.svg
    className={`${className}`}
    width="90"
    height="40"
    viewBox="0 0 90 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="25" cy="22" rx="18" ry="14" stroke="hsl(var(--foreground))" strokeWidth="3" fill="hsl(var(--foreground))" fillOpacity="0.7" />
    <ellipse cx="65" cy="22" rx="18" ry="14" stroke="hsl(var(--foreground))" strokeWidth="3" fill="hsl(var(--foreground))" fillOpacity="0.7" />
    <path d="M43 20 Q45 16 47 20" stroke="hsl(var(--foreground))" strokeWidth="3" fill="none" />
    <path d="M7 18 Q2 14 0 10" stroke="hsl(var(--foreground))" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M83 18 Q88 14 90 10" stroke="hsl(var(--foreground))" strokeWidth="3" fill="none" strokeLinecap="round" />
  </motion.svg>
);

export const ScribbleCircle = ({ className = "" }: { className?: string }) => (
  <motion.svg
    className={`${className}`}
    width="120"
    height="60"
    viewBox="0 0 120 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse
      cx="60"
      cy="30"
      rx="55"
      ry="25"
      stroke="hsl(45, 90%, 63%)"
      strokeWidth="2.5"
      fill="none"
      strokeDasharray="6 4"
      transform="rotate(-3 60 30)"
    />
  </motion.svg>
);

export const ArrowDoodle = ({ className = "" }: { className?: string }) => (
  <motion.svg
    className={`animate-float ${className}`}
    width="60"
    height="80"
    viewBox="0 0 60 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M30 5 Q25 30 35 50 Q38 58 30 75"
      stroke="hsl(var(--foreground))"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M20 65 L30 75 L40 65"
      stroke="hsl(var(--foreground))"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);
