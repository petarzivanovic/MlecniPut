import { motion } from "framer-motion";

interface Plan {
  id: string;
  name: string;
  type: "mali_potrosac" | "porodicni_standard" | "zdravo_detinjstvo" | "probaj";
  litersPerMonth: number;
  priceRsd: number;
  requiredDays: number;
  description: string;
  emoji: string;
}

const plans: Plan[] = [
  {
    id: "1",
    name: "Mali potrošač",
    type: "mali_potrosac",
    litersPerMonth: 16,
    priceRsd: 2080,
    requiredDays: 2,
    description: "Za one koji vole lagano – idealno za solo život.",
    emoji: "🥛",
  },
  {
    id: "2",
    name: "Porodični standard",
    type: "porodicni_standard",
    litersPerMonth: 32,
    priceRsd: 4000,
    requiredDays: 2,
    description: "Cela porodica sita, mama mirna.",
    emoji: "🏡",
  },
  {
    id: "3",
    name: "Zdravo detinjstvo",
    type: "zdravo_detinjstvo",
    litersPerMonth: 48,
    priceRsd: 5760,
    requiredDays: 3,
    description: "Za decu koja rastu zdravo uz pravo mleko.",
    emoji: "👶",
  },
  {
    id: "4",
    name: "Ja bih samo da probam",
    type: "probaj",
    litersPerMonth: 3,
    priceRsd: 390,
    requiredDays: 0,
    description: "Minimum 3L, jedna dostava. Bez obaveze!",
    emoji: "🧐",
  },
];

const dayOptions = [
  { label: "Pon", value: "monday" },
  { label: "Sre", value: "wednesday" },
  { label: "Sub", value: "saturday" },
];

interface PlanSelectorProps {
  selectedPlan: string | null;
  selectedDays: string[];
  onSelectPlan: (plan: Plan) => void;
  onToggleDay: (day: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

const PlanSelector = ({
  selectedPlan,
  selectedDays,
  onSelectPlan,
  onToggleDay,
  onConfirm,
  loading,
}: PlanSelectorProps) => {
  const activePlan = plans.find((p) => p.type === selectedPlan);
  const canConfirm =
    activePlan &&
    (activePlan.type === "probaj" || selectedDays.length === activePlan.requiredDays);

  return (
    <div>
      <h2 className="font-display text-2xl md:text-3xl font-black text-foreground mb-2">
        Izaberi plan
      </h2>
      <p className="font-handwritten text-xl text-primary mb-8">~ tvoj mlečni raspored ~</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelectPlan(plan)}
            className={`relative cursor-pointer p-6 rounded-2xl transition-all hover:scale-[1.02]
              ${
                selectedPlan === plan.type
                  ? "bg-primary/10 ring-2 ring-primary shadow-lg"
                  : "bg-card hover:bg-muted/50"
              }`}
            style={{
              border: "3px solid transparent",
              backgroundImage:
                selectedPlan === plan.type
                  ? undefined
                  : `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%23333' stroke-width='3' stroke-dasharray='12%2C 8' stroke-dashoffset='0' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundSize: "100% 100%",
            }}
          >
            <div className="text-4xl mb-3">{plan.emoji}</div>
            <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
            <p className="font-body text-muted-foreground text-sm mt-1">{plan.description}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-2xl font-black text-primary">
                {plan.priceRsd.toLocaleString()}
              </span>
              <span className="font-body text-sm text-muted-foreground">RSD/mes</span>
            </div>
            <p className="font-handwritten text-sm text-muted-foreground mt-1">
              {plan.litersPerMonth}L mesečno
              {plan.requiredDays > 0 && ` · ${plan.requiredDays} dana dostave`}
              {plan.type === "probaj" && " · jednokratno"}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Day selector */}
      {activePlan && activePlan.type !== "probaj" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-8"
        >
          <p className="font-handwritten text-lg text-primary mb-3">
            Izaberi {activePlan.requiredDays} dana za dostavu:
          </p>
          <div className="flex gap-4">
            {dayOptions.map((day) => {
              const isSelected = selectedDays.includes(day.value);
              const maxReached = selectedDays.length >= activePlan.requiredDays && !isSelected;
              return (
                <button
                  key={day.value}
                  onClick={() => !maxReached && onToggleDay(day.value)}
                  disabled={maxReached}
                  className={`px-6 py-3 rounded-xl font-body font-bold text-sm transition-all
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground scale-105 shadow-md"
                        : maxReached
                        ? "bg-muted text-muted-foreground opacity-40 cursor-not-allowed"
                        : "bg-card text-foreground border-2 border-border hover:border-primary"
                    }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="font-body text-xs text-muted-foreground mt-2">
            {selectedDays.length}/{activePlan.requiredDays} izabrano
          </p>
        </motion.div>
      )}

      {/* Confirm */}
      {activePlan && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onConfirm}
          disabled={!canConfirm || loading}
          className="px-8 py-4 bg-primary text-primary-foreground font-body font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sačekajte..." : "Potvrdi plan 🐄"}
        </motion.button>
      )}
    </div>
  );
};

export { plans };
export type { Plan };
export default PlanSelector;
