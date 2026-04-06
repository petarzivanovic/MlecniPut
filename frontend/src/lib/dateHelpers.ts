import { format } from "date-fns";
import { sr } from "date-fns/locale";

export type AppRole = "kupac" | "mlekar" | "vozac" | "dispecer";

/**
 * Format a date for display based on the user's role.
 * - Vozač sees exact formatted date: "06.04.2026."
 * - Everyone else sees Serbian day name: "Ponedeljak"
 */
export function formatDisplayDate(date: string | Date, role: AppRole): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  if (role === "vozac") {
    return format(d, "dd.MM.yyyy.", { locale: sr });
  }
  // Capitalize first letter of day name
  const dayName = format(d, "EEEE", { locale: sr });
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
}

/**
 * Map of English day keys to Serbian labels.
 */
export const DAY_LABELS_SR: Record<string, string> = {
  monday: "Ponedeljak",
  tuesday: "Utorak",
  wednesday: "Sreda",
  thursday: "Četvrtak",
  friday: "Petak",
  saturday: "Subota",
  sunday: "Nedelja",
};

/**
 * Short Serbian labels for days.
 */
export const DAY_SHORT_SR: Record<string, string> = {
  monday: "Pon",
  tuesday: "Uto",
  wednesday: "Sre",
  thursday: "Čet",
  friday: "Pet",
  saturday: "Sub",
  sunday: "Ned",
};

/**
 * Given an English day key (e.g. "monday"), returns the next upcoming
 * date for that day (including today if it matches).
 */
export function getNextDateForDay(dayKey: string): Date {
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const target = dayMap[dayKey];
  if (target === undefined) return new Date();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  let diff = target - todayDay;
  if (diff < 0) diff += 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result;
}

/**
 * Convert an array of day keys (e.g. ["monday","wednesday"]) into
 * an array of upcoming ISO date strings (YYYY-MM-DD).
 */
export function dayKeysToUpcomingDates(dayKeys: string[]): string[] {
  return dayKeys.map((key) => {
    const d = getNextDateForDay(key);
    return format(d, "yyyy-MM-dd");
  });
}
