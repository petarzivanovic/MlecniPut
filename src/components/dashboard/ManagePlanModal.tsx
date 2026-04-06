import { motion, AnimatePresence } from "framer-motion";

interface ManagePlanModalProps {
  open: boolean;
  onClose: () => void;
  onPause: () => void;
  onChangePlan: () => void;
  onCancel: () => void;
  loading: boolean;
  isPaused: boolean;
  onResume: () => void;
}

const SadCowDoodle = () => (
  <svg className="w-16 h-16 mx-auto mb-2" viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="28" stroke="hsl(0, 70%, 55%)" strokeWidth="2" strokeDasharray="6 4" />
    <circle cx="22" cy="26" r="3" fill="hsl(0, 70%, 55%)" />
    <circle cx="42" cy="26" r="3" fill="hsl(0, 70%, 55%)" />
    <path d="M22 42C26 38 38 38 42 42" stroke="hsl(0, 70%, 55%)" strokeWidth="2" strokeLinecap="round" />
    <text x="32" y="56" textAnchor="middle" fontSize="10">🐄</text>
  </svg>
);

const ManagePlanModal = ({
  open, onClose, onPause, onChangePlan, onCancel, loading, isPaused, onResume,
}: ManagePlanModalProps) => {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-card border-2 border-border p-8 shadow-2xl"
        >
          <h3 className="font-display text-xl font-black text-foreground mb-1 text-center">
            Upravljaj Pretplatom
          </h3>
          <p className="font-handwritten text-primary text-center mb-6">~ tvoje opcije ~</p>

          <div className="space-y-3">
            {isPaused ? (
              <button
                onClick={onResume}
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground font-body font-bold text-sm rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {loading ? "..." : "Nastavi pretplatu ▶️"}
              </button>
            ) : (
              <button
                onClick={onPause}
                disabled={loading}
                className="w-full py-3 border-2 border-amber-500 text-amber-600 font-body font-bold text-sm rounded-xl hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {loading ? "..." : "⏸️ Pauziraj pretplatu"}
              </button>
            )}

            <button
              onClick={onChangePlan}
              className="w-full py-3 bg-foreground text-background font-body font-bold text-sm rounded-xl hover:scale-[1.02] transition-transform"
            >
              🔄 Promeni Plan
            </button>

            <div className="pt-2 border-t border-border">
              <SadCowDoodle />
              <button
                onClick={onCancel}
                disabled={loading}
                className="w-full py-3 border-2 border-destructive text-destructive font-body font-bold text-sm rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {loading ? "..." : "Otkaži pretplatu 😢"}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-muted-foreground font-body text-sm hover:text-foreground transition-colors"
          >
            Zatvori
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ManagePlanModal;
