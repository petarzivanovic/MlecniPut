import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfToday, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import WeeklyPlanner from "@/components/driver/WeeklyPlanner";
import DayOffDoodle from "@/components/driver/DayOffDoodle";
import RouteLoadingAnimation from "@/components/driver/RouteLoadingAnimation";
import RouteTimeline from "@/components/driver/RouteTimeline";
import { formatDisplayDate } from "@/lib/dateHelpers";

const AI_ROUTE_URL = "https://mlecniput-1.onrender.com/api/generate-route";

const DAY_MAP: Record<number, string> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

interface RouteStop {
  type: string;
  name: string;
  address: string;
  liters: number;
  time: string;
}

const DriverDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scheduledDays, setScheduledDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [route, setRoute] = useState<RouteStop[]>([]);
  const [completedStops, setCompletedStops] = useState<Set<number>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("driver_schedules")
      .select("day_of_week")
      .eq("driver_id", user.id)
      .then(({ data }) => {
        if (data) setScheduledDays(data.map((d: any) => d.day_of_week));
        setLoading(false);
      });
  }, [user]);

  const isSelectedDayScheduled = useMemo(() => {
    const dayKey = DAY_MAP[selectedDate.getDay()];
    return scheduledDays.includes(dayKey);
  }, [selectedDate, scheduledDays]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedDateLabel = isSameDay(selectedDate, startOfToday())
    ? "danas"
    : formatDisplayDate(selectedDate, "vozac");

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setRoute([]);
    setCompletedStops(new Set());
  };

  const handleGenerateRoute = async () => {
    if (!user) return;
    setGenerating(true);
    setRoute([]);
    setCompletedStops(new Set());

    try {
      const { data: supplies, error: supErr } = await supabase
        .from("partner_applications")
        .select("*")
        .eq("status", "approved");
      if (supErr) console.error("Supplies fetch error:", supErr);

      // Fetch subscriptions that deliver on the selected day
      const selectedDayKey = DAY_MAP[selectedDate.getDay()];
      const { data: subs, error: subErr } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", "active")
        .contains("delivery_days", [selectedDayKey]);
      if (subErr) console.error("Subscriptions fetch error:", subErr);

      // Fetch single orders for the selected date
      const { data: singleOrders, error: ordErr } = await supabase
        .from("orders")
        .select("*")
        .eq("delivery_date", selectedDateStr)
        .eq("status", "scheduled");
      if (ordErr) console.error("Orders fetch error:", ordErr);

      // Collect unique user_ids from subscriptions and single orders
      const userIds = [
        ...new Set([
          ...(subs || []).map((o) => o.user_id),
          ...(singleOrders || []).map((o) => o.user_id),
        ]),
      ];

      // Fetch customer profiles for delivery addresses
      let profileMap: Record<string, { address: string | null; display_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, address, display_name")
          .in("user_id", userIds);
        if (profErr) console.error("Profiles fetch error:", profErr);
        if (profiles) {
          profileMap = Object.fromEntries(
            profiles.map((p) => [p.user_id, { address: p.address, display_name: p.display_name }])
          );
        }
      }

      const payload = {
        driver_id: user.id,
        selected_date: selectedDateStr,
        supplies: (supplies || []).map((s) => ({
          id: s.id,
          name: s.full_name,
          address: s.address,
          capacity: s.capacity_liters_per_day,
        })),
        orders: [
          ...(subs || []).map((o) => ({
            id: o.id,
            user_id: o.user_id,
            plan_type: o.plan_type,
            weekly_liters: o.weekly_liters,
            delivery_days: o.delivery_days,
            delivery_address: profileMap[o.user_id]?.address || null,
            customer_name: profileMap[o.user_id]?.display_name || null,
            type: "subscription",
          })),
          ...(singleOrders || []).map((o) => ({
            id: o.id,
            user_id: o.user_id,
            delivery_date: o.delivery_date,
            items: o.items,
            delivery_address: o.delivery_address || profileMap[o.user_id]?.address || null,
            customer_name: profileMap[o.user_id]?.display_name || null,
            type: "single_order",
          })),
        ],
      };

      console.log("Sending route payload:", payload);

      const res = await fetch(AI_ROUTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      console.log("Route response:", data);

      if (data.status === "success" && Array.isArray(data.route)) {
        setRoute(data.route);
        toast({ title: "Ruta generisana! 🗺️", description: `${data.route.length} stanica za ${selectedDateLabel}.` });
      } else {
        throw new Error(data.message || "Nepoznat odgovor servera");
      }
    } catch (err: any) {
      console.error("Route generation failed:", err);
      toast({ title: "Greška", description: err.message || "Nije moguće generisati rutu.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const toggleStopComplete = (index: number) => {
    setCompletedStops((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="font-handwritten text-2xl text-primary">
          Učitavanje... 🚛
        </motion.p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Winding road background */}
      <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
        <svg width="100%" height="100%" viewBox="0 0 400 900" fill="none" preserveAspectRatio="none">
          <path d="M200 0 Q300 100 150 200 Q50 300 250 400 Q350 500 150 600 Q50 700 200 800 Q300 900 200 1000" stroke="hsl(45, 90%, 63%)" strokeWidth="6" strokeDasharray="12 8" fill="none" />
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16 max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-handwritten text-xl text-primary">~ na putu ~</p>
          <h1 className="font-display text-3xl font-black text-foreground">Vozač Dashboard</h1>
          <button onClick={signOut} className="mt-3 px-4 py-1.5 border border-border text-muted-foreground font-body text-xs rounded-lg hover:bg-muted transition-colors">
            Odjavi se
          </button>
        </div>

        {/* Weekly Planner */}
        <WeeklyPlanner
          scheduledDays={scheduledDays}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />

        {/* Day off or Generate button */}
        {!isSelectedDayScheduled ? (
          <DayOffDoodle />
        ) : (
          <>
            <motion.button
              onClick={handleGenerateRoute}
              disabled={generating}
              whileTap={{ scale: 0.97 }}
              className="w-full py-5 bg-secondary text-secondary-foreground font-body font-bold text-lg rounded-2xl hover:scale-[1.02] transition-transform shadow-xl disabled:opacity-70 mb-8"
            >
              {generating ? "Generisanje..." : `Generiši rutu za ${selectedDateLabel} 🗺️`}
            </motion.button>

            <AnimatePresence>
              {generating && <RouteLoadingAnimation />}
            </AnimatePresence>

            <AnimatePresence>
              {route.length > 0 && !generating && (
                <RouteTimeline
                  route={route}
                  completedStops={completedStops}
                  onToggleStop={toggleStopComplete}
                  dateLabel={selectedDateLabel}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
