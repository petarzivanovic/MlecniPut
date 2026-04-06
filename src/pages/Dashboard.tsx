import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlanSelector, { plans, type Plan } from "@/components/dashboard/PlanSelector";
import SubscriptionStatus from "@/components/dashboard/SubscriptionStatus";
import AddOnsSidebar from "@/components/dashboard/AddOnsSidebar";
import CheckoutModal from "@/components/dashboard/CheckoutModal";
import ManagePlanModal from "@/components/dashboard/ManagePlanModal";
import SingleOrderSection from "@/components/dashboard/SingleOrderSection";
import WeeklyRecommendation from "@/components/dashboard/WeeklyRecommendation";
import type { Tables } from "@/integrations/supabase/types";
import { StarDoodle } from "@/components/DoodleOverlays";
import { DAY_SHORT_SR, DAY_LABELS_SR, formatDisplayDate } from "@/lib/dateHelpers";

type Subscription = Tables<"subscriptions">;
type Order = Tables<"orders">;
type AddOn = Tables<"add_ons">;

const MilkSplash = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
      >
        <div className="text-center">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6 }}
            className="text-8xl block"
          >
            🥛
          </motion.span>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-handwritten text-3xl text-primary mt-4"
          >
            Uspešno! 🎉
          </motion.p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [profileAddress, setProfileAddress] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Modal states
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"plan" | "single" | "change">("plan");
  const [managePlanOpen, setManagePlanOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  // Single order temp state
  const [singleOrderLiters, setSingleOrderLiters] = useState(0);
  const [singleOrderDate, setSingleOrderDate] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    const [subRes, ordRes, addOnRes, profRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("delivery_date", { ascending: false })
        .limit(10),
      supabase.from("add_ons").select("*"),
      supabase
        .from("profiles")
        .select("address")
        .eq("user_id", user.id)
        .single(),
    ]);
    if (subRes.data && subRes.data.length > 0) setSubscription(subRes.data[0]);
    else setSubscription(null);
    if (ordRes.data) setOrders(ordRes.data);
    if (addOnRes.data) setAddOns(addOnRes.data);
    if (profRes.data?.address) setProfileAddress(profRes.data.address);
    setFetching(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const triggerSplash = () => {
    setShowSplash(true);
    setTimeout(() => setShowSplash(false), 1500);
  };

  // Save address to profile
  const saveProfile = async (address: string, phone: string) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ address, phone })
      .eq("user_id", user.id);
  };

  // ---- Plan confirm via checkout ----
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan.type);
    setSelectedDays([]);
  };

  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handlePlanConfirmClick = () => {
    setCheckoutMode(showPlanSelector ? "change" : "plan");
    setCheckoutOpen(true);
  };

  const handleCheckoutConfirm = async (data: { address: string; phone: string; driverNote: string }) => {
    if (!user) return;

    setLoading(true);
    await saveProfile(data.address, data.phone);

    let shouldRefresh = false;

    if (checkoutMode === "single") {
      if (!singleOrderDate || singleOrderLiters <= 0) {
        toast({
          title: "Greška",
          description: "Izaberi datum i količinu za jednokratnu porudžbinu.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        delivery_date: singleOrderDate,
        items: [{ type: "mleko", liters: singleOrderLiters }],
        total_rsd: singleOrderLiters * 130,
        status: "scheduled",
        delivery_address: data.address,
        driver_note: data.driverNote || null,
      });

      if (error) {
        toast({ title: "Greška", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      toast({ title: "Naručeno! 🚛", description: `${singleOrderLiters}L za ${singleOrderDate}` });
      triggerSplash();
      setSingleOrderDate("");
      shouldRefresh = true;
    } else {
      if (!selectedPlan) {
        setLoading(false);
        return;
      }

      const plan = plans.find((p) => p.type === selectedPlan);
      if (!plan) {
        setLoading(false);
        return;
      }

      if (checkoutMode === "change" && subscription) {
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("id", subscription.id);
      }

      const { data: sub, error } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_type: plan.type,
          weekly_liters: plan.litersPerMonth / 4,
          delivery_days: plan.type === "probaj" ? ["single"] : selectedDays,
          price_rsd: plan.priceRsd,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Greška", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      setSubscription(sub);
      toast({ title: "Uspeh! 🎉", description: `Plan "${plan.name}" je aktiviran.` });
      triggerSplash();
      setShowPlanSelector(false);
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      setCheckoutOpen(false);
      setSelectedPlan(null);
      setSelectedDays([]);
      await fetchData();
    }

    setLoading(false);
  };

  // ---- Single order flow ----
  const handleSingleOrder = (liters: number, date: string) => {
    setSingleOrderLiters(liters);
    setSingleOrderDate(date);
    setCheckoutMode("single");
    setCheckoutOpen(true);
  };

  // ---- Cancel a single order or add-on order ----
  const handleCancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    if (!error) {
      toast({ title: "Otkazano ✕", description: "Porudžbina je otkazana." });
      await fetchData();
    }
  };

  // ---- Manage plan actions ----
  const handlePause = async () => {
    if (!subscription) return;
    setLoading(true);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "paused" })
      .eq("id", subscription.id);
    if (!error) {
      setSubscription({ ...subscription, status: "paused" });
      toast({ title: "Pauzirano ⏸️", description: "Pretplata je pauzirana." });
      setManagePlanOpen(false);
    }
    setLoading(false);
  };

  const handleResume = async () => {
    if (!subscription) return;
    setLoading(true);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subscription.id);
    if (!error) {
      setSubscription({ ...subscription, status: "active" });
      toast({ title: "Aktivna! ▶️", description: "Pretplata je ponovo aktivna." });
      setManagePlanOpen(false);
    }
    setLoading(false);
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    setLoading(true);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", subscription.id);
    if (!error) {
      setSubscription({ ...subscription, status: "cancelled" });
      toast({ title: "Otkazano 😢", description: "Pretplata je otkazana." });
      setManagePlanOpen(false);
    }
    setLoading(false);
  };

  const handleChangePlan = () => {
    setManagePlanOpen(false);
    setShowPlanSelector(true);
  };

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-handwritten text-2xl text-primary"
        >
          Učitavanje... 🐄
        </motion.p>
      </div>
    );
  }

  const activePlanDetails = subscription
    ? plans.find((p) => p.type === subscription.plan_type)
    : null;

  const hasActiveSub = subscription && subscription.status !== "cancelled";

  // Next delivery calculation
  const getNextDeliveryDate = () => {
    if (!subscription || subscription.status !== "active") return null;
    const dayMap: Record<string, number> = { monday: 1, wednesday: 3, saturday: 6 };
    const today = new Date();
    const todayDay = today.getDay();
    const deliveryDays = subscription.delivery_days
      .map((d) => dayMap[d])
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (deliveryDays.length === 0) return null;
    for (const d of deliveryDays) {
      const diff = d - todayDay;
      if (diff > 0) {
        const next = new Date(today);
        next.setDate(today.getDate() + diff);
        return next;
      }
    }
    const diff = 7 - todayDay + deliveryDays[0];
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return next;
  };

  const nextDelivery = getNextDeliveryDate();
  const daysUntilDelivery = nextDelivery
    ? Math.ceil((nextDelivery.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Helper: get add-on names from IDs
  const getAddOnNames = (ids: string[] | null) => {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => {
      const found = addOns.find((a) => a.id === id);
      return found?.product_name || "Dodatak";
    });
  };

  // Split orders
  const singleOrders = orders.filter((o) => !o.subscription_id && o.status === "scheduled");
  const addOnOrders = orders.filter(
    (o) => o.add_on_ids && o.add_on_ids.length > 0 && o.status === "scheduled"
  );
  // Deduplicate: some orders may be both single and add-on
  const shownOrderIds = new Set<string>();

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />
      <MilkSplash show={showSplash} />

      <div className="container mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-handwritten text-xl text-primary">~ tvoj mlečni kutak ~</p>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground">
              Kupac Dashboard
            </h1>
          </div>
          <button
            onClick={signOut}
            className="px-5 py-2 border-2 border-border text-muted-foreground font-body text-sm rounded-lg hover:bg-muted transition-colors"
          >
            Odjavi se
          </button>
        </div>

        {/* Address bar - subtle */}
        {profileAddress && (
          <p className="font-body text-xs text-muted-foreground mb-8">
            📍 {profileAddress}
          </p>
        )}
        {!profileAddress && <div className="mb-8" />}

        {/* Weekly Recommendation - top of page */}
        <div className="mb-8">
          <p className="font-handwritten text-xl text-primary mb-4">~ naruči na vreme ~</p>
          <WeeklyRecommendation />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section A: Moja Pretplata */}
            {hasActiveSub && !showPlanSelector ? (
              <>
                <SubscriptionStatus
                  status={subscription.status}
                  planName={activePlanDetails?.name || subscription.plan_type}
                  deliveryDays={subscription.delivery_days}
                  onPause={handlePause}
                  onResume={handleResume}
                  onManage={() => setManagePlanOpen(true)}
                  loading={loading}
                />

                {/* Next Delivery */}
                {nextDelivery && subscription.status === "active" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-primary/10 border-2 border-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-handwritten text-lg text-primary">Sledeća dostava</p>
                        <p className="font-display text-2xl font-black text-foreground mt-1">
                          {nextDelivery.toLocaleDateString("sr-Latn-RS", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-4xl font-black text-primary">
                          {daysUntilDelivery}
                        </p>
                        <p className="font-handwritten text-sm text-muted-foreground">
                          {daysUntilDelivery === 1 ? "dan" : "dana"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Subscription Tracker */}
                <div className="p-6 rounded-2xl bg-card border-2 border-border">
                  <h3 className="font-display text-xl font-bold text-foreground mb-4">
                    Tvoja pretplata — pregled
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl bg-muted">
                      <p className="font-display text-2xl font-black text-primary">
                        {activePlanDetails?.litersPerMonth || "—"}L
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-1">mesečno</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-muted">
                      <p className="font-display text-2xl font-black text-primary">
                        {subscription.weekly_liters}L
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-1">nedeljno</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-muted">
                      <p className="font-display text-2xl font-black text-primary">
                        {subscription.price_rsd.toLocaleString()}
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-1">RSD/mes</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {subscription.delivery_days.map((day) => (
                      <span
                        key={day}
                        className="px-3 py-1 rounded-full bg-primary/10 text-foreground font-body text-xs font-medium"
                      >
                        {DAY_SHORT_SR[day] || day}
                      </span>
                    ))}
                  </div>

                  {/* Single orders under subscription */}
                  {singleOrders.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="font-handwritten text-lg text-primary mb-3">~ jednokratne porudžbine ~</p>
                      <div className="space-y-3">
                        {singleOrders.map((order) => {
                          shownOrderIds.add(order.id);
                          return (
                            <div
                              key={order.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-handwritten text-xl text-primary">📦</span>
                                <div>
                                  <p className="font-body text-sm font-semibold text-foreground">
                                    {formatDisplayDate(order.delivery_date, "kupac")}
                                  </p>
                                  {order.items && Array.isArray(order.items) && (order.items as any[]).map((item: any, i: number) => (
                                    item.liters && (
                                      <span key={i} className="font-body text-xs text-muted-foreground">
                                        {item.liters}L mleko
                                      </span>
                                    )
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {order.total_rsd && (
                                  <span className="font-body text-sm font-bold text-foreground">
                                    {order.total_rsd} RSD
                                  </span>
                                )}
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  title="Otkaži"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add-on orders under subscription */}
                  {addOnOrders.filter((o) => !shownOrderIds.has(o.id) || (o.add_on_ids && o.add_on_ids.length > 0)).length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="font-handwritten text-lg text-primary mb-3">~ domaći dodaci ~</p>
                      <div className="space-y-3">
                        {addOnOrders.map((order) => {
                          const names = getAddOnNames(order.add_on_ids);
                          return (
                            <div
                              key={`addon-${order.id}`}
                              className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-handwritten text-xl text-primary">🫙</span>
                                <div>
                                  <p className="font-body text-sm font-semibold text-foreground">
                                    {formatDisplayDate(order.delivery_date, "kupac")}
                                  </p>
                                  <p className="font-body text-xs text-muted-foreground">
                                    {names.join(", ")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const price = (order.add_on_ids || []).reduce((sum, id) => {
                                    const found = addOns.find((a) => a.id === id);
                                    return sum + (found?.price_rsd || 0);
                                  }, 0);
                                  return price > 0 ? (
                                    <span className="font-body text-sm font-bold text-foreground">
                                      {price} RSD
                                    </span>
                                  ) : null;
                                })()}
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  title="Otkaži"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <PlanSelector
                selectedPlan={selectedPlan}
                selectedDays={selectedDays}
                onSelectPlan={handleSelectPlan}
                onToggleDay={handleToggleDay}
                onConfirm={handlePlanConfirmClick}
                loading={loading}
              />
            )}

            {showPlanSelector && hasActiveSub && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setShowPlanSelector(false); setSelectedPlan(null); }}
                  className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Nazad na pregled
                </button>
              </div>
            )}

            {/* Section B: Single Orders — always visible */}
            <SingleOrderSection onOrder={handleSingleOrder} loading={loading} />

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AddOnsSidebar />
            <div className="p-6 rounded-2xl bg-card border-2 border-dashed border-primary/20 text-center">
              <StarDoodle className="mx-auto mb-2" />
              <p className="font-handwritten text-lg text-primary">Tip dana</p>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Sveže mleko je najbolje ujutru uz topao hleb i med. Probaj! 🍯
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleCheckoutConfirm}
        loading={loading}
        title={checkoutMode === "single" ? "Jednokratna Porudžbina" : "Potvrdi Plan"}
      />

      <ManagePlanModal
        open={managePlanOpen}
        onClose={() => setManagePlanOpen(false)}
        onPause={handlePause}
        onResume={handleResume}
        onChangePlan={handleChangePlan}
        onCancel={handleCancelSubscription}
        loading={loading}
        isPaused={subscription?.status === "paused"}
      />

      <Footer />
    </div>
  );
};

export default Dashboard;
