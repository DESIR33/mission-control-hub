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
  Sparkles,
  ImageIcon,
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
  { to: "/trends", icon: Crosshair, label: "Trend Scanner" },
  {
    to: "/youtube",
    icon: Tv,
    label: "Content Management",
    children: [
      { to: "/youtube/dashboard", label: "Dashboard", icon: Zap },
      { to: "/youtube/channel-videos", label: "Channel & Videos", icon: Tv },
      { to: "/youtube/ctr-virality", label: "CTR & Virality", icon: MousePointerClick },
      { to: "/youtube/ab-testing", label: "A/B Testing", icon: FlaskConical },
      { to: "/youtube/demographics", label: "Demographics & Reach", icon: Users },
      { to: "/youtube/subscribers", label: "Subscriber Intel", icon: UserCheck },
      { to: "/youtube/uploads", label: "Upload & Playlists", icon: ListVideo },
      { to: "/youtube/strategy", label: "Content & Strategy", icon: Wrench },
      { to: "/youtube/comments", label: "Comments", icon: MessageSquare },
      { to: "/youtube/experiments", label: "Optimization Experiments", icon: Activity },
      { to: "/youtube/decay", label: "Performance Decay", icon: TrendingUp },
      { to: "/youtube/series", label: "Video Series", icon: ListVideo },
      { to: "/youtube/overlap", label: "Audience Overlap", icon: Users },
    ],
  },
  {
    to: "/growth",
    icon: TrendingUp,
    label: "Growth",
    children: [
      { to: "/growth/forecast", label: "Growth Forecast", icon: TrendingUp },
      { to: "/growth/funnel", label: "Growth Funnel", icon: Target },
      { to: "/growth/competitors", label: "Competitor Intel", icon: Crosshair },
    ],
  },
  {
    to: "/revenue",
    icon: DollarSign,
    label: "Revenue",
    children: [
      { to: "/revenue/analytics", label: "Revenue Analytics", icon: BarChart3 },
      { to: "/revenue/affiliate", label: "Affiliate Programs", icon: Handshake },
      { to: "/revenue/sponsorships", label: "Sponsorships", icon: Megaphone },
      { to: "/revenue/products", label: "Products", icon: ShoppingBag },
      { to: "/revenue/overview", label: "Revenue Overview", icon: DollarSign },
      { to: "/revenue/rate-card", label: "Rate Card", icon: CreditCard },
    ],
  },
  {
    to: "/network",
    icon: Users,
    label: "Network",
    children: [
      { to: "/network/contacts", label: "Contacts", icon: Users },
      { to: "/network/companies", label: "Companies", icon: Building2 },
      { to: "/network/health", label: "Company Health", icon: Activity },
      { to: "/network/graph", label: "Relationship Graph", icon: GitGraph },
      { to: "/network/sponsors", label: "Sponsors", icon: Megaphone },
      { to: "/network/engagement", label: "Engagement", icon: Activity },
    ],
  },
  {
    to: "/reports",
    icon: FileText,
    label: "Reports",
    children: [
      { to: "/reports/weekly", label: "Weekly Reports", icon: FileText },
    ],
  },
  {
    to: "/ai",
    icon: Brain,
    label: "AI Hub",
    children: [
      { to: "/ai/chat", label: "Chat", icon: MessageCircle },
      { to: "/ai/proposals", label: "Proposals", icon: Brain },
      { to: "/ai/agents", label: "Agents", icon: Bot },
      { to: "/ai/memory", label: "Memory", icon: BookOpen },
      { to: "/ai/training", label: "Training", icon: Sparkles },
      { to: "/ai/thumbnails", label: "Thumbnails", icon: ImageIcon },
    ],
  },
  { to: "/integrations", icon: Zap, label: "Integrations" },
];

// Bottom items
export const bottomItems: NavItem[] = [
  { to: "/settings", icon: Settings, label: "Settings" },
];
