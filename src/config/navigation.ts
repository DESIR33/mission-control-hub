import {
  LayoutDashboard,
  Mail,
  Film,
  Tv,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Brain,
  Zap,
  Settings,
  MousePointerClick,
  FlaskConical,
  UserCheck,
  Wrench,
  MessageSquare,
  Target,
  Crosshair,
  Building2,
  GitGraph,
  Megaphone,
  Activity,
  MessageCircle,
  Bot,
  BookOpen,
  CreditCard,
  Handshake,
  ShoppingBag,
  BarChart3,
  ListVideo,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavChild {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  children?: NavChild[];
}

// Main navigation items (top section)
export const mainNavItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Mission Control" },
  { to: "/inbox", icon: Mail, label: "Inbox" },
  { to: "/content", icon: Film, label: "Content Pipeline" },
  {
    to: "/youtube",
    icon: Tv,
    label: "Content Management",
    children: [
      { to: "/youtube?section=dashboard", label: "Dashboard", icon: Zap },
      { to: "/youtube?section=channel_videos", label: "Channel & Videos", icon: Tv },
      { to: "/youtube?section=ctr_viral", label: "CTR & Virality", icon: MousePointerClick },
      { to: "/youtube?section=ab_testing", label: "A/B Testing", icon: FlaskConical },
      { to: "/youtube?section=demographics_reach", label: "Demographics & Reach", icon: Users },
      { to: "/youtube?section=subscribers", label: "Subscriber Intel", icon: UserCheck },
      { to: "/youtube?section=upload_playlists", label: "Upload & Playlists", icon: ListVideo },
      { to: "/youtube?section=content_strategy", label: "Content & Strategy", icon: Wrench },
      { to: "/youtube?section=comments_all", label: "Comments", icon: MessageSquare },
    ],
  },
  {
    to: "/youtube",
    icon: TrendingUp,
    label: "Growth",
    children: [
      { to: "/youtube?section=growth_forecast", label: "Growth Forecast", icon: TrendingUp },
      { to: "/youtube?section=growth_funnel", label: "Growth Funnel", icon: Target },
      { to: "/youtube?section=competitors", label: "Competitor Intel", icon: Crosshair },
    ],
  },
  {
    to: "/revenue",
    icon: DollarSign,
    label: "Revenue",
    children: [
      { to: "/youtube?section=revenue", label: "Revenue Analytics", icon: BarChart3 },
      { to: "/revenue?tab=affiliate", label: "Affiliate Programs", icon: Handshake },
      { to: "/revenue?tab=sponsorships", label: "Sponsorships", icon: Megaphone },
      { to: "/revenue?tab=products", label: "Products", icon: ShoppingBag },
      { to: "/revenue?tab=revenue-overview", label: "Revenue Overview", icon: DollarSign },
      { to: "/revenue?tab=rate-card", label: "Rate Card", icon: CreditCard },
    ],
  },
  {
    to: "/partnerships",
    icon: Users,
    label: "Network",
    children: [
      { to: "/partnerships?tab=contacts", label: "Contacts", icon: Users },
      { to: "/partnerships?tab=companies", label: "Companies", icon: Building2 },
      { to: "/partnerships?tab=graph", label: "Relationship Graph", icon: GitGraph },
      { to: "/partnerships?tab=sponsors", label: "Sponsors", icon: Megaphone },
      { to: "/partnerships?tab=engagement", label: "Engagement", icon: Activity },
    ],
  },
  {
    to: "/reports",
    icon: FileText,
    label: "Reports",
    children: [
      { to: "/reports", label: "Weekly Reports", icon: FileText },
    ],
  },
  {
    to: "/ai",
    icon: Brain,
    label: "AI Hub",
    children: [
      { to: "/ai?tab=chat", label: "Chat", icon: MessageCircle },
      { to: "/ai?tab=proposals", label: "Proposals", icon: Brain },
      { to: "/ai?tab=agents", label: "Agents", icon: Bot },
      { to: "/ai?tab=memory", label: "Memory", icon: BookOpen },
    ],
  },
  { to: "/integrations", icon: Zap, label: "Integrations" },
];

// Bottom items
export const bottomItems: NavItem[] = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

// Legacy exports for backward compatibility
export const navItems = mainNavItems;
export type { NavItem as NavGroup };
export const navGroups = mainNavItems.map((item) => ({
  label: item.label,
  items: item.children
    ? item.children.map((c) => ({ to: c.to, icon: c.icon, label: c.label }))
    : [{ to: item.to, icon: item.icon, label: item.label }],
}));
