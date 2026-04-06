import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrownDoodle, StarDoodle } from "@/components/DoodleOverlays";
import WindingRoad from "@/components/WindingRoad";
import { X, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DAYS_OF_WEEK = [
  { label: "Ponedeljak", value: "monday" },
  { label: "Utorak", value: "tuesday" },
  { label: "Sreda", value: "wednesday" },
  { label: "Četvrtak", value: "thursday" },
  { label: "Petak", value: "friday" },
  { label: "Subota", value: "saturday" },
  { label: "Nedelja", value: "sunday" },
];

const FarmerDetailDialog = ({ app }: { app: any }) => {
  const [dailyOffers, setDailyOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const fetchOffers = async () => {
    if (!app.user_id) return;
    setLoadingOffers(true);
    const { data } = await supabase
      .from("farmer_daily_offers")
      .select("day_of_week, liters")
      .eq("user_id", app.user_id);
    setDailyOffers(data || []);
    setLoadingOffers(false);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">{app.full_name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 font-body text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-muted-foreground">Status:</div>
          <div className="font-semibold">{app.status === "approved" ? "Odobren 👑" : "Na čekanju"}</div>
          {app.email && <>
            <div className="text-muted-foreground">Email:</div>
            <div>{app.email}</div>
          </>}
          <div className="text-muted-foreground">BPG:</div>
          <div>{app.bpg}</div>
          <div className="text-muted-foreground">JMBG:</div>
          <div>{app.jmbg}</div>
          <div className="text-muted-foreground">Adresa:</div>
          <div>{app.address}</div>
          <div className="text-muted-foreground">Kapacitet:</div>
          <div className="font-semibold text-primary">{app.capacity_liters_per_day}L/dan</div>
        </div>

        {/* Daily offers section */}
        {app.user_id && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-foreground">Dnevna ponuda po danima:</p>
              {dailyOffers.length === 0 && !loadingOffers && (
                <button onClick={fetchOffers} className="text-xs text-primary hover:underline">Učitaj</button>
              )}
            </div>
            {loadingOffers ? (
              <p className="text-xs text-muted-foreground">Učitavanje...</p>
            ) : dailyOffers.length > 0 ? (
              <div className="space-y-1">
                {DAYS_OF_WEEK.map((day) => {
                  const offer = dailyOffers.find((o: any) => o.day_of_week === day.value);
                  return (
                    <div key={day.value} className="flex justify-between items-center py-1 px-2 rounded bg-muted/50">
                      <span>{day.label}</span>
                      <span className="font-semibold text-primary">{offer ? `${offer.liters}L` : "—"}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center py-1 px-2 rounded bg-primary/10 font-bold">
                  <span>Ukupno nedeljno:</span>
                  <span className="text-primary">{dailyOffers.reduce((s: number, o: any) => s + Number(o.liters), 0)}L</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Farmer još nije uneo dnevnu ponudu. Kliknite "Učitaj" da proverite.</p>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Prijava podneta: {new Date(app.created_at).toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </DialogContent>
  );
};

const DispatcherDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [applications, setApplications] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [totalMilk, setTotalMilk] = useState(0);
  const [loading, setLoading] = useState(true);

  // New driver form
  const [driverEmail, setDriverEmail] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPassword, setDriverPassword] = useState("");
  const [creatingDriver, setCreatingDriver] = useState(false);

  // Schedule planner
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedScheduleDays, setSelectedScheduleDays] = useState<string[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAll();

    // Realtime subscription for driver updates
    const channel = supabase
      .channel('dispatcher-drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        console.log('[Dispatcher] user_roles changed, refetching drivers...');
        fetchDrivers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('[Dispatcher] profiles changed, refetching drivers...');
        fetchDrivers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_schedules' }, () => {
        console.log('[Dispatcher] driver_schedules changed, refetching...');
        fetchSchedules();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchDrivers = async () => {
    // Step 1: Get all user_ids with role 'vozac'
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "vozac");

    if (roleError) {
      console.error('[Dispatcher] Error fetching vozac roles:', roleError);
      return;
    }

    if (!roleData || roleData.length === 0) {
      console.log('[Dispatcher] No drivers found in user_roles');
      setDrivers([]);
      return;
    }

    const driverUserIds = roleData.map((r: any) => r.user_id);

    // Step 2: Get profiles for those user_ids
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", driverUserIds);

    if (profileError) {
      console.error('[Dispatcher] Error fetching driver profiles:', profileError);
      toast({ title: "Greška pri učitavanju vozača iz baze", variant: "destructive" });
      return;
    }

    console.log('[Dispatcher] Fetched drivers:', profileData);
    const driversList = (profileData || []).map((p: any) => ({
      userId: p.user_id,
      displayName: p.display_name || "Nepoznato",
      email: p.phone || p.display_name || "—",
      ...p,
    }));
    setDrivers(driversList);
  };

  const fetchSchedules = async () => {
    const { data } = await supabase.from("driver_schedules").select("*");
    if (data) setSchedules(data);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [appsRes, , subsRes] = await Promise.all([
      supabase.from("partner_applications").select("*").order("created_at", { ascending: false }),
      fetchDrivers(),
      supabase.from("subscriptions").select("*").eq("status", "active"),
    ]);
    await fetchSchedules();

    if (appsRes.data) setApplications(appsRes.data);
    if (subsRes.data) {
      setSubscriptionCount(subsRes.data.length);
      setTotalMilk(subsRes.data.reduce((sum: number, s: any) => sum + Number(s.weekly_liters), 0));
    }
    setLoading(false);
  };

  const handleApprove = async (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    
    // Update application status
    const { error } = await supabase
      .from("partner_applications")
      .update({ status: "approved" })
      .eq("id", appId);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
      return;
    }

    // If applicant has a user_id, update their role to mlekar
    if (app?.user_id) {
      // Check if they already have a role entry
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", app.user_id)
        .maybeSingle();

      if (existingRole) {
        await supabase
          .from("user_roles")
          .update({ role: "mlekar" as any })
          .eq("user_id", app.user_id);
      } else {
        await supabase
          .from("user_roles")
          .insert({ user_id: app.user_id, role: "mlekar" as any });
      }
    }

    toast({ title: "Odobreno! 👑", description: "Farmer je sada mlekar. Mission Accepted! ⭐" });
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: "approved" } : a)));
  };

  const handleReject = async (appId: string) => {
    const { error } = await supabase
      .from("partner_applications")
      .update({ status: "rejected" })
      .eq("id", appId);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Odbijeno", description: "Prijava je odbijena." });
      setApplications((prev) => prev.filter((a) => a.id !== appId));
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    const { error } = await supabase
      .from("partner_applications")
      .delete()
      .eq("id", appId);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Uklonjeno", description: "Prijava je uklonjena iz baze." });
      setApplications((prev) => prev.filter((a) => a.id !== appId));
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverEmail || !driverName || !driverPassword) return;
    setCreatingDriver(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("create-driver", {
      body: { email: driverEmail, password: driverPassword, displayName: driverName },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Greška", description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      toast({ title: "Vozač kreiran! 🚛", description: `${driverName} je sada registrovan.` });
      setDriverEmail("");
      setDriverName("");
      setDriverPassword("");
      fetchAll();
    }
    setCreatingDriver(false);
  };

  const handleSaveSchedule = async () => {
    if (!selectedDriver || selectedScheduleDays.length === 0) return;
    setSavingSchedule(true);

    // Delete existing schedule for this driver
    await supabase.from("driver_schedules").delete().eq("driver_id", selectedDriver);

    // Insert new schedule
    const inserts = selectedScheduleDays.map((day) => ({
      driver_id: selectedDriver,
      day_of_week: day,
      assigned_by: user!.id,
    }));

    const { error } = await supabase.from("driver_schedules").insert(inserts);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Raspored sačuvan! ⭐", description: "Radni dani su dodeljeni." });
      fetchAll();
    }
    setSavingSchedule(false);
  };

  const toggleScheduleDay = (day: string) => {
    setSelectedScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Load existing schedule when driver is selected
  useEffect(() => {
    if (selectedDriver) {
      const existing = schedules.filter((s: any) => s.driver_id === selectedDriver).map((s: any) => s.day_of_week);
      setSelectedScheduleDays(existing);
    }
  }, [selectedDriver, schedules]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="font-handwritten text-2xl text-primary">
          Učitavanje dispečera... 🚛
        </motion.p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />
      <WindingRoad />

      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-handwritten text-xl text-primary">~ komandni centar ~</p>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground">
              Dispečer Dashboard
            </h1>
          </div>
          <button onClick={signOut} className="px-5 py-2 border-2 border-border text-muted-foreground font-body text-sm rounded-lg hover:bg-muted transition-colors">
            Odjavi se
          </button>
        </div>

        <Tabs defaultValue="applications" className="w-full">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto bg-foreground/5 p-2 rounded-2xl mb-8">
            <TabsTrigger value="applications" className="font-body text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2">
              Prijave Farmera
            </TabsTrigger>
            <TabsTrigger value="drivers" className="font-body text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2">
              Upravljanje Vozačima
            </TabsTrigger>
            <TabsTrigger value="logistics" className="font-body text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2">
              Logistika
            </TabsTrigger>
            <TabsTrigger value="driver-list" className="font-body text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2">
              Pregled Vozača
            </TabsTrigger>
            <TabsTrigger value="planner" className="font-body text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2">
              Planer Rada
            </TabsTrigger>
            <TabsTrigger value="routes" className="font-body text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2">
              Sve Rute
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Farmer Applications */}
          <TabsContent value="applications">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
              {applications.length === 0 ? (
                <p className="font-body text-muted-foreground col-span-full text-center py-12">Nema prijava za pregled.</p>
              ) : (
                applications.filter(a => a.status !== "rejected").map((app, i) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                    transition={{ delay: i * 0.05 }}
                    layout
                    className="relative p-6 rounded-2xl bg-card border-2 border-border hover:border-primary/30 transition-colors"
                  >
                    {/* X button to delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="absolute top-3 right-3 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ukloni farmera?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Da li ste sigurni da želite da uklonite <strong>{app.full_name}</strong> iz baze? Ova akcija je nepovratna.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Otkaži</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteApplication(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Ukloni
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {app.status === "approved" && (
                      <div className="absolute -top-4 -right-2">
                        <CrownDoodle className="w-12 h-10" />
                      </div>
                    )}
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-body font-bold ${
                        app.status === "approved" ? "bg-secondary/20 text-secondary" :
                        "bg-primary/20 text-primary-foreground"
                      }`}>
                        {app.status === "approved" ? "Odobren 👑" : "Na čekanju"}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground">{app.full_name}</h3>
                    <div className="mt-3 space-y-1 font-body text-sm text-muted-foreground">
                      <p><span className="font-semibold text-foreground">Kapacitet:</span> {app.capacity_liters_per_day}L/dan</p>
                      <p><span className="font-semibold text-foreground">Adresa:</span> {app.address}</p>
                    </div>

                    {/* Details popup button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="mt-3 flex items-center gap-1.5 text-xs font-body text-primary hover:underline">
                          <Eye className="w-3.5 h-3.5" />
                          Prikaži detalje
                        </button>
                      </DialogTrigger>
                      <FarmerDetailDialog app={app} />
                    </Dialog>

                    {app.status === "pending" && (
                      <div className="mt-4 flex gap-3">
                        <button onClick={() => handleApprove(app.id)} className="flex-1 py-2 bg-secondary text-secondary-foreground font-body font-bold text-sm rounded-xl hover:scale-105 transition-transform">
                          Odobri 👑
                        </button>
                        <button onClick={() => handleReject(app.id)} className="flex-1 py-2 bg-destructive/10 text-destructive font-body font-bold text-sm rounded-xl hover:bg-destructive/20 transition-colors">
                          Odbij
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Tab 2: Driver Management */}
          <TabsContent value="drivers">
            <div className="max-w-lg">
              <div className="p-8 rounded-2xl bg-card border-2 border-dashed border-primary/30">
                <h3 className="font-display text-xl font-bold text-foreground mb-2">Dodaj novog vozača</h3>
                <p className="font-handwritten text-lg text-primary mb-6">~ novi čovek na putu ~</p>
                <form onSubmit={handleCreateDriver} className="space-y-4">
                  <div>
                    <label className="font-handwritten text-lg text-primary block mb-1">Ime</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Ime vozača"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="font-handwritten text-lg text-primary block mb-1">Email</label>
                    <input
                      type="email"
                      value={driverEmail}
                      onChange={(e) => setDriverEmail(e.target.value)}
                      placeholder="vozac@email.com"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="font-handwritten text-lg text-primary block mb-1">Lozinka</label>
                    <input
                      type="password"
                      value={driverPassword}
                      onChange={(e) => setDriverPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingDriver}
                    className="w-full py-4 bg-primary text-primary-foreground font-body font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50"
                  >
                    {creatingDriver ? "Kreiranje..." : "Kreiraj vozača 🚛"}
                  </button>
                </form>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Logistics */}
          <TabsContent value="logistics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 rounded-2xl bg-secondary/10 border-2 border-secondary/20 text-center">
                <p className="font-handwritten text-xl text-secondary">Ukupno mleka za danas</p>
                <p className="font-display text-6xl font-black text-foreground mt-4">{totalMilk}L</p>
                <p className="font-body text-sm text-muted-foreground mt-2">nedeljno od aktivnih pretplata</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="p-8 rounded-2xl bg-primary/10 border-2 border-primary/20 text-center">
                <p className="font-handwritten text-xl text-primary">Aktivne pretplate</p>
                <p className="font-display text-6xl font-black text-foreground mt-4">{subscriptionCount}</p>
                <p className="font-body text-sm text-muted-foreground mt-2">korisnika prima mleko</p>
              </motion.div>
            </div>
          </TabsContent>

          {/* Tab 4: Driver List */}
          <TabsContent value="driver-list">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16">
                  <svg width="60" height="80" viewBox="0 0 60 80" fill="none" className="mb-4 opacity-60">
                    <path d="M30 10 C30 10 25 30 30 50 C35 70 30 75 30 75" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" fill="none"/>
                    <path d="M20 15 L30 5 L28 18" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <p className="font-handwritten text-xl text-primary mb-2">Nema vozača... još!</p>
                  <p className="font-body text-sm text-muted-foreground text-center max-w-sm">
                    Trenutno nema registrovanih vozača. Dodaj prvog člana tima iznad!
                  </p>
                </div>
              ) : (
                drivers.map((driver, i) => (
                  <motion.div
                    key={driver.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-6 rounded-2xl bg-card border-2 border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-3xl">🚛</span>
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-foreground">{driver.displayName || driver.display_name}</h3>
                        <p className="font-body text-sm text-muted-foreground">{driver.email || "—"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      {schedules
                        .filter((s: any) => s.driver_id === driver.userId)
                        .map((s: any) => (
                          <span key={s.id} className="px-2 py-1 rounded-full bg-primary/10 text-foreground font-body text-xs font-medium">
                            {DAYS_OF_WEEK.find((d) => d.value === s.day_of_week)?.label || s.day_of_week}
                          </span>
                        ))}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Tab 5: Schedule Planner */}
          <TabsContent value="planner">
            <div className="max-w-lg">
              <div className="p-8 rounded-2xl bg-card border-2 border-dashed border-secondary/30">
                <h3 className="font-display text-xl font-bold text-foreground mb-2">Planer Rada</h3>
                <p className="font-handwritten text-lg text-secondary mb-6">~ dodeli radne dane ~</p>

                <div className="mb-6">
                  <label className="font-handwritten text-lg text-primary block mb-2">Izaberi vozača</label>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">-- Izaberi --</option>
                    {drivers.map((d) => (
                      <option key={d.userId} value={d.userId}>
                        {d.displayName || d.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDriver && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="font-handwritten text-lg text-primary mb-3">Radni dani:</p>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = selectedScheduleDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            onClick={() => toggleScheduleDay(day.value)}
                            className={`px-4 py-3 rounded-xl font-body font-bold text-sm transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground scale-105 shadow-md"
                                : "bg-muted text-foreground border border-border hover:border-primary"
                            }`}
                          >
                            {isSelected && "✓ "}{day.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleSaveSchedule}
                      disabled={savingSchedule || selectedScheduleDays.length === 0}
                      className="w-full py-4 bg-secondary text-secondary-foreground font-body font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50"
                    >
                      {savingSchedule ? "Čuvanje..." : "Sačuvaj raspored ⭐"}
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: All Routes Calendar */}
          <TabsContent value="routes">
            <div className="overflow-x-auto">
              <h3 className="font-display text-xl font-bold text-foreground mb-6">Nedeljni pregled</h3>
              <div className="min-w-[700px]">
                <div className="grid grid-cols-8 gap-2">
                  {/* Header */}
                  <div className="p-3 font-body font-bold text-sm text-muted-foreground">Vozač</div>
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="p-3 text-center font-body font-bold text-sm text-foreground bg-muted rounded-xl">
                      {day.label.slice(0, 3)}
                    </div>
                  ))}

                  {/* Driver rows */}
                  {drivers.map((driver) => (
                    <>
                      <div key={`name-${driver.userId}`} className="p-3 font-body text-sm font-semibold text-foreground flex items-center">
                        🚛 {driver.displayName || driver.display_name}
                      </div>
                      {DAYS_OF_WEEK.map((day) => {
                        const isScheduled = schedules.some(
                          (s: any) => s.driver_id === driver.userId && s.day_of_week === day.value
                        );
                        return (
                          <div
                            key={`${driver.userId}-${day.value}`}
                            className={`p-3 text-center rounded-xl transition-colors ${
                              isScheduled ? "bg-primary/20 border-2 border-primary" : "bg-muted/30"
                            }`}
                          >
                            {isScheduled && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="inline-block"
                              >
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                  <circle cx="14" cy="14" r="12" stroke="hsl(45, 90%, 63%)" strokeWidth="2.5" strokeDasharray="4 3" fill="hsl(45, 90%, 63%)" fillOpacity="0.2" />
                                  <path d="M9 14 L13 18 L19 10" stroke="hsl(120, 25%, 30%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default DispatcherDashboard;
