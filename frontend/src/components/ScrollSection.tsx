import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface ScrollSectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  direction?: "left" | "right";
}

const ScrollSection = ({ id, children, className = "", direction = "left" }: ScrollSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      id={id}
      ref={ref}
      className={`py-20 md:py-32 ${className}`}
      initial={{ opacity: 0, x: direction === "left" ? -60 : 60 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
};

export default ScrollSection;
