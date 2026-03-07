import {
  LayoutDashboard,
  Film,
  DollarSign,
  Handshake,
  FolderKanban,
  Brain,
  Bell,
  Mail,
  Settings,
  Zap,
  BarChart3,
  Send,
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
  { to: "/monetization", icon: DollarSign, label: "Monetization" },
  { to: "/sequences", icon: Send, label: "Email Sequences" },
  { to: "/content", icon: Film, label: "Content Pipeline" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/sprints", icon: Target, label: "Growth Sprints" },
  { to: "/youtube", icon: BarChart3, label: "YouTube Hub" },
  { to: "/ai", icon: Brain, label: "AI Hub" },
  { to: "/inbox", icon: Mail, label: "Inbox" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
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
      { to: "/monetization", icon: DollarSign, label: "Monetization" },
      { to: "/sequences", icon: Send, label: "Email Sequences" },
    ],
  },
  {
    label: "Content & Work",
    items: [
      { to: "/content", icon: Film, label: "Content Pipeline" },
      { to: "/projects", icon: FolderKanban, label: "Projects" },
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
      { to: "/notifications", icon: Bell, label: "Notifications" },
    ],
  },
];

export const bottomItems: NavItem[] = [
  { to: "/integrations", icon: Zap, label: "Integrations" },
  { to: "/settings", icon: Settings, label: "Settings" },
];
