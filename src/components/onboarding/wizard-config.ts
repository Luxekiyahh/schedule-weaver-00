import {
  Scissors,
  Dumbbell,
  Wrench,
  HeartPulse,
  Briefcase,
  Car,
  PawPrint,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export const CALENDLY_URL = "https://calendly.com/your-link"; // TODO: replace with your real Calendly link

export type IndustryId =
  | "beauty"
  | "fitness"
  | "home"
  | "health"
  | "consulting"
  | "auto"
  | "pet"
  | "other";

export type IndustryConfig = {
  id: IndustryId;
  label: string;
  icon: LucideIcon;
  bioPlaceholder: string;
  services: string[];
  intake: Array<{ label: string; type: IntakeType }>;
  deposit: number;
};

export type IntakeType = "short" | "long" | "yesno" | "file";

export const INDUSTRIES: IndustryConfig[] = [
  {
    id: "beauty",
    label: "Beauty & Hair",
    icon: Scissors,
    bioPlaceholder: "Luxury hair & beauty services tailored to you.",
    services: ["Wispy lash extensions", "Wig install", "Taper Fade"],
    intake: [
      { label: "Will your hair be clean and blown out?", type: "yesno" },
      { label: "Do you have inspiration photos?", type: "yesno" },
    ],
    deposit: 50,
  },
  {
    id: "fitness",
    label: "Fitness & Wellness",
    icon: Dumbbell,
    bioPlaceholder: "Personalized training to help you reach your goals.",
    services: ["Personal Training Session", "Group Class", "Nutrition Consult"],
    intake: [
      { label: "Do you have any injuries or limitations?", type: "long" },
      { label: "What are your primary fitness goals?", type: "long" },
    ],
    deposit: 50,
  },
  {
    id: "home",
    label: "Home Services",
    icon: Wrench,
    bioPlaceholder: "Reliable home services, done right the first time.",
    services: ["Service Diagnostic", "Standard Repair", "Installation"],
    intake: [
      { label: "Describe the issue you're experiencing", type: "long" },
      { label: "Is the property residential or commercial?", type: "short" },
    ],
    deposit: 50,
  },
  {
    id: "health",
    label: "Health & Medical",
    icon: HeartPulse,
    bioPlaceholder: "Compassionate care focused on your wellbeing.",
    services: ["Initial Consultation", "Follow-Up Visit", "Treatment Session"],
    intake: [
      { label: "Any special requests or notes?", type: "long" },
      { label: "How did you hear about us?", type: "short" },
    ],
    deposit: 50,
  },
  {
    id: "consulting",
    label: "Consulting & Coaching",
    icon: Briefcase,
    bioPlaceholder: "Strategic guidance to move your goals forward.",
    services: ["Discovery Call", "Strategy Session", "Monthly Retainer"],
    intake: [
      { label: "Any special requests or notes?", type: "long" },
      { label: "How did you hear about us?", type: "short" },
    ],
    deposit: 50,
  },
  {
    id: "auto",
    label: "Auto & Detailing",
    icon: Car,
    bioPlaceholder: "Premium auto detailing that makes your car shine.",
    services: ["Basic Detail", "Full Detail", "Paint Correction"],
    intake: [
      { label: "Any special requests or notes?", type: "long" },
      { label: "How did you hear about us?", type: "short" },
    ],
    deposit: 50,
  },
  {
    id: "pet",
    label: "Pet Services",
    icon: PawPrint,
    bioPlaceholder: "Gentle, loving grooming for your furry family.",
    services: ["Bath & Groom", "Nail Trim", "Full Groom"],
    intake: [
      { label: "Any special requests or notes?", type: "long" },
      { label: "How did you hear about us?", type: "short" },
    ],
    deposit: 50,
  },
  {
    id: "other",
    label: "Other",
    icon: MoreHorizontal,
    bioPlaceholder: "Tell clients what makes your business special.",
    services: ["Service 1", "Service 2", "Service 3"],
    intake: [
      { label: "Any special requests or notes?", type: "long" },
      { label: "How did you hear about us?", type: "short" },
    ],
    deposit: 50,
  },
];

export function getIndustry(id: IndustryId | null): IndustryConfig {
  return INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[INDUSTRIES.length - 1];
}

export const DURATION_OPTIONS: Array<{ value: string; label: string; minutes: number }> = [
  { value: "30", label: "30 min", minutes: 30 },
  { value: "45", label: "45 min", minutes: 45 },
  { value: "60", label: "1 hr", minutes: 60 },
  { value: "90", label: "1.5 hr", minutes: 90 },
  { value: "120", label: "2 hr", minutes: 120 },
  { value: "180", label: "3 hr", minutes: 180 },
  { value: "240", label: "4 hr", minutes: 240 },
  { value: "300", label: "5 hr", minutes: 300 },
  { value: "360", label: "6 hr", minutes: 360 },
  { value: "420", label: "7 hr", minutes: 420 },
  { value: "480", label: "8 hr", minutes: 480 },
  { value: "custom", label: "Custom", minutes: 0 },
];

export const CANCELLATION_OPTIONS = ["12 hours", "24 hours", "48 hours", "72 hours"];
export const GRACE_OPTIONS = ["None", "10 minutes", "15 minutes", "20 minutes", "30 minutes"];

export const INTAKE_TYPE_LABELS: Record<IntakeType, string> = {
  short: "Short Text",
  long: "Long Text",
  yesno: "Yes/No",
  file: "File Upload",
};

export const DAYS: Array<{ dow: number; label: string; short: string }> = [
  { dow: 1, label: "Monday", short: "Mon" },
  { dow: 2, label: "Tuesday", short: "Tue" },
  { dow: 3, label: "Wednesday", short: "Wed" },
  { dow: 4, label: "Thursday", short: "Thu" },
  { dow: 5, label: "Friday", short: "Fri" },
  { dow: 6, label: "Saturday", short: "Sat" },
  { dow: 0, label: "Sunday", short: "Sun" },
];

// 30-min increments from 6:00 AM to 11:00 PM
export const TIME_OPTIONS: Array<{ value: string; label: string }> = (() => {
  const out: Array<{ value: string; label: string }> = [];
  for (let m = 6 * 60; m <= 23 * 60; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
    out.push({ value, label });
  }
  return out;
})();

export function formatTimeLabel(value: string): string {
  return TIME_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

export type ServiceOption = { id: string; label: string; price: string };
export type ServiceAddOn = {
  id: string;
  name: string;
  price: string;
  duration: string;
};
export type ServiceCategory = { id: string; name: string };
export type ServiceDraft = {
  id: string;
  name: string;
  description: string;
  duration: string;
  customDuration: string;
  price: string;
  options: ServiceOption[];
  categoryId: string | null;
  addOns: ServiceAddOn[];
};
export type DayHours = { dow: number; open: boolean; start: string; end: string };
export type LocationType = "studio" | "mobile" | "home";
export type IntakeQuestion = { id: string; label: string; type: IntakeType };
export type PortfolioPhoto = { id: string; dataUrl: string; url?: string };

export type Policies = {
  deposit: string;
  cancellation: string;
  grace: string;
  noGuests: boolean;
  customNote: string;
};

export type ThemeId = "default" | "luxury-blush" | "industrial-dark";

export type ThemeOption = {
  id: ThemeId;
  label: string;
  description: string;
  swatch: string[];
};

export const THEMES: ThemeOption[] = [
  {
    id: "default",
    label: "Modern Clean",
    description: "Bright, minimal, and versatile — works for any business.",
    swatch: ["#4f46e5", "#ec4899", "#f8fafc"],
  },
  {
    id: "luxury-blush",
    label: "Luxury Blush",
    description: "Soft, elegant, serif-driven. Great for beauty & wellness.",
    swatch: ["#f4c2c9", "#1a1a1a", "#fdf7f5"],
  },
  {
    id: "industrial-dark",
    label: "Industrial Dark",
    description: "Bold, high-contrast dark mode. Great for auto & home services.",
    swatch: ["#18181b", "#f59e0b", "#0a0a0a"],
  },
];

/** Default storefront theme suggested for each industry. */
export const INDUSTRY_THEME_DEFAULTS: Record<IndustryId, ThemeId> = {
  beauty: "luxury-blush",
  fitness: "default",
  home: "industrial-dark",
  health: "default",
  consulting: "default",
  auto: "industrial-dark",
  pet: "default",
  other: "default",
};

export function defaultThemeForIndustry(industry: IndustryId | null): ThemeId {
  if (!industry) return "default";
  return INDUSTRY_THEME_DEFAULTS[industry] ?? "default";
}

export type WizardState = {
  industry: IndustryId | null;
  themeId: ThemeId;
  businessName: string;
  ownerTitle: string;
  bio: string;
  logoDataUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  portfolio: PortfolioPhoto[];
  categories: ServiceCategory[];
  services: ServiceDraft[];
  hours: DayHours[];
  locationType: LocationType;
  address: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite: string;
  policies: Policies;
  intake: IntakeQuestion[];
};

export function defaultHours(): DayHours[] {
  return DAYS.map((d) => {
    const weekend = d.dow === 0 || d.dow === 6;
    return {
      dow: d.dow,
      open: true,
      start: "09:00",
      end: weekend ? "20:00" : "19:00",
    };
  });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyService(name = "", categoryId: string | null = null): ServiceDraft {
  return {
    id: uid(),
    name,
    description: "",
    duration: "60",
    customDuration: "",
    price: "",
    options: [],
    categoryId,
    addOns: [],
  };
}

export function initialWizard(): WizardState {
  return {
    industry: null,
    themeId: "default",
    businessName: "",
    ownerTitle: "",
    bio: "",
    logoDataUrl: null,
    logoUrl: null,
    primaryColor: "#6d28d9",
    secondaryColor: "#ec4899",
    portfolio: [],
    services: [],
    hours: defaultHours(),
    locationType: "studio",
    address: "",
    businessPhone: "",
    businessEmail: "",
    businessWebsite: "",
    policies: {
      deposit: "50",
      cancellation: "24 hours",
      grace: "15 minutes",
      noGuests: false,
      customNote: "",
    },
    intake: [],
  };
}

export function durationToMinutes(s: ServiceDraft): number {
  if (s.duration === "custom") {
    const n = parseInt(s.customDuration, 10);
    return Number.isFinite(n) && n > 0 ? n : 60;
  }
  const n = parseInt(s.duration, 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}
