import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { address: string; phone: string; driverNote: string }) => void;
  loading: boolean;
  title?: string;
}

const CheckoutModal = ({ open, onClose, onConfirm, loading, title = "Dostava" }: CheckoutModalProps) => {
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [driverNote, setDriverNote] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!open) {
      setPrefilled(false);
      setDriverNote("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !user || prefilled) return;
    supabase
      .from("profiles")
      .select("address, phone")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.address) setAddress(data.address);
        if (data?.phone) setPhone(data.phone);
        setPrefilled(true);
      });
  }, [open, user, prefilled]);

  const handleSubmit = () => {
    if (!address.trim() || !phone.trim()) return;
    onConfirm({ address: address.trim(), phone: phone.trim(), driverNote: driverNote.trim() });
  };

  if (!open) return null;

  return (
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
        className="relative w-full max-w-md rounded-2xl bg-card border-2 border-primary/30 p-8 shadow-2xl"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='hsl(47,90%25,55%25)' stroke-width='3' stroke-dasharray='14%2C 8' stroke-dashoffset='0' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundSize: "100% 100%",
        }}
      >
        <svg className="absolute -top-4 -right-4 w-12 h-12" viewBox="0 0 48 48" fill="none">
          <path d="M24 4L28 18H42L30 26L34 40L24 32L14 40L18 26L6 18H20Z" fill="hsl(47, 90%, 55%)" stroke="hsl(0,0%,10%)" strokeWidth="2" strokeLinejoin="round" />
        </svg>

        <h3 className="font-display text-2xl font-black text-foreground mb-1">{title}</h3>
        <p className="font-handwritten text-primary text-lg mb-6">~ gde da ti donesemo mleko? ~</p>

        <div className="space-y-4">
          <div>
            <label className="font-body text-sm font-semibold text-foreground block mb-1">
              📍 Tačna Adresa Dostave *
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ul. Mlečna 42, Beograd"
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground font-body text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-body text-sm font-semibold text-foreground block mb-1">
              📞 Broj Telefona *
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+381 6X XXX XXXX"
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground font-body text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-body text-sm font-semibold text-foreground block mb-1">
              📝 Napomena za vozača
            </label>
            <textarea
              value={driverNote}
              onChange={(e) => setDriverNote(e.target.value)}
              placeholder="Treći sprat, zvonce desno..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground font-body text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-border text-muted-foreground font-body font-bold text-sm rounded-xl hover:bg-muted transition-colors"
          >
            Otkaži
          </button>
          <button
            onClick={handleSubmit}
            disabled={!address.trim() || !phone.trim() || loading}
            className="flex-1 py-3 bg-foreground text-background font-body font-bold text-sm rounded-xl hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sačekaj..." : "Potvrdi ✓"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CheckoutModal;
