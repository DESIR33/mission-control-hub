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
  Send,
  FileText,
  Rocket,
  Target,
  MessageSquare,
  BookOpen,
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
  { to: "/command-center", icon: Rocket, label: "Command Center" },
  { to: "/monetization", icon: DollarSign, label: "Monetization" },
  { to: "/deals", icon: Handshake, label: "Deals Pipeline" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/sequences", icon: Send, label: "Email Sequences" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/sprints", icon: Target, label: "Growth Sprints" },
  { to: "/ai-bridge", icon: Brain, label: "AI Bridge" },
  { to: "/chat", icon: MessageSquare, label: "AI Chat" },
  { to: "/memory", icon: BookOpen, label: "Memory" },
  { to: "/reports", icon: FileText, label: "Weekly Reports" },
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
      { to: "/sequences", icon: Send, label: "Email Sequences" },
    ],
  },
  {
    label: "Content & Work",
    items: [
      { to: "/content", icon: Film, label: "Content Pipeline" },
      { to: "/sprints", icon: Target, label: "Growth Sprints" },
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/tasks", icon: CheckSquare, label: "Tasks" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/command-center", icon: Rocket, label: "Command Center" },
      { to: "/ai-bridge", icon: Brain, label: "AI Bridge" },
      { to: "/chat", icon: MessageSquare, label: "AI Chat" },
      { to: "/memory", icon: BookOpen, label: "Memory" },
      { to: "/reports", icon: FileText, label: "Weekly Reports" },
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
