import { StarDoodle, HeartDoodle, CloudDoodle, CrownDoodle } from "./DoodleOverlays";

/**
 * A set of floating animated doodles that can be placed on any page.
 * They are pointer-events-none so they don't block interaction.
 */
const FloatingDoodles = () => {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden hidden lg:block">
      {/* Right side doodles */}
      <StarDoodle className="absolute top-[25%] right-[3%] scale-110 opacity-30" />
      <HeartDoodle className="absolute top-[55%] right-[5%] scale-90 opacity-25" />
      <CloudDoodle className="absolute top-[75%] right-[2%] opacity-20" />

      {/* Left side doodles */}
      <CrownDoodle className="absolute top-[45%] left-[3%] scale-75 opacity-25" />
      <StarDoodle className="absolute top-[70%] left-[4%] scale-100 opacity-30" />
      <HeartDoodle className="absolute top-[15%] left-[5%] scale-75 opacity-20" />
    </div>
  );
};

export default FloatingDoodles;
