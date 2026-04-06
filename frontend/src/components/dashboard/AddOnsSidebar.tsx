import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type AddOn = Tables<"add_ons">;

const addOnEmojis: Record<string, string> = {
  cheese: "🧀",
  kajmak: "🫕",
  yogurt: "🥛",
};

const AddOnsSidebar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("add_ons")
      .select("*")
      .then(({ data }) => {
        if (data) setAddOns(data);
      });
  }, []);

  const toggleAddOn = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddToDelivery = async () => {
    if (!user || selected.length === 0) return;

    // Check if user has an active subscription
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (!subs || subs.length === 0) {
      toast({
        title: "Nema aktivne pretplate",
        description: "Prvo izaberi plan pa ćeš moći da dodaješ dodatke.",
        variant: "destructive",
      });
      return;
    }

    // Find next scheduled order, or create one if none exists
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .order("delivery_date", { ascending: true })
      .limit(1);

    if (orders && orders.length > 0) {
      const existingIds = orders[0].add_on_ids || [];
      const merged = [...new Set([...existingIds, ...selected])];
      await supabase
        .from("orders")
        .update({ add_on_ids: merged })
        .eq("id", orders[0].id);
    } else {
      // No scheduled order yet — create one for next delivery day
      const sub = subs[0];
      const dayMap: Record<string, number> = { monday: 1, wednesday: 3, saturday: 6 };
      const today = new Date();
      const todayDay = today.getDay();
      const deliveryDays = sub.delivery_days
        .map((d) => dayMap[d])
        .filter(Boolean)
        .sort((a, b) => a - b);

      let nextDate = new Date(today);
      if (deliveryDays.length > 0) {
        let found = false;
        for (const d of deliveryDays) {
          const diff = d - todayDay;
          if (diff > 0) {
            nextDate.setDate(today.getDate() + diff);
            found = true;
            break;
          }
        }
        if (!found) {
          const diff = 7 - todayDay + deliveryDays[0];
          nextDate.setDate(today.getDate() + diff);
        }
      } else {
        nextDate.setDate(today.getDate() + 1);
      }

      const dateStr = nextDate.toISOString().split("T")[0];
      await supabase.from("orders").insert({
        user_id: user.id,
        subscription_id: sub.id,
        delivery_date: dateStr,
        items: [{ type: "add_ons_only" }],
        add_on_ids: selected,
        status: "scheduled",
      });
    }

    toast({ title: "Dodato! 🎉", description: "Dodaci su dodati na sledeću dostavu." });
    setSelected([]);
  };

  const totalPrice = addOns
    .filter((a) => selected.includes(a.id))
    .reduce((sum, a) => sum + a.price_rsd, 0);

  return (
    <div className="p-6 rounded-2xl bg-card border-2 border-border">
      <h3 className="font-display text-xl font-bold text-foreground mb-1">Domaći dodaci</h3>
      <p className="font-handwritten text-primary text-lg mb-6">~ klikni da dodaš ~</p>

      <div className="space-y-3">
        {addOns.map((addOn, i) => {
          const isSelected = selected.includes(addOn.id);
          return (
            <motion.button
              key={addOn.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => toggleAddOn(addOn.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left
                ${
                  isSelected
                    ? "bg-primary/15 ring-2 ring-primary shadow-md scale-[1.02]"
                    : "bg-background hover:bg-muted/50 border border-border"
                }`}
            >
              <span className="text-3xl">
                {addOnEmojis[addOn.icon_name || ""] || "🫙"}
              </span>
              <div className="flex-1">
                <p className="font-body font-semibold text-foreground">{addOn.product_name}</p>
                <p className="font-handwritten text-primary text-sm">
                  {addOn.price_rsd} RSD
                </p>
              </div>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-primary text-xl"
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <p className="font-body text-sm text-muted-foreground mb-3">
            Ukupno: <span className="font-bold text-foreground">{totalPrice} RSD</span>
          </p>
          <button
            onClick={handleAddToDelivery}
            className="w-full py-3 bg-primary text-primary-foreground font-body font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-md"
          >
            Dodaj na sledeću dostavu 📦
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AddOnsSidebar;
