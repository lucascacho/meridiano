import type { Locale } from "@/lib/time";

const es = {
  tagline: "La misma hora, en todas las ciudades.",
  searchPlaceholder: "Añadir ciudad o zona",
  searchEmpty: "Ninguna ciudad coincide.",
  suggested: "Sugeridas",
  hint: "Toca una hora para elegirla o arrastra para marcar un rango. El amarillo es horario laboral.",
  dismiss: "Entendido",
  overlapAll: "Todos en horario laboral: {range} ({city})",
  overlapSome: "Mejor hueco: {count} de {total} · {range} ({city})",
  overlapNone: "No hay un hueco laboral común. Prueba otro día o ajusta el horario de cada ciudad.",
  overlapNeed: "Añade otra ciudad para buscar una hora en la que todos puedan.",
  useGap: "Usar este hueco",
  legendWork: "Laboral",
  legendAwake: "Despierto",
  legendNight: "Noche",
  legendWeekend: "Fin de semana",
  fixHour: "Fijar {duration}",
  copy: "Copiar",
  copied: "Copiado",
  copyFailed: "No se pudo copiar",
  share: "Compartir",
  whatsapp: "WhatsApp",
  calendar: "Calendar",
  ics: ".ics",
  clear: "Quitar",
  clearSelection: "Quitar selección",
  selectionLabel: "Horario elegido",
  earlier: "−30 min",
  later: "+30 min",
  dst: "Cambio de hora el {date} · {from} → {to}",
  footer: "Horario de verano incluido, con las zonas IANA de tu navegador.",
  emptyTitle: "Arma el tablero",
  emptyBody: "Añade las ciudades de la llamada y compara el día de un vistazo.",
  maxCities: "Puedes comparar hasta 12 ciudades.",
  titlePlaceholder: "Título de la cita",
  callTitle: "Llamada",
  home: "Base",
  outside: "Fuera del hueco",
  makeHome: "Usar como ciudad base",
  duplicate: "Duplicar",
  moveUp: "Subir",
  moveDown: "Bajar",
  remove: "Quitar ciudad",
  rename: "Nombre en el tablero",
  workHours: "Horario laboral",
  starts: "Empieza",
  ends: "Termina",
  invalidHours: "La hora de fin tiene que ser posterior a la de inicio.",
  weekendNote: "No cuenta como laboral: {days}.",
  included: "Incluir al buscar hueco",
  citySettings: "Ajustes",
  today: "Hoy",
  tomorrow: "Mañana",
  yesterday: "Ayer",
  now: "Ahora",
  prevDay: "Día anterior",
  nextDay: "Día siguiente",
  themeToDark: "Modo oscuro",
  themeToLight: "Modo claro",
  close: "Cerrar",
  gridLabel: "Tablero de horas",
  rulerLabel: "Regla de la ciudad base. Desliza para convertir.",
  addAgain: "Añadir de nuevo",
  andMore: "y {count} más",
  linkLabel: "Enlace",
};

const en: typeof es = {
  tagline: "The same hour, in every city.",
  searchPlaceholder: "Add a city or time zone",
  searchEmpty: "No cities match.",
  suggested: "Suggested",
  hint: "Click an hour to pick it, or drag to mark a range. Yellow means working hours.",
  dismiss: "Got it",
  overlapAll: "Everyone is in working hours: {range} ({city})",
  overlapSome: "Best window: {count} of {total} · {range} ({city})",
  overlapNone: "No shared working hours. Try another day or adjust each city's schedule.",
  overlapNeed: "Add another city to find a time that works for everyone.",
  useGap: "Use this window",
  legendWork: "Work",
  legendAwake: "Awake",
  legendNight: "Night",
  legendWeekend: "Weekend",
  fixHour: "Pin {duration}",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Couldn't copy",
  share: "Share",
  whatsapp: "WhatsApp",
  calendar: "Calendar",
  ics: ".ics",
  clear: "Clear",
  clearSelection: "Clear selection",
  selectionLabel: "Picked time",
  earlier: "−30 min",
  later: "+30 min",
  dst: "Clocks change on {date} · {from} → {to}",
  footer: "Daylight saving is included, using your browser's IANA time zones.",
  emptyTitle: "Build the board",
  emptyBody: "Add the cities on the call and compare the day at a glance.",
  maxCities: "You can compare up to 12 cities.",
  titlePlaceholder: "Event title",
  callTitle: "Call",
  home: "Home",
  outside: "Not in the overlap",
  makeHome: "Use as home city",
  duplicate: "Duplicate",
  moveUp: "Move up",
  moveDown: "Move down",
  remove: "Remove city",
  rename: "Name on the board",
  workHours: "Working hours",
  starts: "Starts",
  ends: "Ends",
  invalidHours: "The end time has to be later than the start.",
  weekendNote: "Not counted as work: {days}.",
  included: "Include when finding a window",
  citySettings: "Settings",
  today: "Today",
  tomorrow: "Tomorrow",
  yesterday: "Yesterday",
  now: "Now",
  prevDay: "Previous day",
  nextDay: "Next day",
  themeToDark: "Dark mode",
  themeToLight: "Light mode",
  close: "Close",
  gridLabel: "Hour board",
  rulerLabel: "Home-city ruler. Drag to convert.",
  addAgain: "Add again",
  andMore: "and {count} more",
  linkLabel: "Link",
};

const dictionaries = { es, en };

export type CopyKey = keyof typeof es;

export function t(locale: Locale, key: CopyKey, vars?: Record<string, string | number>) {
  let text: string = dictionaries[locale][key] ?? dictionaries.es[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

const DAY_NAMES: Record<Locale, string[]> = {
  es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export function weekendNames(days: number[], locale: Locale) {
  const names = days.map((day) => DAY_NAMES[locale][day]);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  const joiner = locale === "es" ? " y " : " and ";
  return `${names.slice(0, -1).join(", ")}${joiner}${names[names.length - 1]}`;
}

export function durationLabel(minutes: number, locale: Locale) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const amount = rest === 0 ? String(hours) : `${hours}:${String(rest).padStart(2, "0")}`;
  const single = hours === 1 && rest === 0;
  if (locale === "es") return `${amount} ${single ? "hora" : "horas"}`;
  return `${amount} ${single ? "hour" : "hours"}`;
}
