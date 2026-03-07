import {
  LayoutDashboard,
  Film,
  DollarSign,
  Handshake,
  Brain,
  Mail,
  Settings,
  BarChart3,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Flat list used by the desktop sidebar
export const navItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Mission Control" },
  { to: "/partnerships", icon: Handshake, label: "Partnerships" },
  { to: "/revenue", icon: DollarSign, label: "Revenue" },
  { to: "/content", icon: Film, label: "Content & Projects" },
  { to: "/sprints", icon: Target, label: "Growth Sprints" },
  { to: "/youtube", icon: BarChart3, label: "YouTube Hub" },
  { to: "/ai", icon: Brain, label: "AI Hub" },
  { to: "/inbox", icon: Mail, label: "Inbox" },
];

// Grouped layout used by the mobile menu
export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Mission Control" },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/partnerships", icon: Handshake, label: "Partnerships" },
      { to: "/revenue", icon: DollarSign, label: "Revenue" },
    ],
  },
  {
    label: "Work",
    items: [
      { to: "/content", icon: Film, label: "Content & Projects" },
      { to: "/sprints", icon: Target, label: "Growth Sprints" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/youtube", icon: BarChart3, label: "YouTube Hub" },
      { to: "/ai", icon: Brain, label: "AI Hub" },
    ],
  },
  {
    label: "Communication",
    items: [
      { to: "/inbox", icon: Mail, label: "Inbox" },
    ],
  },
];

export const bottomItems: NavItem[] = [
  { to: "/settings", icon: Settings, label: "Settings" },
];
