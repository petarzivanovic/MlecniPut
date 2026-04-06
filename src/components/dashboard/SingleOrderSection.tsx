import { useState } from "react";
import { motion } from "framer-motion";

interface SingleOrderSectionProps {
  onOrder: (liters: number, date: string) => void;
  loading: boolean;
}

const SingleOrderSection = ({ onOrder, loading }: SingleOrderSectionProps) => {
  const [liters, setLiters] = useState(3);
  const [date, setDate] = useState("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-card border-2 border-border"
    >
      <h3 className="font-display text-xl font-bold text-foreground mb-1">
        Dodaj još mleka 🥛
      </h3>
      <p className="font-handwritten text-primary text-lg mb-4">
        ~ jednokratna porudžbina, bez obaveze ~
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="font-body text-sm font-semibold text-foreground block mb-1">
            Litara
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLiters(Math.max(1, liters - 1))}
              className="w-10 h-10 rounded-lg border-2 border-border font-bold text-foreground hover:bg-muted transition-colors"
            >
              −
            </button>
            <span className="font-display text-2xl font-black text-primary w-12 text-center">
              {liters}
            </span>
            <button
              onClick={() => setLiters(Math.min(20, liters + 1))}
              className="w-10 h-10 rounded-lg border-2 border-border font-bold text-foreground hover:bg-muted transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1">
          <label className="font-body text-sm font-semibold text-foreground block mb-1">
            Datum dostave
          </label>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border-2 border-border bg-background text-foreground font-body text-sm focus:border-primary outline-none"
          />
        </div>

        <button
          onClick={() => date && onOrder(liters, date)}
          disabled={!date || loading}
          className="px-6 py-3 bg-foreground text-background font-body font-bold text-sm rounded-xl hover:scale-[1.02] transition-transform shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? "..." : "Naruči 🚛"}
        </button>
      </div>

      <p className="font-body text-xs text-muted-foreground mt-3">
        ~ {liters * 130} RSD ({liters}L × 130 RSD) ~
      </p>
    </motion.div>
  );
};

export default SingleOrderSection;
