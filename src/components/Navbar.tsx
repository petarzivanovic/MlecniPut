import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardPath, setDashboardPath] = useState("/dashboard");
  const [userRole, setUserRole] = useState<string | null>(null);

  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showShadow = !isHome || scrolled;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const role = data?.role;
        setUserRole(role || null);
        if (role === "dispecer") setDashboardPath("/dashboard/dispecer");
        else if (role === "vozac") setDashboardPath("/dashboard/vozac");
        else if (role === "mlekar") setDashboardPath("/dashboard/mlekar");
        else setDashboardPath("/dashboard");
      });
  }, [user]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showShadow
          ? "bg-foreground/90 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1">
          <span className="font-display text-xl font-bold text-warm-white">Mlečni</span>
          <span className="font-handwritten text-2xl text-primary italic">put</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/#story" className="font-handwritten text-lg text-warm-white/80 hover:text-warm-white transition-colors italic">
            Priča
          </Link>
          <Link to="/proizvodi" className="font-handwritten text-lg text-warm-white/80 hover:text-warm-white transition-colors italic">
            Proizvodi
          </Link>
          <Link to="/farmeri" className="font-handwritten text-lg text-warm-white/80 hover:text-warm-white transition-colors italic">
            Farmeri
          </Link>

          {user ? (
            <div className="flex items-center gap-3 ml-2">
              <Link
                to={dashboardPath}
                className="px-6 py-2.5 bg-primary text-foreground font-body font-bold text-sm rounded-sm hover:scale-105 transition-transform"
              >
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="px-4 py-2 border border-warm-white/30 text-warm-white/70 font-body text-sm rounded-sm hover:bg-warm-white/10 transition-colors"
              >
                Odjavi se
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-2">
              <Link
                to="/auth"
                className="px-5 py-2 border border-warm-white/40 text-warm-white font-body font-semibold text-sm rounded-sm hover:bg-warm-white/10 transition-colors"
              >
                Prijavi se
              </Link>
              <Link
                to="/auth?mode=signup"
                className="px-5 py-2 bg-primary text-foreground font-body font-bold text-sm rounded-sm hover:scale-105 transition-transform"
              >
                Registruj se
              </Link>
              <Link
                to="/partner"
                className="px-5 py-2 bg-primary text-foreground font-body font-bold text-sm rounded-sm hover:scale-105 transition-transform border-2 border-foreground/20"
              >
                Postani Partner
              </Link>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-warm-white"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-foreground/95 backdrop-blur-md"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              <Link to="/#story" onClick={() => setIsOpen(false)} className="font-handwritten text-lg text-warm-white italic">Priča</Link>
              <Link to="/proizvodi" onClick={() => setIsOpen(false)} className="font-handwritten text-lg text-warm-white italic">Proizvodi</Link>
              <Link to="/farmeri" onClick={() => setIsOpen(false)} className="font-handwritten text-lg text-warm-white italic">Farmeri</Link>
              {user ? (
                <>
                  <Link to={dashboardPath} onClick={() => setIsOpen(false)} className="px-5 py-2.5 bg-primary text-foreground font-body font-bold text-sm text-center rounded-sm">Dashboard</Link>
                  <button onClick={() => { signOut(); setIsOpen(false); }} className="px-5 py-2.5 border border-warm-white/30 text-warm-white font-body text-sm text-center rounded-sm">Odjavi se</button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)} className="px-5 py-2.5 border border-warm-white/40 text-warm-white font-body font-semibold text-sm text-center rounded-sm">Prijavi se</Link>
                  <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)} className="px-5 py-2.5 bg-primary text-foreground font-body font-bold text-sm text-center rounded-sm">Registruj se</Link>
                  <Link to="/partner" onClick={() => setIsOpen(false)} className="px-5 py-2.5 bg-primary text-foreground font-body font-bold text-sm text-center rounded-sm border-2 border-foreground/20">Postani Partner</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
