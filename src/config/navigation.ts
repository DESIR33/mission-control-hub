import {
  LayoutDashboard,
  Users,
  Film,
  DollarSign,
  Handshake,
  CheckSquare,
  FolderKanban,
  Brain,
  Bell,
  Mail,
  Settings,
  Zap,
  BarChart3,
  Compass,
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
  { to: "/relationships", icon: Users, label: "Relationships" },
  { to: "/content", icon: Film, label: "Content Pipeline" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/monetization", icon: DollarSign, label: "Monetization" },
  { to: "/deals", icon: Handshake, label: "Deals Pipeline" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/ai-bridge", icon: Brain, label: "AI Bridge" },
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
      { to: "/relationships", icon: Users, label: "Relationships" },
      { to: "/deals", icon: Handshake, label: "Deals Pipeline" },
      { to: "/monetization", icon: DollarSign, label: "Monetization" },
      { to: "/discover", icon: Compass, label: "Discover" },
    ],
  },
  {
    label: "Content & Work",
    items: [
      { to: "/content", icon: Film, label: "Content Pipeline" },
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/tasks", icon: CheckSquare, label: "Tasks" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/ai-bridge", icon: Brain, label: "AI Bridge" },
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
