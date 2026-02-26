import { useState, useCallback, useRef, useEffect, type KeyboardEvent, type MutableRefObject } from "react";
import { useInboxShortcuts } from "@/hooks/useInboxShortcuts";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useCsrf } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  MailIcon,
  RefreshCwIcon,
  SearchIcon,
  FilterIcon,
  InboxIcon,
  SendIcon,
  ReplyIcon,
  ForwardIcon,
  PlusIcon,
  Loader2Icon,
  CalendarIcon,
  ExternalLinkIcon,
  PaperclipIcon,
  WandSparklesIcon,
  SlidersHorizontalIcon,
  PinIcon,
  BotIcon,
  HistoryIcon,
  CheckIcon,
  ShieldAlertIcon,
  Clock3Icon,
  EyeIcon,
} from "lucide-react";
import axios from "@/lib/axios-config";
import FolderSidebar from "@/components/inbox/FolderSidebar";
import EmailList from "@/components/inbox/EmailList";
import EmailPreview from "@/components/inbox/EmailPreview";
import InboxCommandPalette from "@/components/inbox/InboxCommandPalette";
import InboxRuleBuilderDialog from "@/components/inbox/InboxRuleBuilderDialog";


type SidebarMode = "expanded" | "compact" | "hidden";
type ReplyDraftMode = "general_reply" | "sponsorship_reply" | "support_reply" | "sales_reply" | "follow_up_reply";
interface EmailMessage {
  id: string;
  dbId: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  senderEmail: string;
  senderName: string;
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: "low" | "normal" | "high";
  conversationId: string;
  folderId?: number;
  company?: { id: number; name: string; logo?: string };
  contact?: { id: number; firstName: string; lastName: string };
  tags?: Array<{ id: number; name: string; color: string }>;
  isVip?: boolean;
  reminderBadge?: { hasReminder: boolean; isOverdue: boolean; dueAt: string | null };
  opportunity?: {
    confidence: number;
    bucket: "high" | "medium" | "low";
    reasons: string[];
    suggestedActions: Array<"create_deal" | "create_task">;
  };
  aiDraft?: {
    badge: string;
    draftId?: string | null;
    confidence?: number | null;
    threshold?: number | null;
    provenance?: { details?: string; editorNotes?: string } | null;
  } | null;
  pinned?: boolean;
  unreadCount?: number;
  participants?: string[];
  latestTimestamp?: string;
  snippet?: string | null;
  groupBy?: "message" | "conversation";
  priority?: {
    score: number;
    bucket: "high" | "medium" | "low";
    lane?: "focused" | "others";
    contributors?: { senderReputation: number; interactionHistory: number; urgencyCues: number; userBehavior: number };
    focusedReasons?: string[];
  };
}

interface Folder {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  emailCount: number;
  sortOrder: number;
}

interface InboxStats {
  totalEmails: number;
  unreadEmails: number;
  todayEmails: number;
  connectedAccounts: number;
}

interface InboxPlaybook {
  id: number;
  name: string;
  description: string | null;
  actions: Array<{ id: number; actionType: string; actionOrder: number }>;
}

interface InboxTag {
  id: number;
  name: string;
  color?: string | null;
}

interface WorkspaceUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

interface DraftAudienceProfileConfig {
  audienceType: string;
  toneConstraints: string[];
  bannedPhrasing: string[];
  autoSelect: boolean;
}

interface DraftAiTelemetry {
  confidence?: number;
  rationale: string;
  provenance?: Record<string, unknown> | null;
  originalBody: string;
}

interface ComposeAttachment {
  name: string;
  contentType: string;
  contentBytesBase64: string;
  size: number;
}

interface EmailSnippet {
  id: number;
  shortcut: string;
  content: string;
  isActive: boolean;
}

interface InboxAutomationAccount {
  id: number;
  email: string;
  displayName?: string | null;
}

interface InboxBotRole {
  roleKey: string;
  roleName: string;
  isDefault: boolean;
}

interface InboxAutomationRun {
  id: number;
  scopeType: "folder" | "account";
  scopeValue: string;
  executionMode?: "shadow" | "active";
  executionTier?: "suggest-only" | "shadow" | "active";
  status: "queued" | "running" | "completed" | "failed";
  summary?: {
    processedEmails?: number;
    messagesMoved?: number;
    labelsApplied?: number;
    escalations?: number;
    exceptions?: Array<{ message?: string }>;
    error?: string;
    actor?: { actedBy?: string; botRoleName?: string; botRoleKey?: string };
    executionMode?: "shadow" | "active";
    executionTier?: "suggest-only" | "shadow" | "active";
    performance?: { precision?: number; recall?: number; sampledBotActions?: number; sampledFounderActions?: number };
    readiness?: { isReady?: boolean; samples?: number; threshold?: { minPrecision?: number; minRecall?: number; minComparisons?: number } };
    founderComparison?: Array<{ messageId: string; actionType: string; founderActionType?: string | null; matched?: boolean; botDecision?: string }>;
    activationChecklist?: string[];
  } | null;
  exceptionLog?: Array<{ message?: string }>;
  createdAt: string;
  completedAt?: string | null;
}

interface InboxBotActionLedgerRow {
  id: number;
  automationRunId?: number | null;
  messageId: string;
  conversationId?: string | null;
  actionType: string;
  decision: string;
  reason?: string | null;
  confidence?: number | null;
  riskTier?: 'low' | 'medium' | 'high' | null;
  policyKey?: string | null;
  undoToken?: string | null;
  undoExpiresAt?: string | null;
  createdAt: string;
}

interface InboxBotLedgerResponse {
  rows: InboxBotActionLedgerRow[];
  anomaly?: {
    detected: boolean;
    type: string;
    recent24h: number;
    prior24h: number;
    threshold: number;
    message?: string | null;
  };
}

interface InboxAutomationCandidate {
  id: string;
  title: string;
  actionType: "move" | "archive" | "reply" | "tag" | "assign";
  pattern: {
    senderEmail?: string | null;
    senderDomain?: string | null;
    subject?: string | null;
    topic?: string | null;
  };
  confidence: number;
  repeatedCount: number;
  impact: "low" | "medium" | "high";
  impactEstimate: {
    estimatedMinutesSavedMonthly: number;
    avoidedManualActionsMonthly: number;
  };
  recommendedMode: "shadow" | "active";
  rollbackWindowMinutes: number;
  lastSeenAt?: string;
}

interface InboxAutomationApproval {
  id: number;
  runId?: number | null;
  messageId: string;
  actionType: string;
  riskTier: "low" | "medium" | "high";
  patternKey: string;
  status: "pending" | "approved" | "rejected" | "executed";
  subject?: string | null;
  senderEmail?: string | null;
  decisionType?: "approve_once" | "approve_pattern" | "reject" | null;
  decisionReason?: string | null;
  modelDecision?: string | null;
  modelConfidence?: number | null;
  policyReason?: string | null;
  createdAt: string;
}

interface QueuedSendResponse {
  success: boolean;
  scheduled?: boolean;
  jobId?: number;
  undoSendSeconds?: number;
  sendAt?: string;
  message?: string;
}

interface InboxUndoableMutationResponse {
  success: boolean;
  message?: string;
  undoToken?: string;
  expiresAt?: string;
}

interface FounderQueueItem {
  emailId: number;
  messageId: string;
  conversationId: string;
  subject: string;
  sender: string;
  senderEmail?: string | null;
  folder: string;
  receivedAt: string;
  aiDraftId?: string | null;
  confidence: number;
  score: {
    urgency: number;
    revenueImpact: number;
    legalRisk: number;
    deadlinePressure: number;
    totalScore: number;
    priorityScore: number;
    impactValue: number;
  };
  outcomeSla?: {
    outcomeClass: 'revenue' | 'retention' | 'legal' | 'operations';
    label: string;
    state: 'on_track' | 'at_risk' | 'breached';
    minutesRemaining: number;
    targetWindowMinutes: number;
  };
  automationTriggers?: Array<{ key: string; label: string; reason: string }>;
  actions: Array<"approve_draft" | "escalate" | "defer" | "hand_to_bot">;
}

interface FounderQueueResponse {
  generatedAt: string;
  policyDefinitions?: Record<string, { label: string; baseWindowMinutes: number; preBreachBufferMinutes: number; impactWeight: number }>;
  queue: FounderQueueItem[];
}

interface InterpretedInboxFilters {
  search?: string;
  sender?: string;
  to?: string;
  subjectContains?: string;
  participants?: string[];
  keywords?: string[];
  folder?: string;
  unread?: boolean;
  labels?: string[];
  hasAttachments?: boolean;
  dateFrom?: string;
  dateTo?: string;
  assignedOwnerId?: string;
  slaState?: string;
}

interface InboxSearchBuilderState {
  from: string;
  to: string;
  subjectContains: string;
  hasAttachment: boolean;
  dateFrom: string;
  dateTo: string;
  folder: string;
  unread: boolean;
  tags: string;
  assignedOwnerId: string;
  slaState: string;
}

interface InboxSavedSearch {
  id: number;
  name: string;
  filters: InterpretedInboxFilters;
  createdAt: string;
  updatedAt: string;
}

interface ParsedInboxQueryResponse {
  mode: "structured" | "keyword_fallback";
  confidence: number;
  filters: {
    sender?: string;
    participants?: string[];
    keywords?: string[];
    folder?: string;
    unread?: boolean;
    labels?: string[];
    hasAttachments?: boolean;
    dateRange?: { from?: string; to?: string };
  };
  compiledQuery: InterpretedInboxFilters;
  fallbackReason?: string;
}

type SwipeActionType = "none" | "archive" | "delete" | "snooze" | "pin" | "read";

interface SwipeGestureSettings {
  enabled: boolean;
  leftAction: SwipeActionType;
  rightAction: SwipeActionType;
}

const DEFAULT_SWIPE_GESTURES: SwipeGestureSettings = {
  enabled: true,
  leftAction: "archive",
  rightAction: "pin",
};

const DEFAULT_SEARCH_BUILDER_STATE: InboxSearchBuilderState = {
  from: "",
  to: "",
  subjectContains: "",
  hasAttachment: false,
  dateFrom: "",
  dateTo: "",
  folder: "",
  unread: false,
  tags: "",
  assignedOwnerId: "",
  slaState: "",
};

export default function InboxPage() {
  const routerLocation = useLocation();
  const routerNavigate = useNavigate();
  const location = routerLocation.pathname;
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    routerNavigate(path, options);
  }, [routerNavigate]);
  const { toast } = useToast();
  const { user } = useUser();
  const { csrfToken } = useCsrf();
  const queryClient = useQueryClient();

  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [naturalLanguageMode, setNaturalLanguageMode] = useState(false);
  const [interpretedFilters, setInterpretedFilters] = useState<InterpretedInboxFilters | null>(null);
  const [interpretedPreview, setInterpretedPreview] = useState<ParsedInboxQueryResponse | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchBuilder, setSearchBuilder] = useState<InboxSearchBuilderState>(DEFAULT_SEARCH_BUILDER_STATE);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterVipOnly, setFilterVipOnly] = useState(false);
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);
  const [filterHighPriorityOnly, setFilterHighPriorityOnly] = useState(false);
  const [selectedLane, setSelectedLane] = useState<"all" | "focused" | "others">("all");
  const [inboxTab, setInboxTab] = useState<"emails" | "review">("emails");
  const [groupBy, setGroupBy] = useState<"message" | "conversation">("message");
  const [priorityWeights, setPriorityWeights] = useState({
    senderReputation: 0.35,
    interactionHistory: 0.25,
    urgencyCues: 0.2,
    userBehavior: 0.2,
  });
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectedBulkPlaybookId, setSelectedBulkPlaybookId] = useState<string>("");
  const [selectedBulkFolder, setSelectedBulkFolder] = useState<string>("");
  const [selectedBulkTagId, setSelectedBulkTagId] = useState<string>("");
  const [selectedBulkOwnerId, setSelectedBulkOwnerId] = useState<string>("");
  const [automationScopeType, setAutomationScopeType] = useState<"folder" | "account">("folder");
  const [automationExecutionMode, setAutomationExecutionMode] = useState<"suggest-only" | "shadow" | "active">("shadow");
  const [selectedAutomationAccountId, setSelectedAutomationAccountId] = useState<string>("");
  const [selectedBotRoleKey, setSelectedBotRoleKey] = useState<string>("inbox_operator");
  const [showAutomationHistory, setShowAutomationHistory] = useState(false);
  const [automationHistoryTab, setAutomationHistoryTab] = useState<'runs' | 'ledger'>('runs');
  const [ledgerBotFilter, setLedgerBotFilter] = useState<string>('all');
  const [ledgerRiskFilter, setLedgerRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [promotedCandidate, setPromotedCandidate] = useState<InboxAutomationCandidate | null>(null);
  const [activeAutomationRunId, setActiveAutomationRunId] = useState<number | null>(null);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [swipeSettingsOpen, setSwipeSettingsOpen] = useState(false);
  const [inboxEmails, setInboxEmails] = useState<EmailMessage[]>([]);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  const [listScrollTop, setListScrollTop] = useState(0);
  const pendingUndoRollbackRef = useRef<Record<string, () => void>>({});

  const handleToggleAdvancedSearch = useCallback(() => {
    setShowAdvancedSearch((prev) => !prev);
    setSelectedEmail((current) => {
      if (!current) return current;
      const refreshedSelectedEmail = inboxEmails.find((email) => email.id === current.id);
      return refreshedSelectedEmail || current;
    });
  }, [inboxEmails]);

  const [composeOpen, setComposeOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [swipeGestureSettings, setSwipeGestureSettings] = useState<SwipeGestureSettings>(DEFAULT_SWIPE_GESTURES);

  const [composeDraftId, setComposeDraftId] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<ComposeAttachment[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [replyAiMode, setReplyAiMode] = useState<ReplyDraftMode>("general_reply");
  const [replyAudienceProfile, setReplyAudienceProfile] = useState<DraftAudienceProfileConfig>({
    audienceType: "general_business",
    toneConstraints: [],
    bannedPhrasing: [],
    autoSelect: true,
  });
  const [replyToneConstraintsInput, setReplyToneConstraintsInput] = useState("");
  const [replyBannedPhrasingInput, setReplyBannedPhrasingInput] = useState("");
  const [replyAiTelemetry, setReplyAiTelemetry] = useState<DraftAiTelemetry | null>(null);
  const [appSidebarMode, setAppSidebarMode] = useState<SidebarMode>("expanded");

  const mobileDetailMessageId = location.startsWith("/inbox/")
    ? (() => {
      const encodedMessageId = location.replace("/inbox/", "").split("/")[0] || "";
      return encodedMessageId ? decodeURIComponent(encodedMessageId) : null;
    })()
    : null;
  const isMobileDetailView = isMobileViewport && Boolean(mobileDetailMessageId);

  const findEmailById = useCallback((messageId: string) => {
    const localMatch = inboxEmails.find((email) => email.id === messageId);
    if (localMatch) return localMatch;

    const cachedMessageLists = queryClient.getQueriesData<EmailMessage[]>({ queryKey: ["/api/inbox/messages"] });
    for (const [, cachedEmails] of cachedMessageLists) {
      if (!Array.isArray(cachedEmails)) continue;
      const cachedMatch = cachedEmails.find((email) => email.id === messageId);
      if (cachedMatch) return cachedMatch;
    }
    return null;
  }, [inboxEmails, queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateMobileViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateMobileViewport();
    mediaQuery.addEventListener("change", updateMobileViewport);
    return () => mediaQuery.removeEventListener("change", updateMobileViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !mobileDetailMessageId) return;
    setSelectedEmail((current) => {
      if (current?.id === mobileDetailMessageId) return current;
      const routeEmail = findEmailById(mobileDetailMessageId);
      return routeEmail || current;
    });
  }, [findEmailById, isMobileViewport, mobileDetailMessageId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userSettingsKey = `inboxSwipeSettings:${user?.workspaceId || "workspace"}:${user?.id || "anonymous"}`;
    const storedValue = window.localStorage.getItem(userSettingsKey);
    if (!storedValue) return;
    try {
      const parsed = JSON.parse(storedValue) as Partial<SwipeGestureSettings>;
      setSwipeGestureSettings((current) => ({
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : current.enabled,
        leftAction: parsed.leftAction || current.leftAction,
        rightAction: parsed.rightAction || current.rightAction,
      }));
    } catch {
      setSwipeGestureSettings(DEFAULT_SWIPE_GESTURES);
    }
  }, [user?.id, user?.workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userSettingsKey = `inboxSwipeSettings:${user?.workspaceId || "workspace"}:${user?.id || "anonymous"}`;
    window.localStorage.setItem(userSettingsKey, JSON.stringify(swipeGestureSettings));
  }, [swipeGestureSettings, user?.id, user?.workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const weightKey = `inboxPriorityWeights:${user?.workspaceId || "workspace"}:${user?.id || "anonymous"}`;
    const stored = window.localStorage.getItem(weightKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setPriorityWeights((current) => ({
        senderReputation: typeof parsed.senderReputation === "number" ? parsed.senderReputation : current.senderReputation,
        interactionHistory: typeof parsed.interactionHistory === "number" ? parsed.interactionHistory : current.interactionHistory,
        urgencyCues: typeof parsed.urgencyCues === "number" ? parsed.urgencyCues : current.urgencyCues,
        userBehavior: typeof parsed.userBehavior === "number" ? parsed.userBehavior : current.userBehavior,
      }));
    } catch { /* ignore */ }
  }, [user?.id, user?.workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const weightKey = `inboxPriorityWeights:${user?.workspaceId || "workspace"}:${user?.id || "anonymous"}`;
    window.localStorage.setItem(weightKey, JSON.stringify(priorityWeights));
  }, [priorityWeights, user?.id, user?.workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const groupByKey = `inboxGroupBy:${user?.workspaceId || "workspace"}:${user?.id || "anonymous"}`;
    const stored = window.localStorage.getItem(groupByKey);
    if (stored === "conversation" || stored === "message") setGroupBy(stored);
  }, [user?.id, user?.workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const groupByKey = `inboxGroupBy:${user?.workspaceId || "workspace"}:${user?.id || "anonymous"}`;
    window.localStorage.setItem(groupByKey, groupBy);
  }, [groupBy, user?.id, user?.workspaceId]);

  useEffect(() => {
    if (!isMobileViewport && location.startsWith("/inbox/")) {
      navigate("/inbox", { replace: true });
    }
  }, [isMobileViewport, location, navigate]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const shell = document.querySelector("[data-sidebar-mode]");
    if (!shell) return;
    const updateMode = () => {
      const mode = shell.getAttribute("data-sidebar-mode");
      if (mode === "expanded" || mode === "compact" || mode === "hidden") setAppSidebarMode(mode);
    };
    updateMode();
    const observer = new MutationObserver(updateMode);
    observer.observe(shell, { attributes: true, attributeFilter: ["data-sidebar-mode"] });
    return () => observer.disconnect();
  }, []);

  const [forwardTo, setForwardTo] = useState("");
  const [forwardComment, setForwardComment] = useState("");
  const composeBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const replyBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const forwardCommentRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: snippets = [] } = useQuery({
    queryKey: ["/api/inbox/settings/snippets"],
    queryFn: async () => {
      const response = await axios.get('/api/inbox/settings/snippets');
      return response.data as EmailSnippet[];
    },
  });

  const snippetContentByShortcut = (Array.isArray(snippets) ? snippets : []).reduce<Record<string, string>>((acc, snippet) => {
    if (snippet.isActive) acc[snippet.shortcut] = snippet.content;
    return acc;
  }, {});

  const handleSnippetExpansionKeyDown = useCallback((
    event: KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    setValue: (next: string) => void,
    textareaRef: MutableRefObject<HTMLTextAreaElement | null>,
  ) => {
    const delimiterByKey: Record<string, string> = { ' ': ' ', Enter: '\n', Tab: '\t' };
    const delimiter = delimiterByKey[event.key];
    if (!delimiter) return;
    const start = event.currentTarget.selectionStart;
    const end = event.currentTarget.selectionEnd;
    if (start !== end) return;
    const beforeCursor = value.slice(0, start);
    const shortcutMatch = beforeCursor.match(/(^|\s)(;[\w-]+)$/);
    const shortcut = shortcutMatch?.[2];
    if (!shortcut) return;
    const snippetContent = snippetContentByShortcut[shortcut];
    if (!snippetContent) return;
    event.preventDefault();
    const shortcutStart = start - shortcut.length;
    const nextValue = `${value.slice(0, shortcutStart)}${snippetContent}${delimiter}${value.slice(end)}`;
    const nextCursor = shortcutStart + snippetContent.length + delimiter.length;
    setValue(nextValue);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) { textarea.focus(); textarea.setSelectionRange(nextCursor, nextCursor); }
    });
  }, [snippetContentByShortcut]);

  const parseCommaSeparatedValues = useCallback((value: string) => {
    return value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  }, []);

  useEffect(() => {
    if (!selectedEmail) return;
    const threadHint = `${selectedEmail.subject || ''} ${selectedEmail.snippet || ''}`.toLowerCase();
    const inferredAudienceType = selectedEmail.company ? "company_partner"
      : selectedEmail.contact ? "existing_contact"
      : /support|issue|bug|help/.test(threadHint) ? "support_requester"
      : /pricing|proposal|contract|deal|budget/.test(threadHint) ? "commercial_partner"
      : "general_business";
    const inferredToneConstraints = selectedEmail.opportunity?.confidence && selectedEmail.opportunity.confidence > 0.7
      ? ["commercially clear", "specific CTA"]
      : selectedEmail.isVip ? ["high-touch", "concise"] : [];
    setReplyAudienceProfile((current) => ({
      ...current,
      audienceType: current.autoSelect ? inferredAudienceType : current.audienceType,
      toneConstraints: current.autoSelect ? inferredToneConstraints : current.toneConstraints,
    }));
    if (replyAudienceProfile.autoSelect) {
      setReplyToneConstraintsInput(inferredToneConstraints.join(', '));
    }
  }, [selectedEmail]);

  const showUndoToast = useCallback((response: QueuedSendResponse, label: string) => {
    if (!response?.scheduled || !response.jobId || !response.sendAt) {
      toast({ title: `${label} sent`, description: `Your ${label.toLowerCase()} has been sent.` });
      return;
    }
    const sendTime = new Date(response.sendAt).getTime();
    let toastHandle: ReturnType<typeof toast> | null = null;
    let intervalId: number | undefined;
    const updateToast = () => {
      const remainingSeconds = Math.max(0, Math.ceil((sendTime - Date.now()) / 1000));
      toastHandle?.update({
        id: toastHandle.id,
        title: `${label} queued`,
        description: remainingSeconds > 0 ? `${label} sending in ${remainingSeconds}s` : `${label} dispatching now`,
        action: remainingSeconds > 0 ? (
          <ToastAction altText="Undo send" onClick={async () => {
            try {
              const cancelResponse = await axios.post(`/api/inbox/outbox/${response.jobId}/cancel`, {}, { headers: { "X-CSRF-Token": csrfToken || "" } });
              if (cancelResponse.data?.state === "cancelled" || cancelResponse.data?.state === "already_cancelled") {
                toastHandle?.dismiss();
                toast({ title: "Send undone", description: `${label} was cancelled before dispatch.` });
                return;
              }
              toast({ title: "Too late to undo", description: "The email has already been dispatched.", variant: "destructive" });
            } catch (error: any) {
              const tooLate = error?.response?.data?.state === "too_late";
              toast({ title: tooLate ? "Too late to undo" : "Failed to undo send", description: tooLate ? "The email has already been dispatched." : (error?.response?.data?.error || "An error occurred"), variant: "destructive" });
            }
          }}>Undo</ToastAction>
        ) : undefined,
      });
      if (remainingSeconds <= 0 && intervalId !== undefined) window.clearInterval(intervalId);
    };
    toastHandle = toast({ title: `${label} queued`, description: "Preparing send…", duration: Math.max((response.undoSendSeconds ?? 10) * 1000 + 4000, 6000) });
    updateToast();
    intervalId = window.setInterval(updateToast, 1000);
  }, [csrfToken, toast]);

  const refreshInboxQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inbox/folders-list"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inbox/stats"] });
  }, [queryClient]);

  const executeInboxUndo = useCallback(async (undoToken?: string, onRollback?: () => void) => {
    if (!undoToken) return;
    try {
      await axios.post(`/api/inbox/undo/${undoToken}`, {}, { headers: { "X-CSRF-Token": csrfToken || "" } });
      onRollback?.();
      delete pendingUndoRollbackRef.current[undoToken];
      refreshInboxQueries();
      toast({ title: "Action undone", description: "The inbox change was restored." });
    } catch (error: any) {
      toast({ title: "Unable to undo", description: error?.response?.data?.error || "Undo window expired or action already finalized.", variant: "destructive" });
    }
  }, [csrfToken, refreshInboxQueries, toast]);

  // ---- Queries ----
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/inbox/stats"],
    queryFn: async () => { const r = await axios.get("/api/inbox/stats"); return r.data as InboxStats; },
  });
  const { data: outlookStatus, isLoading: outlookStatusLoading } = useQuery({
    queryKey: ["/api/integrations/outlook/status"],
    queryFn: async () => { const r = await axios.get("/api/integrations/outlook/status"); return r.data; },
  });
  const isOutlookConnected = Boolean(outlookStatus?.connected);
  const { data: playbooks = [] } = useQuery({
    queryKey: ["/api/inbox/playbooks"],
    queryFn: async () => { const r = await axios.get("/api/inbox/playbooks"); return r.data as InboxPlaybook[]; },
  });
  const { data: folders = [] } = useQuery({
    queryKey: ["/api/inbox/folders-list"],
    queryFn: async () => { const r = await axios.get("/api/inbox/folders-list"); return r.data as Folder[]; },
  });
  const { data: savedSearches = [] } = useQuery({
    queryKey: ["/api/inbox/saved-searches"],
    queryFn: async () => { const r = await axios.get("/api/inbox/saved-searches"); return r.data as InboxSavedSearch[]; },
  });
  const { data: inboxTags = [] } = useQuery({
    queryKey: ["/api/inbox/tags"],
    queryFn: async () => { const r = await axios.get("/api/inbox/tags"); return r.data as InboxTag[]; },
  });
  const { data: workspaceUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => { const r = await axios.get("/api/users"); return r.data as WorkspaceUser[]; },
  });
  const { data: automationAccounts = [] } = useQuery({
    queryKey: ["/api/inbox/automations/accounts"],
    queryFn: async () => { const r = await axios.get("/api/inbox/automations/accounts"); return r.data as InboxAutomationAccount[]; },
  });
  const { data: botRoles = [] } = useQuery({
    queryKey: ["/api/inbox/settings/bot-roles"],
    queryFn: async () => { const r = await axios.get("/api/inbox/settings/bot-roles"); return (r.data?.roles || []) as InboxBotRole[]; },
  });
  const { data: automationRuns = [] } = useQuery({
    queryKey: ["/api/inbox/automations/runs"],
    queryFn: async () => {
      try {
        const r = await axios.get("/api/inbox/automations/runs");
        return Array.isArray(r.data) ? (r.data as InboxAutomationRun[]) : [];
      } catch {
        return [];
      }
    },
    refetchInterval: (query) => {
      const runs = query.state.data;
      if (Array.isArray(runs) && runs.some((run) => run.status === "queued" || run.status === "running")) return 2000;
      return false;
    },
  });
  const { data: automationLedger } = useQuery({
    queryKey: ["/api/inbox/automations/ledger", ledgerBotFilter, ledgerRiskFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (ledgerBotFilter !== 'all') params.bot = ledgerBotFilter;
      if (ledgerRiskFilter !== 'all') params.riskTier = ledgerRiskFilter;
      const r = await axios.get('/api/inbox/automations/ledger', { params });
      return r.data as InboxBotLedgerResponse;
    },
    enabled: showAutomationHistory,
    refetchInterval: 10000,
  });
  const { data: automationCandidates = [] } = useQuery({
    queryKey: ["/api/inbox/automation-candidates"],
    queryFn: async () => { const r = await axios.get('/api/inbox/automation-candidates', { params: { days: 30, minCount: 3 } }); return (r.data?.suggestions || []) as InboxAutomationCandidate[]; },
    refetchInterval: 30_000,
  });
  const { data: pendingAutomationApprovals = [] } = useQuery({
    queryKey: ["/api/inbox/automations/approvals", "pending"],
    queryFn: async () => { try { const r = await axios.get("/api/inbox/automations/approvals", { params: { status: "pending" } }); return Array.isArray(r.data) ? r.data as InboxAutomationApproval[] : []; } catch { return []; } },
    refetchInterval: 10_000,
  });
  const { data: founderQueueData, isLoading: founderQueueLoading } = useQuery({
    queryKey: ["/api/inbox/control-tower"],
    queryFn: async () => { const r = await axios.get('/api/inbox/control-tower', { params: { limit: 6 } }); return r.data as FounderQueueResponse; },
    refetchInterval: 60_000,
  });

  // ---- Mutations ----
  const automationApprovalDecisionMutation = useMutation({
    mutationFn: async (payload: { approvalId: number; decisionType: "approve_once" | "approve_pattern" | "reject"; reason?: string }) => {
      const r = await axios.post(`/api/inbox/automations/approvals/${payload.approvalId}/decision`, { decisionType: payload.decisionType, reason: payload.reason }, { headers: { "X-CSRF-Token": csrfToken || "" } });
      return r.data as InboxAutomationApproval;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/automations/approvals", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/automations/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/automations/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] });
      toast({ title: "Approval decision recorded", description: variables.decisionType === "approve_pattern" ? "Pattern approved for future automation runs." : variables.decisionType === "approve_once" ? "Action approved and executed once." : "Action rejected and logged." });
    },
    onError: (error: any) => { toast({ title: "Approval decision failed", description: error?.response?.data?.error || "Unable to submit automation approval decision.", variant: "destructive" }); },
  });

  const founderQueueDecisionMutation = useMutation({
    mutationFn: async (payload: { emailId: number; decision: "approve_draft" | "escalate" | "defer" | "hand_to_bot" }) => {
      const r = await axios.post(`/api/inbox/control-tower/${payload.emailId}/decision`, { decision: payload.decision }, { headers: { "X-CSRF-Token": csrfToken || "" } });
      return r.data as { success: boolean; decision: string };
    },
    onSuccess: (_, variables) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/control-tower"] }); toast({ title: "Founder decision saved", description: `Action: ${variables.decision.replace('_', ' ')}` }); },
    onError: () => { toast({ title: "Failed to save decision", variant: "destructive" }); },
  });

  useEffect(() => { if (!selectedAutomationAccountId && automationAccounts.length > 0) setSelectedAutomationAccountId(String(automationAccounts[0].id)); }, [automationAccounts, selectedAutomationAccountId]);
  useEffect(() => {
    if (botRoles.length === 0) return;
    const preferredRole = botRoles.find((role) => role.roleKey === selectedBotRoleKey) || botRoles.find((role) => role.isDefault) || botRoles[0];
    if (preferredRole && preferredRole.roleKey !== selectedBotRoleKey) setSelectedBotRoleKey(preferredRole.roleKey);
  }, [botRoles, selectedBotRoleKey]);

  const parseQueryMutation = useMutation({
    mutationFn: async (query: string) => { const r = await axios.post("/api/inbox/search/parse", { query }); return r.data as ParsedInboxQueryResponse; },
    onSuccess: (result) => { setInterpretedPreview(result); if (result.mode === "keyword_fallback") setInterpretedFilters({ search: searchQuery }); },
    onError: () => { setInterpretedPreview({ mode: "keyword_fallback", confidence: 0, filters: {}, compiledQuery: { search: searchQuery }, fallbackReason: "parse_failed" }); setInterpretedFilters({ search: searchQuery }); toast({ title: "Could not interpret query", description: "Using keyword-only search for now.", variant: "destructive" }); },
  });

  const compileBuilderFilters = useCallback((builder: InboxSearchBuilderState): InterpretedInboxFilters => {
    const labels = builder.tags.split(",").map((v) => v.trim()).filter(Boolean);
    return { sender: builder.from || undefined, to: builder.to || undefined, subjectContains: builder.subjectContains || undefined, keywords: builder.subjectContains ? [builder.subjectContains] : undefined, folder: builder.folder || undefined, unread: builder.unread ? true : undefined, labels: labels.length > 0 ? labels : undefined, hasAttachments: builder.hasAttachment ? true : undefined, dateFrom: builder.dateFrom || undefined, dateTo: builder.dateTo || undefined, assignedOwnerId: builder.assignedOwnerId || undefined, slaState: builder.slaState || undefined, search: [builder.from, builder.to, builder.subjectContains, ...labels].filter(Boolean).join(" ") || undefined };
  }, []);

  const hydrateBuilderFromFilters = useCallback((filters: InterpretedInboxFilters | null | undefined) => {
    if (!filters) { setSearchBuilder(DEFAULT_SEARCH_BUILDER_STATE); return; }
    setSearchBuilder({ from: filters.sender || "", to: filters.to || filters.participants?.[0] || "", subjectContains: filters.subjectContains || filters.keywords?.[0] || "", hasAttachment: Boolean(filters.hasAttachments), dateFrom: filters.dateFrom || "", dateTo: filters.dateTo || "", folder: filters.folder || "", unread: Boolean(filters.unread), tags: (filters.labels || []).join(", "), assignedOwnerId: filters.assignedOwnerId || "", slaState: filters.slaState || "" });
  }, []);

  const applySearchBuilder = useCallback(() => { const compiled = compileBuilderFilters(searchBuilder); setInterpretedFilters(compiled); setShowAdvancedSearch(true); setNaturalLanguageMode(false); }, [compileBuilderFilters, searchBuilder]);
  const resetSearchBuilder = useCallback(() => { setSearchBuilder(DEFAULT_SEARCH_BUILDER_STATE); setInterpretedFilters(null); setSearchQuery(""); }, []);

  const saveSearchMutation = useMutation({
    mutationFn: async (payload: { name: string; filters: InterpretedInboxFilters }) => { const r = await axios.post('/api/inbox/saved-searches', payload, { headers: { 'X-CSRF-Token': csrfToken || '' } }); return r.data as InboxSavedSearch; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/inbox/saved-searches'] }); setSavedSearchName(''); toast({ title: 'Saved search created' }); },
    onError: () => { toast({ title: 'Failed to save search', variant: 'destructive' }); },
  });
  const deleteSavedSearchMutation = useMutation({
    mutationFn: async (savedSearchId: number) => { await axios.delete(`/api/inbox/saved-searches/${savedSearchId}`, { headers: { 'X-CSRF-Token': csrfToken || '' } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/inbox/saved-searches'] }); toast({ title: 'Saved search deleted' }); },
    onError: () => { toast({ title: 'Failed to delete saved search', variant: 'destructive' }); },
  });

  const syncMutation = useMutation({
    mutationFn: async () => { const r = await axios.post("/api/inbox/sync", {}, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/stats"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/folders-list"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/opportunity"] }); toast({ title: "Sync completed", description: "Your inbox has been updated with the latest emails" }); },
    onError: (error: any) => { toast({ title: "Sync failed", description: error?.response?.data?.error || (error instanceof Error ? error.message : "Failed to sync emails"), variant: "destructive" }); },
  });

  const runAutomationsMutation = useMutation({
    mutationFn: async () => {
      const normalizedFolder = String(selectedFolder || "").trim();
      const normalizedAccountId = String(selectedAutomationAccountId || "").trim();
      const parsedAccountId = Number(normalizedAccountId);
      if (automationScopeType === "folder" && !normalizedFolder) { toast({ title: "Select a folder", description: "Choose a valid folder scope before running automations.", variant: "destructive" }); throw new Error("Invalid automation scope: folder"); }
      if (automationScopeType === "account" && (!normalizedAccountId || !Number.isInteger(parsedAccountId) || parsedAccountId <= 0)) { toast({ title: "Select an email account", description: "Choose a valid account scope before running automations.", variant: "destructive" }); throw new Error("Invalid automation scope: account"); }
      const payload = automationScopeType === "account" ? { scopeType: "account", scopeValue: String(parsedAccountId), botRoleKey: selectedBotRoleKey, executionTier: automationExecutionMode } : { scopeType: "folder", scopeValue: normalizedFolder, botRoleKey: selectedBotRoleKey, executionTier: automationExecutionMode };
      const r = await axios.post("/api/inbox/automations/run", payload, { headers: { "X-CSRF-Token": csrfToken || "" } });
      return r.data as { runId: number; status: string; executionMode?: "shadow" | "active"; executionTier?: "suggest-only" | "shadow" | "active"; actor?: { actedBy?: string } };
    },
    onSuccess: (result) => { setActiveAutomationRunId(result.runId); queryClient.invalidateQueries({ queryKey: ["/api/inbox/automations/runs"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/automations/ledger"] }); toast({ title: "Automation run queued", description: result.actor?.actedBy ? `${(result.executionTier || result.executionMode || "shadow").toString()} run queued with ${result.actor.actedBy}.` : "We'll keep this panel updated with progress." }); setShowAutomationHistory(true); },
    onError: (error: any) => { if (error instanceof Error && error.message.startsWith("Invalid automation scope")) return; toast({ title: "Failed to queue automations", description: error?.response?.data?.error || "Unable to trigger automations.", variant: "destructive" }); },
  });

  const retryAutomationRunMutation = useMutation({
    mutationFn: async (runId: number) => { const r = await axios.post(`/api/inbox/automations/runs/${runId}/retry`, { botRoleKey: selectedBotRoleKey }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as { runId: number; status: string; executionMode?: "shadow" | "active"; executionTier?: "suggest-only" | "shadow" | "active"; actor?: { actedBy?: string } }; },
    onSuccess: (result) => { setActiveAutomationRunId(result.runId); queryClient.invalidateQueries({ queryKey: ["/api/inbox/automations/runs"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/automations/ledger"] }); toast({ title: "Retry queued" }); },
    onError: (error: any) => { toast({ title: "Retry failed", description: error?.response?.data?.error || "Unable to retry automation run.", variant: "destructive" }); },
  });

  const markReadMutation = useMutation({
    mutationFn: async (emailIds: string[]) => { const r = await axios.post("/api/inbox/mark-read", { ids: emailIds }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return { ids: emailIds, updatedCount: Number(r.data?.updatedCount || 0) }; },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/stats"] }); if (result.ids.length > 1) { const failedCount = Math.max(0, result.ids.length - result.updatedCount); toast({ title: "Mark read complete", description: `${result.updatedCount}/${result.ids.length} updated, ${failedCount} failed.`, variant: failedCount > 0 ? "destructive" : "default" }); } },
  });

  const priorityFeedbackMutation = useMutation({
    mutationFn: async (payload: { messageId: string; action: string; predictedScore?: number; predictedBucket?: "high" | "medium" | "low"; aligned?: boolean }) => { await axios.post(`/api/inbox/messages/${payload.messageId}/priority-feedback`, payload, { headers: { "X-CSRF-Token": csrfToken || "" } }); },
  });

  const markUnreadMutation = useMutation({
    mutationFn: async (emailIds: string[]) => { const r = await axios.post("/api/inbox/mark-unread", { ids: emailIds }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return { ids: emailIds, updatedCount: Number(r.data?.updatedCount || 0) }; },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/stats"] }); if (result.ids.length > 1) toast({ title: "Mark unread complete", description: `${result.updatedCount}/${result.ids.length} updated.` }); },
  });

  const executePlaybookMutation = useMutation({
    mutationFn: async (payload: { playbookId: number; emailIds: string[] }) => { const r = await axios.post("/api/inbox/playbooks/execute", { ...payload, botRoleKey: selectedBotRoleKey }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as { success: boolean; rolledBack: boolean; actor?: { actedBy?: string }; summary: { playbookName?: string; processedEmails: number; actionsApplied: number; actionsAttempted: number; escalations?: number } }; },
    onSuccess: (result) => { toast({ title: result.rolledBack ? "Playbook rolled back" : "Playbook applied", description: `${result.summary.playbookName || "Playbook"}: ${result.summary.actionsApplied}/${result.summary.actionsAttempted} actions applied across ${result.summary.processedEmails} email(s).` }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/folders-list"] }); },
    onError: (error: any) => { toast({ title: "Playbook failed", description: error?.response?.data?.error || "Failed to apply playbook", variant: "destructive" }); },
  });

  const archiveEmailMutation = useMutation({
    mutationFn: async (messageId: string) => { const r = await axios.post(`/api/inbox/messages/${messageId}/move`, { destination: "archive" }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as InboxUndoableMutationResponse; },
    onSuccess: (result) => { setSelectedEmail(null); refreshInboxQueries(); toast({ title: "Email archived", description: "The email has been moved to archive", action: result.undoToken ? (<ToastAction altText="Undo archive" onClick={() => executeInboxUndo(result.undoToken)}>Undo</ToastAction>) : undefined }); },
    onError: (error) => { toast({ title: "Failed to archive email", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" }); },
  });

  const bulkMoveMutation = useMutation({
    mutationFn: async ({ ids, destination }: { ids: string[]; destination: string }) => { const r = await axios.post("/api/inbox/messages/bulk-move", { ids, destination }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as { processedCount: number; successCount: number; failedCount: number }; },
    onMutate: ({ ids, destination }) => { applyOptimisticMove(ids, destination); toast({ title: "Bulk move started", description: `Moving ${ids.length} email(s)…` }); },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/stats"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/folders-list"] }); toast({ title: "Bulk move complete", description: `${result.successCount}/${result.processedCount} moved.`, variant: result.failedCount > 0 ? "destructive" : "default" }); setSelectedEmails(new Set()); },
    onError: (error: any) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); toast({ title: "Bulk move failed", description: error?.response?.data?.error || "Failed to move selected emails.", variant: "destructive" }); },
  });

  const bulkOwnerMutation = useMutation({
    mutationFn: async ({ ids, ownerId }: { ids: string[]; ownerId: string | null }) => { const r = await axios.post("/api/inbox/messages/bulk-owner", { ids, ownerId }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as { processedCount: number; successCount: number; failedCount: number }; },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); toast({ title: "Owner assignment complete", description: `${result.successCount}/${result.processedCount} updated.` }); },
    onError: (error: any) => { toast({ title: "Owner assignment failed", description: error?.response?.data?.error || "Failed to update owner assignment.", variant: "destructive" }); },
  });

  const bulkTagsMutation = useMutation({
    mutationFn: async ({ ids, tagIds, mode }: { ids: string[]; tagIds: number[]; mode: "add" | "remove" }) => { const r = await axios.post("/api/inbox/messages/bulk-tags", { ids, tagIds, mode }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as { processedCount: number; successCount: number; failedCount: number; affectedAssignments: number; mode: "add" | "remove" }; },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); toast({ title: result.mode === "add" ? "Tags applied" : "Tags removed", description: `${result.successCount}/${result.processedCount} updated.` }); },
    onError: (error: any) => { toast({ title: "Tag update failed", description: error?.response?.data?.error || "Failed to update tags.", variant: "destructive" }); },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string[]; subject: string; body: string; attachments: ComposeAttachment[] }) => { const r = await axios.post("/api/inbox/send", data, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as QueuedSendResponse; },
    onSuccess: (response) => { showUndoToast(response, "Email"); setComposeOpen(false); setComposeDraftId(null); setComposeTo(""); setComposeSubject(""); setComposeBody(""); setComposeAttachments([]); queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); },
    onError: (error: any) => { toast({ title: "Failed to send email", description: error?.response?.data?.error || (error instanceof Error ? error.message : "An error occurred"), variant: "destructive" }); },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data: { draftId?: string; to: string[]; subject: string; body: string }) => {
      if (data.draftId) { const r = await axios.patch(`/api/inbox/drafts/${data.draftId}`, { to: data.to, subject: data.subject, body: data.body }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return { ...r.data, draftId: data.draftId }; }
      const r = await axios.post('/api/inbox/drafts', { to: data.to, subject: data.subject, body: data.body }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data;
    },
    onSuccess: (data) => { if (data?.draftId) setComposeDraftId(data.draftId); toast({ title: "Draft saved" }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); },
    onError: (error: any) => { toast({ title: "Failed to save draft", description: error?.response?.data?.error || "An error occurred", variant: "destructive" }); },
  });

  const sendDraftMutation = useMutation({
    mutationFn: async (draftId: string) => { const r = await axios.post(`/api/inbox/drafts/${draftId}/send`, {}, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data; },
    onSuccess: () => { toast({ title: "Draft sent" }); setComposeOpen(false); setComposeDraftId(null); setComposeTo(""); setComposeSubject(""); setComposeBody(""); queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); },
    onError: (error: any) => { toast({ title: "Failed to send draft", description: error?.response?.data?.error || "An error occurred", variant: "destructive" }); },
  });

  const forwardEmailMutation = useMutation({
    mutationFn: async (data: { messageId: string; to: string[]; comment?: string }) => { const r = await axios.post(`/api/inbox/messages/${data.messageId}/forward`, { to: data.to, comment: data.comment }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as QueuedSendResponse; },
    onSuccess: (response) => { showUndoToast(response, "Forward"); setForwardOpen(false); setForwardTo(""); setForwardComment(""); },
    onError: (error: any) => { toast({ title: "Failed to forward email", description: error?.response?.data?.error || "An error occurred", variant: "destructive" }); },
  });

  const generateReplyAiDraftMutation = useMutation({
    mutationFn: async (data: { messageId: string }) => {
      const r = await axios.post(`/api/inbox/reply/${data.messageId}`, { writeWithAi: { mode: replyAiMode, audienceProfileConfig: { ...replyAudienceProfile, toneConstraints: parseCommaSeparatedValues(replyToneConstraintsInput), bannedPhrasing: parseCommaSeparatedValues(replyBannedPhrasingInput) }, threadContext: { conversationId: selectedEmail?.conversationId, contactId: selectedEmail?.contact?.id, companyId: selectedEmail?.company?.id, recentMessages: selectedEmail ? [{ from: selectedEmail.senderEmail || selectedEmail.senderName, body: selectedEmail.snippet || selectedEmail.subject }] : [] } } }, { headers: { "X-CSRF-Token": csrfToken || "" } });
      return r.data as { ai?: { draft?: { subject?: string; body?: string }; rationale?: string[]; confidence?: number; provenance?: Record<string, unknown> } };
    },
    onSuccess: (response) => { const body = response?.ai?.draft?.body || ""; setReplyBody(body); setReplyAiTelemetry({ confidence: response?.ai?.confidence, provenance: response?.ai?.provenance || null, rationale: Array.isArray(response?.ai?.rationale) ? response.ai!.rationale!.join("\n") : "", originalBody: body }); toast({ title: "AI draft generated" }); },
    onError: (error: any) => { toast({ title: "Failed to generate AI draft", description: error?.response?.data?.error || "An error occurred", variant: "destructive" }); },
  });

  const saveDraftLearningSignalMutation = useMutation({
    mutationFn: async (data: { messageId: string; conversationId?: string; bodyBefore: string; bodyAfter: string; rationaleBefore?: string; rationaleAfter?: string; confidence?: number }) => {
      await axios.post('/api/inbox/draft-learning-signal', { mode: replyAiMode, messageId: data.messageId, conversationId: data.conversationId, contactId: selectedEmail?.contact?.id, companyId: selectedEmail?.company?.id, audienceProfile: { audienceType: replyAudienceProfile.audienceType, toneConstraints: parseCommaSeparatedValues(replyToneConstraintsInput), bannedPhrasing: parseCommaSeparatedValues(replyBannedPhrasingInput) }, originalDraft: { body: data.bodyBefore, rationale: data.rationaleBefore }, editedDraft: { body: data.bodyAfter, rationale: data.rationaleAfter }, confidence: data.confidence }, { headers: { "X-CSRF-Token": csrfToken || "" } });
    },
  });

  const replyEmailMutation = useMutation({
    mutationFn: async (data: { messageId: string; body: string; replyAll?: boolean }) => { const r = await axios.post(`/api/inbox/reply/${data.messageId}`, { body: data.body, replyAll: data.replyAll }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as QueuedSendResponse; },
    onSuccess: (response) => { showUndoToast(response, "Reply"); setReplyOpen(false); setReplyBody(""); setReplyAiTelemetry(null); queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); },
    onError: (error: any) => { toast({ title: "Failed to send reply", description: error?.response?.data?.error || (error instanceof Error ? error.message : "An error occurred"), variant: "destructive" }); },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (messageId: string) => { const r = await axios.delete(`/api/inbox/messages/${messageId}`, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data as InboxUndoableMutationResponse; },
    onSuccess: (result) => { setDeleteDialogOpen(false); setSelectedEmail(null); refreshInboxQueries(); toast({ title: "Email deleted", description: "The email has been moved to trash", action: result.undoToken ? (<ToastAction altText="Undo delete" onClick={() => executeInboxUndo(result.undoToken)}>Undo</ToastAction>) : undefined }); },
    onError: (error) => { toast({ title: "Failed to delete email", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" }); },
  });

  const createOpportunityDealMutation = useMutation({
    mutationFn: async (messageId: string) => { const r = await axios.post(`/api/inbox/messages/${messageId}/opportunity-signal/create-deal`, {}, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data; },
    onSuccess: () => { toast({ title: "Deal draft created" }); queryClient.invalidateQueries({ queryKey: ["/api/sponsorships"] }); queryClient.invalidateQueries({ queryKey: ["/api/inbox/opportunity"] }); },
    onError: (error: any) => { toast({ title: "Failed to create deal", description: error?.response?.data?.error || "An error occurred", variant: "destructive" }); },
  });

  const createOpportunityTaskMutation = useMutation({
    mutationFn: async (emailDbId: number) => { const r = await axios.post(`/api/inbox/emails/${emailDbId}/generate-task`, {}, { headers: { "X-CSRF-Token": csrfToken || "" } }); return r.data; },
    onSuccess: () => { toast({ title: "Task created" }); queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
    onError: (error: any) => { toast({ title: "Failed to create task", description: error?.response?.data?.error || "An error occurred", variant: "destructive" }); },
  });

  const pinEmailMutation = useMutation({
    mutationFn: async ({ messageId, pinned }: { messageId: string; pinned: boolean }) => { await axios.post(`/api/inbox/messages/${messageId}/pin`, { pinned }, { headers: { "X-CSRF-Token": csrfToken || "" } }); return { messageId, pinned }; },
    onSuccess: ({ messageId, pinned }) => { queryClient.invalidateQueries({ queryKey: ["/api/inbox/messages"] }); setSelectedEmail((current) => current && current.id === messageId ? { ...current, pinned } : current); setInboxEmails((current) => current.map((email) => email.id === messageId ? { ...email, pinned } : email)); toast({ title: pinned ? "Message pinned" : "Message unpinned" }); },
    onError: (error) => { toast({ title: "Failed to update pin", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" }); },
  });

  // ---- Handlers ----
  const mapFolderKeyToDestination = (folderKey: string) => {
    if (folderKey.startsWith("folder-")) return folderKey;
    const folderMap: Record<string, string> = { inbox: "inbox", sent: "sentitems", drafts: "drafts", junk: "junkemail", archive: "archive", trash: "deleteditems" };
    return folderMap[folderKey] || folderKey;
  };
  const resolveFolderIdForKey = (folderKey: string, foldersArr: Folder[]) => {
    if (folderKey.startsWith("folder-")) { const customFolderId = Number(folderKey.replace("folder-", "")); return Number.isNaN(customFolderId) ? undefined : customFolderId; }
    const systemFolderNameMap: Record<string, string> = { inbox: "Inbox", sent: "Sent", drafts: "Drafts", junk: "Junk", archive: "Archive", trash: "Trash" };
    const expectedName = systemFolderNameMap[folderKey];
    return foldersArr.find((folder) => folder.name === expectedName)?.id;
  };
  const applyOptimisticMove = useCallback((emailIds: string[], destinationFolder: string) => {
    const foldersArr = (queryClient.getQueryData(["/api/inbox/folders-list"]) as Folder[] | undefined) || [];
    const emailIdsSet = new Set(emailIds);
    queryClient.setQueriesData({ queryKey: ["/api/inbox/messages"] }, (oldData: unknown) => { if (!Array.isArray(oldData)) return oldData; return (oldData as EmailMessage[]).filter((email) => !emailIdsSet.has(email.id)); });
    setInboxEmails((current) => current.filter((email) => !emailIdsSet.has(email.id)));
    setSelectedEmails((current) => { const next = new Set(current); emailIds.forEach((emailId) => next.delete(emailId)); return next; });
    if (selectedEmail && emailIdsSet.has(selectedEmail.id)) { const destinationFolderId = resolveFolderIdForKey(destinationFolder, foldersArr); setSelectedEmail((current) => { if (!current || !emailIdsSet.has(current.id)) return current; return { ...current, folderId: destinationFolderId }; }); }
  }, [queryClient, selectedEmail]);

  const handleDropEmailToFolder = useCallback(async (emailIds: string[], destinationFolder: string) => {
    const uniqueEmailIds = Array.from(new Set(emailIds)).filter(Boolean);
    if (uniqueEmailIds.length === 0 || destinationFolder === selectedFolder) return;
    const messageSnapshots = queryClient.getQueriesData({ queryKey: ["/api/inbox/messages"] });
    const selectedEmailSnapshot = selectedEmail;
    const selectedEmailsSnapshot = new Set(selectedEmails);
    const inboxEmailsSnapshot = inboxEmails;
    const rollback = () => { messageSnapshots.forEach(([queryKey, data]) => { queryClient.setQueryData(queryKey, data); }); setSelectedEmail(selectedEmailSnapshot); setSelectedEmails(selectedEmailsSnapshot); setInboxEmails(inboxEmailsSnapshot); };
    applyOptimisticMove(uniqueEmailIds, destinationFolder);
    try {
      const responses = await Promise.all(uniqueEmailIds.map((emailId) => axios.post(`/api/inbox/messages/${emailId}/move`, { destination: mapFolderKeyToDestination(destinationFolder) }, { headers: { "X-CSRF-Token": csrfToken || "" } })));
      refreshInboxQueries();
      const undoToken = uniqueEmailIds.length === 1 ? (responses[0]?.data?.undoToken as string | undefined) : undefined;
      if (undoToken) pendingUndoRollbackRef.current[undoToken] = rollback;
      toast({ title: uniqueEmailIds.length > 1 ? "Messages moved" : "Email moved", description: uniqueEmailIds.length > 1 ? `${uniqueEmailIds.length} messages were moved successfully.` : "Email moved successfully.", action: undoToken ? (<ToastAction altText="Undo move" onClick={() => executeInboxUndo(undoToken, pendingUndoRollbackRef.current[undoToken])}>Undo</ToastAction>) : undefined });
    } catch (error) { rollback(); toast({ title: "Failed to move email", description: error instanceof Error ? error.message : "Unable to move this email.", variant: "destructive" }); }
  }, [applyOptimisticMove, csrfToken, executeInboxUndo, inboxEmails, queryClient, refreshInboxQueries, selectedEmail, selectedEmails, selectedFolder, toast]);

  const handleSoftDeleteEmail = useCallback((email: EmailMessage) => { if (selectedFolder === "trash") return; handleDropEmailToFolder([email.id], "trash"); }, [handleDropEmailToFolder, selectedFolder]);

  const handleEmailSelect = useCallback((email: EmailMessage) => {
    setSelectedEmail(email);
    priorityFeedbackMutation.mutate({ messageId: email.id, action: "open", predictedScore: email.priority?.score, predictedBucket: email.priority?.bucket, aligned: email.priority?.bucket !== "low" });
    if (isMobileViewport) navigate(`/inbox/${encodeURIComponent(email.id)}`);
    if (!email.isRead) markReadMutation.mutate([email.id]);
  }, [isMobileViewport, markReadMutation, navigate, priorityFeedbackMutation]);

  const handleMobileBackToList = useCallback(() => { navigate("/inbox"); }, [navigate]);
  const handleToggleSelect = useCallback((emailId: string) => { setSelectedEmails((prev) => { const next = new Set(prev); if (next.has(emailId)) next.delete(emailId); else next.add(emailId); return next; }); }, []);
  const handleSelectAll = useCallback((emailIds: string[]) => { setSelectedEmails((prev) => { const hasAllSelected = emailIds.length > 0 && emailIds.every((emailId) => prev.has(emailId)); if (hasAllSelected) { const next = new Set(prev); emailIds.forEach((emailId) => next.delete(emailId)); return next; } const next = new Set(prev); emailIds.forEach((emailId) => next.add(emailId)); return next; }); }, []);
  const handleExecutePlaybook = useCallback((playbookId: number, emailIds: string[]) => { executePlaybookMutation.mutate({ playbookId, emailIds }); }, [executePlaybookMutation]);
  const handlePromoteCandidate = useCallback((candidate: InboxAutomationCandidate) => { setPromotedCandidate(candidate); setShowRuleBuilder(true); }, []);

  const handleTogglePinned = useCallback((email: EmailMessage) => {
    const willPin = !email.pinned;
    pinEmailMutation.mutate({ messageId: email.id, pinned: willPin });
    priorityFeedbackMutation.mutate({ messageId: email.id, action: willPin ? "pin" : "unpin", predictedScore: email.priority?.score, predictedBucket: email.priority?.bucket, aligned: willPin ? email.priority?.bucket !== "low" : true });
  }, [pinEmailMutation, priorityFeedbackMutation]);

  const handleSwipeAction = useCallback((email: EmailMessage, _direction: "left" | "right", action: SwipeActionType) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(18);
    switch (action) {
      case "archive": handleDropEmailToFolder([email.id], "archive"); break;
      case "delete": if (selectedFolder === "trash") return; handleDropEmailToFolder([email.id], "trash"); break;
      case "pin": handleTogglePinned(email); break;
      case "read": if (email.isRead) markUnreadMutation.mutate([email.id]); else markReadMutation.mutate([email.id]); break;
      case "snooze": handleDropEmailToFolder([email.id], "archive"); break;
      case "none": default: break;
    }
  }, [handleDropEmailToFolder, handleTogglePinned, markReadMutation, markUnreadMutation, selectedFolder]);

  useEffect(() => {
    const handleKeyDown = (event: Event) => {
      const kbEvent = event as globalThis.KeyboardEvent;
      if (kbEvent.key.toLowerCase() === "k" && (kbEvent.metaKey || kbEvent.ctrlKey) && kbEvent.shiftKey) { kbEvent.preventDefault(); kbEvent.stopPropagation(); setCommandPaletteOpen((prev) => !prev); }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const selectEmailByOffset = useCallback((offset: number) => {
    if (inboxEmails.length === 0) return;
    const currentIndex = selectedEmail ? inboxEmails.findIndex((email) => email.id === selectedEmail.id) : -1;
    const fallbackIndex = offset > 0 ? 0 : inboxEmails.length - 1;
    const nextIndex = currentIndex === -1 ? fallbackIndex : Math.min(Math.max(currentIndex + offset, 0), inboxEmails.length - 1);
    handleEmailSelect(inboxEmails[nextIndex]);
  }, [handleEmailSelect, inboxEmails, selectedEmail]);

  useInboxShortcuts({
    enabled: !composeOpen && !replyOpen && !deleteDialogOpen && !shortcutHelpOpen,
    onDelete: () => { if (selectedEmail) setDeleteDialogOpen(true); },
    onArchive: () => { if (selectedEmail && !archiveEmailMutation.isPending) archiveEmailMutation.mutate(selectedEmail.id); },
    onReply: () => { if (selectedEmail) setReplyOpen(true); },
    onMarkUnread: () => { if (selectedEmail && !markUnreadMutation.isPending) markUnreadMutation.mutate([selectedEmail.id]); },
    onNextMessage: () => selectEmailByOffset(1),
    onPreviousMessage: () => selectEmailByOffset(-1),
    onToggleHelp: () => setShortcutHelpOpen((prev) => !prev),
  });

  useEffect(() => {
    if (!naturalLanguageMode) { setInterpretedFilters(null); setInterpretedPreview(null); return; }
    if (!searchQuery.trim()) { setInterpretedFilters(null); setInterpretedPreview(null); return; }
    const timeout = window.setTimeout(() => { parseQueryMutation.mutate(searchQuery); }, 350);
    return () => window.clearTimeout(timeout);
  }, [naturalLanguageMode, searchQuery]);

  const applyInterpretedFilters = useCallback(() => { if (interpretedPreview?.compiledQuery) setInterpretedFilters(interpretedPreview.compiledQuery); }, [interpretedPreview]);
  const convertInterpretedToBuilder = useCallback(() => { if (!interpretedPreview?.compiledQuery) return; hydrateBuilderFromFilters(interpretedPreview.compiledQuery); setInterpretedFilters(interpretedPreview.compiledQuery); setShowAdvancedSearch(true); }, [hydrateBuilderFromFilters, interpretedPreview]);
  const clearInterpretedFilters = useCallback(() => { setInterpretedFilters(null); setInterpretedPreview(null); }, []);
  const handleApplySavedSearch = useCallback((savedSearch: InboxSavedSearch) => { hydrateBuilderFromFilters(savedSearch.filters); setInterpretedFilters(savedSearch.filters); if (savedSearch.filters.search) setSearchQuery(savedSearch.filters.search); setShowAdvancedSearch(true); }, [hydrateBuilderFromFilters]);

  const latestAutomationRun = automationRuns[0] || null;
  const canRunAutomations = automationScopeType === "folder" ? Boolean(selectedFolder) : Boolean(selectedAutomationAccountId);
  const founderQueueItems = founderQueueData?.queue || [];
  const pendingApprovalItems = pendingAutomationApprovals.slice(0, 4);
  const founderDecisionLabels: Record<"approve_draft" | "escalate" | "defer" | "hand_to_bot", string> = { approve_draft: "Send reply", escalate: "Flag for team", defer: "Decide later", hand_to_bot: "Let AI handle" };

  const handleComposeFileSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextAttachments = await Promise.all(Array.from(files).map(async (file) => {
      const content = await file.arrayBuffer();
      const binary = new Uint8Array(content);
      let result = "";
      binary.forEach((byte) => { result += String.fromCharCode(byte); });
      return { name: file.name, contentType: file.type || "application/octet-stream", contentBytesBase64: btoa(result), size: file.size };
    }));
    setComposeAttachments((current) => [...current, ...nextAttachments]);
  };

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-3xl bg-card p-12 text-center shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.05)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.3),-12px_-12px_24px_rgba(255,255,255,0.02)] border border-border">
          <p className="text-muted-foreground">Please log in to access your inbox.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    document.title = "Unified Inbox | Desmily CRM";
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] pb-20 sm:pb-0" data-app-sidebar-mode={appSidebarMode}>
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <InboxIcon className="h-5 w-5" />
              Inbox
            </h1>
            <div className="hidden md:flex items-center gap-3 ml-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MailIcon className="h-3.5 w-3.5" />
                {statsLoading ? <div className="h-4 w-6 bg-muted rounded animate-pulse" /> : <span className="font-semibold text-foreground">{stats?.unreadEmails || 0}</span>}
                <span>unread</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                {statsLoading ? <div className="h-4 w-6 bg-muted rounded animate-pulse" /> : <span className="font-semibold text-foreground">{stats?.todayEmails || 0}</span>}
                <span>today</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
            <div className="relative w-full max-w-xs sm:max-w-none sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="search" aria-label="Quick search emails" placeholder="Quick search emails" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if (!naturalLanguageMode) setInterpretedFilters(null); }} className="w-full sm:w-48 lg:w-64 pl-9 pr-3 py-2 min-h-11 sm:min-h-0 text-sm rounded-xl bg-background text-foreground placeholder:text-muted-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.04)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.01)] border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button onClick={() => { setNaturalLanguageMode((prev) => !prev); setInterpretedFilters(null); setInterpretedPreview(null); }} className={`hidden xl:inline-flex px-2 py-1.5 rounded-lg border border-border text-xs font-medium transition-all ${naturalLanguageMode ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground"}`} title="Natural language mode">NL</button>
            <button onClick={handleToggleAdvancedSearch} className={`hidden xl:inline-flex px-2 py-1.5 rounded-lg border border-border text-xs font-medium transition-all ${showAdvancedSearch ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground"}`} title="Advanced search"><SlidersHorizontalIcon className="h-3.5 w-3.5 mr-1" />Advanced</button>
            <button onClick={() => setFilterUnread(!filterUnread)} className={`hidden lg:inline-flex p-1.5 rounded-lg border border-border transition-all ${filterUnread ? "bg-primary/10 text-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08)]" : "bg-background text-muted-foreground hover:text-foreground shadow-[2px_2px_4px_rgba(0,0,0,0.08),-2px_-2px_4px_rgba(255,255,255,0.04)]"}`} title="Filter unread"><FilterIcon className="h-3.5 w-3.5" /></button>
            <button onClick={() => setCommandPaletteOpen(true)} className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-background text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05)] border border-border" title="Inbox actions"><SearchIcon className="h-3.5 w-3.5" />Actions<span className="text-[10px] text-muted-foreground">⌘⇧K</span></button>
            <button onClick={() => setFilterVipOnly(!filterVipOnly)} className={`hidden xl:inline-flex px-2 py-1.5 rounded-lg border border-border text-xs font-medium transition-all ${filterVipOnly ? "bg-amber-100 text-amber-700" : "bg-background text-muted-foreground hover:text-foreground"}`} title="VIP only">VIP only</button>
            <button onClick={() => setGroupBy((current) => current === "message" ? "conversation" : "message")} className={`hidden xl:inline-flex px-2 py-1.5 rounded-lg border border-border text-xs font-medium transition-all ${groupBy === "conversation" ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground"}`} title="Grouped by thread">Grouped by thread</button>
            <button onClick={() => setFilterHighPriorityOnly(!filterHighPriorityOnly)} className={`hidden xl:inline-flex px-2 py-1.5 rounded-lg border border-border text-xs font-medium transition-all ${filterHighPriorityOnly ? "bg-red-100 text-red-700" : "bg-background text-muted-foreground hover:text-foreground"}`} title="High priority only">High priority only</button>
            <button onClick={() => setFilterPinnedOnly(!filterPinnedOnly)} className={`hidden xl:inline-flex px-2 py-1.5 rounded-lg border border-border text-xs font-medium transition-all ${filterPinnedOnly ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground"}`} title="Pinned only"><span className="inline-flex items-center gap-1"><PinIcon className="h-3 w-3" />Pinned only</span></button>
            <button onClick={() => setMobileActionsOpen(true)} className="sm:hidden h-11 min-w-11 px-3 rounded-lg border border-border bg-background text-foreground" title="Inbox quick actions"><SlidersHorizontalIcon className="h-4 w-4" /></button>
            <button onClick={() => { setComposeOpen(true); setComposeDraftId(null); }} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-primary text-primary-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05)] hover:scale-95 active:scale-90"><PlusIcon className="h-3.5 w-3.5" />Compose</button>
            <div className="flex flex-col items-end gap-1">
              <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || outlookStatusLoading || !isOutlookConnected} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-background text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05)] hover:scale-95 active:scale-90 border border-border disabled:opacity-50" title={!isOutlookConnected ? "Connect Outlook to enable sync" : undefined}><RefreshCwIcon className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />Sync</button>
              {!outlookStatusLoading && !isOutlookConnected && <p className="text-xs text-muted-foreground">Connect Outlook to enable inbox sync.</p>}
            </div>
            {!isOutlookConnected && (
              <button onClick={async () => { try { const response = await fetch("/api/integrations/outlook/auth", { method: "GET", credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json" } }); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const data = await response.json(); if (data.success && data.url) window.location.href = data.url; } catch (error) { console.error("Error connecting to Outlook:", error); } }} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-primary text-primary-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all hover:scale-95"><ExternalLinkIcon className="h-3.5 w-3.5" />Connect</button>
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex-shrink-0 px-4 py-1.5 border-b border-border bg-card flex items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
          <button onClick={() => setInboxTab("emails")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${inboxTab === "emails" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><MailIcon className="h-3.5 w-3.5 inline mr-1.5" />Emails</button>
          <button onClick={() => setInboxTab("review")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition relative ${inboxTab === "review" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <EyeIcon className="h-3.5 w-3.5 inline mr-1.5" />Needs review
            {(founderQueueItems.length > 0 || pendingApprovalItems.length > 0) && <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">{founderQueueItems.length + pendingApprovalItems.length}</span>}
          </button>
        </div>
        {inboxTab === "emails" && (
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            {[{ value: "focused", label: "Focused" }, { value: "all", label: "All" }, { value: "others", label: "Others" }].map((lane) => (
              <button key={lane.value} onClick={() => setSelectedLane(lane.value as "all" | "focused" | "others")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${selectedLane === lane.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{lane.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Review tab */}
      {inboxTab === "review" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-muted/10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Opportunities to review</h2>
              <span className="text-xs text-muted-foreground">{founderQueueItems.length} {founderQueueItems.length === 1 ? "email" : "emails"}</span>
            </div>
            {founderQueueLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : founderQueueItems.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-4 text-center"><p className="text-sm text-muted-foreground">No sponsorship, collaboration, or partnership opportunities need your review right now.</p></div>
            ) : (
              <div className="space-y-2">
                {founderQueueItems.map((item) => {
                  const priorityLabel = item.score.priorityScore >= 0.7 ? "High" : item.score.priorityScore >= 0.4 ? "Medium" : "Low";
                  const priorityColor = item.score.priorityScore >= 0.7 ? "bg-red-100 text-red-700" : item.score.priorityScore >= 0.4 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                  const slaLabel = item.outcomeSla ? item.outcomeSla.state === "breached" ? "Overdue" : item.outcomeSla.state === "at_risk" ? "Due soon" : "On track" : null;
                  const slaColor = item.outcomeSla ? item.outcomeSla.state === "breached" ? "bg-red-100 text-red-700" : item.outcomeSla.state === "at_risk" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700" : "";
                  return (
                    <div key={item.emailId} className="rounded-lg border border-border bg-background p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium line-clamp-1">{item.subject}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityColor}`}>{priorityLabel} priority</span>
                          {slaLabel && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${slaColor}`}>{slaLabel}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.sender} · {new Date(item.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                        {item.actions.map((decision) => (
                          <Button key={decision} type="button" size="sm" variant={decision === "approve_draft" ? "default" : "outline"} className="h-8 px-3 text-xs" disabled={founderQueueDecisionMutation.isPending} onClick={() => founderQueueDecisionMutation.mutate({ emailId: item.emailId, decision })}>
                            {decision === "approve_draft" && <CheckIcon className="h-3.5 w-3.5 mr-1.5" />}
                            {decision === "escalate" && <ShieldAlertIcon className="h-3.5 w-3.5 mr-1.5" />}
                            {decision === "defer" && <Clock3Icon className="h-3.5 w-3.5 mr-1.5" />}
                            {decision === "hand_to_bot" && <BotIcon className="h-3.5 w-3.5 mr-1.5" />}
                            {founderDecisionLabels[decision]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Automation approvals</h2>
              <span className="text-xs text-muted-foreground">{pendingAutomationApprovals.length} pending</span>
            </div>
            {pendingApprovalItems.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-4 text-center"><p className="text-sm text-muted-foreground">No automations waiting for approval.</p></div>
            ) : (
              <div className="space-y-2">
                {pendingApprovalItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-background p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium line-clamp-1">{item.subject || '(No subject)'}</p>
                      <p className="text-xs text-muted-foreground">{item.senderEmail || 'Unknown sender'} · {item.actionType}</p>
                      <p className="text-xs text-muted-foreground">{item.policyReason || 'Needs your approval before proceeding.'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      <Button size="sm" className="h-8 px-3 text-xs" disabled={automationApprovalDecisionMutation.isPending} onClick={() => automationApprovalDecisionMutation.mutate({ approvalId: item.id, decisionType: 'approve_once' })}><CheckIcon className="h-3.5 w-3.5 mr-1.5" />Approve</Button>
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs" disabled={automationApprovalDecisionMutation.isPending} onClick={() => automationApprovalDecisionMutation.mutate({ approvalId: item.id, decisionType: 'approve_pattern' })}>Always allow this</Button>
                      <Button size="sm" variant="destructive" className="h-8 px-3 text-xs" disabled={automationApprovalDecisionMutation.isPending} onClick={() => automationApprovalDecisionMutation.mutate({ approvalId: item.id, decisionType: 'reject', reason: 'Rejected from inbox review queue.' })}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {inboxTab === "emails" && selectedEmails.size > 0 && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{selectedEmails.size} selected</span>
          <select value={selectedBulkFolder} onChange={(e) => setSelectedBulkFolder(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="">Move to folder</option>{folders.map((folder) => <option key={folder.id} value={folder.type === "custom" ? `folder-${folder.id}` : folder.name.toLowerCase()}>{folder.name}</option>)}</select>
          <Button size="sm" variant="outline" disabled={!selectedBulkFolder || bulkMoveMutation.isPending} onClick={() => bulkMoveMutation.mutate({ ids: Array.from(selectedEmails), destination: selectedBulkFolder })}>Move</Button>
          <Button size="sm" variant="outline" disabled={bulkMoveMutation.isPending} onClick={() => bulkMoveMutation.mutate({ ids: Array.from(selectedEmails), destination: "archive" })}>Archive</Button>
          <Button size="sm" variant="outline" disabled={bulkMoveMutation.isPending} onClick={() => bulkMoveMutation.mutate({ ids: Array.from(selectedEmails), destination: "trash" })}>Delete</Button>
          <Button size="sm" variant="outline" disabled={markReadMutation.isPending} onClick={() => markReadMutation.mutate(Array.from(selectedEmails))}>Mark read</Button>
          <Button size="sm" variant="outline" disabled={markUnreadMutation.isPending} onClick={() => markUnreadMutation.mutate(Array.from(selectedEmails))}>Mark unread</Button>
          <select value={selectedBulkOwnerId} onChange={(e) => setSelectedBulkOwnerId(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="">Assign owner</option><option value="unassigned">Unassign owner</option>{workspaceUsers.map((wu) => <option key={wu.id} value={String(wu.id)}>{`${wu.firstName || ""} ${wu.lastName || ""}`.trim() || wu.email}</option>)}</select>
          <Button size="sm" variant="outline" disabled={!selectedBulkOwnerId || bulkOwnerMutation.isPending} onClick={() => bulkOwnerMutation.mutate({ ids: Array.from(selectedEmails), ownerId: selectedBulkOwnerId === "unassigned" ? null : selectedBulkOwnerId })}>Set owner</Button>
          <select value={selectedBulkTagId} onChange={(e) => setSelectedBulkTagId(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="">Tags</option>{inboxTags.map((tag) => <option key={tag.id} value={String(tag.id)}>{tag.name}</option>)}</select>
          <Button size="sm" variant="outline" disabled={!selectedBulkTagId || bulkTagsMutation.isPending} onClick={() => bulkTagsMutation.mutate({ ids: Array.from(selectedEmails), tagIds: [Number(selectedBulkTagId)], mode: "add" })}>Apply tag</Button>
          <Button size="sm" variant="outline" disabled={!selectedBulkTagId || bulkTagsMutation.isPending} onClick={() => bulkTagsMutation.mutate({ ids: Array.from(selectedEmails), tagIds: [Number(selectedBulkTagId)], mode: "remove" })}>Remove tag</Button>
          <select value={selectedBulkPlaybookId} onChange={(e) => setSelectedBulkPlaybookId(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="">Pick playbook</option>{playbooks.map((pb) => <option key={pb.id} value={String(pb.id)}>{pb.name}</option>)}</select>
          <Button size="sm" variant="outline" disabled={!selectedBulkPlaybookId || executePlaybookMutation.isPending} onClick={() => handleExecutePlaybook(Number(selectedBulkPlaybookId), Array.from(selectedEmails))}><WandSparklesIcon className="h-3.5 w-3.5 mr-1" />{executePlaybookMutation.isPending ? "Applying..." : "Run playbook"}</Button>
        </div>
      )}

      {/* Advanced search */}
      {inboxTab === "emails" && showAdvancedSearch && (
        <div className="mx-4 mt-2 rounded-xl border border-border bg-card p-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div><Label htmlFor="adv-from">From</Label><Input id="adv-from" value={searchBuilder.from} onChange={(e) => setSearchBuilder((c) => ({ ...c, from: e.target.value }))} placeholder="name@company.com" /></div>
            <div><Label htmlFor="adv-to">To</Label><Input id="adv-to" value={searchBuilder.to} onChange={(e) => setSearchBuilder((c) => ({ ...c, to: e.target.value }))} placeholder="recipient (best effort)" /></div>
            <div><Label htmlFor="adv-subject">Subject contains</Label><Input id="adv-subject" value={searchBuilder.subjectContains} onChange={(e) => setSearchBuilder((c) => ({ ...c, subjectContains: e.target.value }))} placeholder="partnership" /></div>
            <div><Label htmlFor="adv-date-from">Date from</Label><Input id="adv-date-from" type="date" value={searchBuilder.dateFrom ? searchBuilder.dateFrom.slice(0, 10) : ""} onChange={(e) => setSearchBuilder((c) => ({ ...c, dateFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : "" }))} /></div>
            <div><Label htmlFor="adv-date-to">Date to</Label><Input id="adv-date-to" type="date" value={searchBuilder.dateTo ? searchBuilder.dateTo.slice(0, 10) : ""} onChange={(e) => setSearchBuilder((c) => ({ ...c, dateTo: e.target.value ? `${e.target.value}T23:59:59.999Z` : "" }))} /></div>
            <div><Label htmlFor="adv-folder">Folder</Label><select id="adv-folder" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={searchBuilder.folder} onChange={(e) => setSearchBuilder((c) => ({ ...c, folder: e.target.value }))}><option value="">Any folder</option>{folders.map((f) => <option key={f.id} value={f.type === "custom" ? `folder-${f.id}` : f.name.toLowerCase()}>{f.name}</option>)}</select></div>
            <div><Label htmlFor="adv-tags">Tags</Label><Input id="adv-tags" value={searchBuilder.tags} onChange={(e) => setSearchBuilder((c) => ({ ...c, tags: e.target.value }))} placeholder="vip, finance" /></div>
            <div className="flex items-end gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={searchBuilder.hasAttachment} onChange={(e) => setSearchBuilder((c) => ({ ...c, hasAttachment: e.target.checked }))} />Has attachment</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={searchBuilder.unread} onChange={(e) => setSearchBuilder((c) => ({ ...c, unread: e.target.checked }))} />Unread</label></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={applySearchBuilder}>Apply filters</Button>
            <Button size="sm" variant="outline" onClick={resetSearchBuilder}>Clear</Button>
            <Input value={savedSearchName} onChange={(e) => setSavedSearchName(e.target.value)} placeholder="Saved search name" className="h-8 w-44" />
            <Button size="sm" variant="outline" disabled={!savedSearchName.trim() || saveSearchMutation.isPending} onClick={() => saveSearchMutation.mutate({ name: savedSearchName.trim(), filters: compileBuilderFilters(searchBuilder) })}>Save search</Button>
            {savedSearches.map((saved) => (
              <div key={saved.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                <button onClick={() => handleApplySavedSearch(saved)} className="text-foreground hover:underline">{saved.name}</button>
                <button onClick={() => deleteSavedSearchMutation.mutate(saved.id)} className="text-muted-foreground hover:text-foreground">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main email content area */}
      {inboxTab === "emails" && <div className={`flex-1 ${isMobileDetailView ? "overflow-y-auto" : "overflow-hidden"}`}>
        {!isMobileViewport && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={appSidebarMode === "hidden" ? 18 : 15} minSize={10} maxSize={25} className="hidden lg:block">
              <FolderSidebar selectedFolder={selectedFolder} onSelectFolder={setSelectedFolder} onDropEmail={handleDropEmailToFolder} />
            </ResizablePanel>
            <ResizableHandle withHandle className="hidden lg:flex" />
            {!isReadingMode && (
              <>
                <ResizablePanel defaultSize={appSidebarMode === "hidden" ? 36 : 30} minSize={20} maxSize={50}>
                  <EmailList
                    selectedEmailId={selectedEmail?.id || null}
                    onSelectEmail={handleEmailSelect}
                    selectedFolder={selectedFolder}
                    searchQuery={searchQuery}
                    interpretedFilters={interpretedFilters}
                    filterUnread={filterUnread}
                    selectedTagIds={selectedTagIds}
                    selectedEmails={selectedEmails}
                    filterVipOnly={filterVipOnly}
                    filterPinnedOnly={filterPinnedOnly}
                    filterHighPriorityOnly={filterHighPriorityOnly}
                    groupBy={groupBy}
                    selectedLane={selectedLane}
                    priorityWeights={priorityWeights}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onTogglePinned={handleTogglePinned}
                    onEmailsChange={setInboxEmails}
                    onDragEmailStart={(email, draggedEmailIds, event) => { setSelectedEmail(email); event.dataTransfer.setData("text/plain", email.id); event.dataTransfer.setData("application/x-desmily-email-ids", JSON.stringify(draggedEmailIds)); event.dataTransfer.effectAllowed = "move"; }}
                    onSoftDeleteEmail={handleSoftDeleteEmail}
                    onDeleteEmail={(email) => { setSelectedEmail(email); setDeleteDialogOpen(true); }}
                    onMoveEmail={(email, dest) => handleDropEmailToFolder([email.id], dest)}
                    onSetReadState={(email, markAsRead) => { if (markAsRead) markReadMutation.mutate([email.id]); else markUnreadMutation.mutate([email.id]); }}
                    onArchiveEmail={(email) => archiveEmailMutation.mutate(email.id)}
                    onAssignEmail={(email) => { toast({ title: "Assignment unavailable", description: `Assign for "${email.subject || "(No subject)"}" is coming soon.` }); }}
                    onCreateRuleFromEmail={(email) => { toast({ title: "Rule creation unavailable", description: `Rule builder for ${email.fromEmail || email.senderEmail} is coming soon.` }); }}
                    onCreateOpportunityDeal={(email) => createOpportunityDealMutation.mutate(email.id)}
                    onCreateOpportunityTask={(email) => createOpportunityTaskMutation.mutate(email.dbId)}
                    swipeGestureSettings={swipeGestureSettings}
                    onSwipeAction={handleSwipeAction}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}
            <ResizablePanel defaultSize={appSidebarMode === "hidden" ? 64 : 55}>
              <EmailPreview email={selectedEmail} playbooks={playbooks} onRunPlaybook={handleExecutePlaybook} isRunningPlaybook={executePlaybookMutation.isPending} onClose={() => setSelectedEmail(null)} isReadingMode={isReadingMode} onToggleReadingMode={() => setIsReadingMode(!isReadingMode)} onReply={() => setReplyOpen(true)} onForward={() => setForwardOpen(true)} onDelete={() => setDeleteDialogOpen(true)} onTogglePinned={handleTogglePinned} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {isMobileViewport && !isMobileDetailView && (
          <EmailList
            selectedEmailId={selectedEmail?.id || null}
            onSelectEmail={handleEmailSelect}
            selectedFolder={selectedFolder}
            searchQuery={searchQuery}
            interpretedFilters={interpretedFilters}
            filterUnread={filterUnread}
            selectedTagIds={selectedTagIds}
            selectedEmails={selectedEmails}
            filterVipOnly={filterVipOnly}
            filterPinnedOnly={filterPinnedOnly}
            filterHighPriorityOnly={filterHighPriorityOnly}
            groupBy={groupBy}
            selectedLane={selectedLane}
            priorityWeights={priorityWeights}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onTogglePinned={handleTogglePinned}
            onEmailsChange={setInboxEmails}
            isMobileCompact
            restoreScrollTop={listScrollTop}
            onListScrollPositionChange={setListScrollTop}
            onDragEmailStart={(email, draggedEmailIds, event) => { setSelectedEmail(email); event.dataTransfer.setData("text/plain", email.id); event.dataTransfer.setData("application/x-desmily-email-ids", JSON.stringify(draggedEmailIds)); event.dataTransfer.effectAllowed = "move"; }}
            onSoftDeleteEmail={handleSoftDeleteEmail}
            onDeleteEmail={(email) => { setSelectedEmail(email); setDeleteDialogOpen(true); }}
            onMoveEmail={(email, dest) => handleDropEmailToFolder([email.id], dest)}
            onSetReadState={(email, markAsRead) => { if (markAsRead) markReadMutation.mutate([email.id]); else markUnreadMutation.mutate([email.id]); }}
            onArchiveEmail={(email) => archiveEmailMutation.mutate(email.id)}
            onAssignEmail={(email) => { toast({ title: "Assignment unavailable" }); }}
            onCreateRuleFromEmail={(email) => { toast({ title: "Rule creation unavailable" }); }}
            onCreateOpportunityDeal={(email) => createOpportunityDealMutation.mutate(email.id)}
            onCreateOpportunityTask={(email) => createOpportunityTaskMutation.mutate(email.dbId)}
            swipeGestureSettings={swipeGestureSettings}
            onSwipeAction={handleSwipeAction}
          />
        )}

        {isMobileViewport && isMobileDetailView && (
          <div className="flex flex-col bg-background">
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-2 backdrop-blur flex-shrink-0">
              <Button type="button" variant="ghost" className="min-h-11 px-3" onClick={handleMobileBackToList}>Back to messages</Button>
            </div>
            <div>
              <EmailPreview email={selectedEmail} playbooks={playbooks} onRunPlaybook={handleExecutePlaybook} isRunningPlaybook={executePlaybookMutation.isPending} onClose={handleMobileBackToList} isReadingMode={isReadingMode} onToggleReadingMode={() => setIsReadingMode(!isReadingMode)} onReply={() => setReplyOpen(true)} onForward={() => setForwardOpen(true)} onDelete={() => setDeleteDialogOpen(true)} onTogglePinned={handleTogglePinned} />
            </div>
          </div>
        )}
      </div>}

      {/* Mobile bottom bar */}
      <div className={`sm:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] ${isMobileDetailView ? "hidden" : ""}`}>
        <div className="grid grid-cols-5 gap-2 text-xs">
          <button onClick={() => { setComposeOpen(true); setComposeDraftId(null); }} className="min-h-11 rounded-xl bg-primary text-primary-foreground">Compose</button>
          <button onClick={() => setFilterUnread((v) => !v)} className="min-h-11 rounded-xl border border-border">Unread</button>
          <button onClick={() => setFilterVipOnly((v) => !v)} className="min-h-11 rounded-xl border border-border">VIP</button>
          <button onClick={() => setFilterHighPriorityOnly((v) => !v)} className="min-h-11 rounded-xl border border-border">Priority</button>
          <button onClick={() => setFilterPinnedOnly((v) => !v)} className="min-h-11 rounded-xl border border-border">Pinned</button>
        </div>
      </div>

      {/* Mobile actions drawer */}
      <Drawer open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Inbox quick actions</DrawerTitle>
            <DrawerDescription>Mobile-safe actions and filters.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3">
            <button className="w-full min-h-11 rounded-xl border border-border" onClick={() => { setComposeOpen(true); setComposeDraftId(null); setMobileActionsOpen(false); }}>Compose email</button>
            <button className="w-full min-h-11 rounded-xl border border-border" onClick={() => { setCommandPaletteOpen(true); setMobileActionsOpen(false); }}>Open actions</button>
            <button className="w-full min-h-11 rounded-xl border border-border" onClick={() => { setFilterUnread((v) => !v); }}>Toggle unread</button>
            <button className="w-full min-h-11 rounded-xl border border-border" onClick={() => { setFilterVipOnly((v) => !v); }}>Toggle VIP</button>
            <button className="w-full min-h-11 rounded-xl border border-border" onClick={() => { setFilterHighPriorityOnly((v) => !v); }}>Toggle high priority</button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Command palette and rule builder */}
      <InboxCommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} selectedEmail={selectedEmail} selectedThreadEmails={inboxEmails.filter((email) => selectedEmails.has(email.id))} workspaceContextKey={`${user?.workspaceId || "workspace"}:${user?.id || "anonymous"}`} />
      <InboxRuleBuilderDialog open={showRuleBuilder} onOpenChange={(open) => { setShowRuleBuilder(open); if (!open) setPromotedCandidate(null); }} changedBy={user?.email || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Current user"} suggestedCandidate={promotedCandidate} />

      {/* Swipe settings dialog */}
      <Dialog open={swipeSettingsOpen} onOpenChange={setSwipeSettingsOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Swipe gesture settings</DialogTitle><DialogDescription>Customize mobile swipe actions for message rows.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><span className="text-sm">Enable swipe gestures</span><input type="checkbox" checked={swipeGestureSettings.enabled} onChange={(e) => setSwipeGestureSettings((c) => ({ ...c, enabled: e.target.checked }))} className="h-4 w-4" /></label>
            <div className="space-y-2"><Label htmlFor="swipe-left-action">Swipe left action</Label><select id="swipe-left-action" value={swipeGestureSettings.leftAction} onChange={(e) => setSwipeGestureSettings((c) => ({ ...c, leftAction: e.target.value as SwipeActionType }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="none">None</option><option value="archive">Archive</option><option value="delete">Delete</option><option value="snooze">Snooze</option><option value="pin">Pin / Unpin</option><option value="read">Mark read / unread</option></select></div>
            <div className="space-y-2"><Label htmlFor="swipe-right-action">Swipe right action</Label><select id="swipe-right-action" value={swipeGestureSettings.rightAction} onChange={(e) => setSwipeGestureSettings((c) => ({ ...c, rightAction: e.target.value as SwipeActionType }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="none">None</option><option value="archive">Archive</option><option value="delete">Delete</option><option value="snooze">Snooze</option><option value="pin">Pin / Unpin</option><option value="read">Mark read / unread</option></select></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compose dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><SendIcon className="h-5 w-5" />Compose Email</DialogTitle><DialogDescription>Send a new email from your connected Outlook account</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="to">To</Label><Input id="to" placeholder="recipient@example.com" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" placeholder="Email subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="body">Message</Label><Textarea id="body" placeholder="Write your message here..." ref={composeBodyRef} value={composeBody} onChange={(e) => setComposeBody(e.target.value)} onKeyDown={(e) => handleSnippetExpansionKeyDown(e, composeBody, setComposeBody, composeBodyRef)} className="min-h-[200px] rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="attachments">Attachments</Label><Input id="attachments" type="file" multiple onChange={(e) => handleComposeFileSelection(e.target.files)} className="rounded-xl" />
              {composeAttachments.length > 0 && <div className="space-y-2 rounded-xl border border-border p-3 text-sm">{composeAttachments.map((att, i) => <div key={`${att.name}-${i}`} className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><PaperclipIcon className="h-4 w-4 text-muted-foreground" /><span className="truncate">{att.name}</span><span className="text-xs text-muted-foreground">({Math.ceil(att.size / 1024)} KB)</span></div><Button type="button" variant="ghost" size="sm" onClick={() => setComposeAttachments((c) => c.filter((_, ci) => ci !== i))}>Remove</Button></div>)}</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => { const recipients = composeTo.split(",").map((e) => e.trim()).filter((e) => e); saveDraftMutation.mutate({ draftId: composeDraftId || undefined, to: recipients, subject: composeSubject, body: composeBody }); }} disabled={saveDraftMutation.isPending}>{saveDraftMutation.isPending ? <><Loader2Icon className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Draft'}</Button>
            <Button onClick={() => { const recipients = composeTo.split(",").map((e) => e.trim()).filter((e) => e); if (composeDraftId) { sendDraftMutation.mutate(composeDraftId); } else if (recipients.length > 0 && composeSubject && composeBody) { sendEmailMutation.mutate({ to: recipients, subject: composeSubject, body: composeBody, attachments: composeAttachments }); } else { toast({ title: "Missing information", description: "Please fill in recipients, subject and body", variant: "destructive" }); } }} disabled={sendEmailMutation.isPending || sendDraftMutation.isPending}>{(sendEmailMutation.isPending || sendDraftMutation.isPending) ? <><Loader2Icon className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><SendIcon className="h-4 w-4 mr-2" />{composeDraftId ? 'Send Draft' : 'Send'}</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ReplyIcon className="h-5 w-5" />Reply to Email</DialogTitle><DialogDescription>Replying to: {selectedEmail?.subject || "Email"}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-xl text-sm"><p className="font-medium">From: {selectedEmail?.senderName || selectedEmail?.senderEmail}</p><p className="text-muted-foreground truncate">Subject: {selectedEmail?.subject}</p></div>
            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="replyAiMode">Draft mode</Label><select id="replyAiMode" value={replyAiMode} onChange={(e) => setReplyAiMode(e.target.value as ReplyDraftMode)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="general_reply">General reply</option><option value="sponsorship_reply">Sponsorship</option><option value="support_reply">Support</option><option value="sales_reply">Sales</option><option value="follow_up_reply">Follow-up</option></select></div>
                <div className="space-y-2"><Label htmlFor="replyAudienceType">Audience profile</Label><Input id="replyAudienceType" value={replyAudienceProfile.audienceType} onChange={(e) => setReplyAudienceProfile((c) => ({ ...c, audienceType: e.target.value }))} placeholder="general_business" className="rounded-xl" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="replyToneConstraints">Tone constraints (comma separated)</Label><Input id="replyToneConstraints" value={replyToneConstraintsInput} onChange={(e) => setReplyToneConstraintsInput(e.target.value)} placeholder="concise, direct CTA" className="rounded-xl" /></div>
              <div className="space-y-2"><Label htmlFor="replyBannedPhrasing">Banned phrasing (comma separated)</Label><Input id="replyBannedPhrasing" value={replyBannedPhrasingInput} onChange={(e) => setReplyBannedPhrasingInput(e.target.value)} placeholder="just checking in, circling back" className="rounded-xl" /></div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={replyAudienceProfile.autoSelect} onChange={(e) => setReplyAudienceProfile((c) => ({ ...c, autoSelect: e.target.checked }))} />Auto-select profile from contact/company and thread context</label>
              <Button type="button" variant="secondary" onClick={() => selectedEmail && generateReplyAiDraftMutation.mutate({ messageId: selectedEmail.id })} disabled={!selectedEmail || generateReplyAiDraftMutation.isPending}>{generateReplyAiDraftMutation.isPending ? <><Loader2Icon className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><WandSparklesIcon className="h-4 w-4 mr-2" />Generate AI Draft</>}</Button>
              {replyAiTelemetry && <div className="rounded-lg bg-muted p-3 text-xs space-y-2"><p>Confidence: {typeof replyAiTelemetry.confidence === 'number' ? `${Math.round(replyAiTelemetry.confidence * 100)}%` : 'n/a'}</p></div>}
            </div>
            <div className="space-y-2"><Label htmlFor="replyBody">Your Reply</Label><Textarea id="replyBody" placeholder="Write your reply here..." ref={replyBodyRef} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} onKeyDown={(e) => handleSnippetExpansionKeyDown(e, replyBody, setReplyBody, replyBodyRef)} className="min-h-[200px] rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancel</Button>
            <Button onClick={async () => { if (selectedEmail && replyBody) { if (replyAiTelemetry) { try { await saveDraftLearningSignalMutation.mutateAsync({ messageId: selectedEmail.id, conversationId: selectedEmail.conversationId, bodyBefore: replyAiTelemetry.originalBody, bodyAfter: replyBody, rationaleBefore: replyAiTelemetry.rationale, rationaleAfter: replyAiTelemetry.rationale, confidence: replyAiTelemetry.confidence }); } catch { /* ignore */ } } replyEmailMutation.mutate({ messageId: selectedEmail.id, body: replyBody }); } }} disabled={replyEmailMutation.isPending || !replyBody}>{replyEmailMutation.isPending ? <><Loader2Icon className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><SendIcon className="h-4 w-4 mr-2" />Send Reply</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shortcut help dialog */}
      <Dialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Inbox shortcuts</DialogTitle><DialogDescription>Keyboard shortcuts available while viewing inbox messages.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">Delete / Backspace</kbd><span>Delete selected email</span>
            <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">E</kbd><span>Archive selected email</span>
            <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">R</kbd><span>Reply to selected email</span>
            <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">U</kbd><span>Mark selected email as unread</span>
            <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">J / K</kbd><span>Next / previous message</span>
            <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">?</kbd><span>Open shortcut help</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward dialog */}
      <Dialog open={forwardOpen} onOpenChange={setForwardOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ForwardIcon className="h-5 w-5" />Forward Email</DialogTitle><DialogDescription>Forwarding: {selectedEmail?.subject || "Email"}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="forwardTo">To</Label><Input id="forwardTo" placeholder="recipient@example.com" value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="forwardComment">Comment (optional)</Label><Textarea id="forwardComment" placeholder="Add a comment before forwarding..." ref={forwardCommentRef} value={forwardComment} onChange={(e) => setForwardComment(e.target.value)} onKeyDown={(e) => handleSnippetExpansionKeyDown(e, forwardComment, setForwardComment, forwardCommentRef)} className="min-h-[120px] rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardOpen(false)}>Cancel</Button>
            <Button onClick={() => { const recipients = forwardTo.split(",").map((e) => e.trim()).filter((e) => e); if (selectedEmail && recipients.length > 0) { forwardEmailMutation.mutate({ messageId: selectedEmail.id, to: recipients, comment: forwardComment }); } else { toast({ title: "Missing recipients", description: "Please add at least one recipient", variant: "destructive" }); } }} disabled={forwardEmailMutation.isPending}>{forwardEmailMutation.isPending ? <><Loader2Icon className="h-4 w-4 mr-2 animate-spin" />Forwarding...</> : <><SendIcon className="h-4 w-4 mr-2" />Forward</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Email</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this email? It will be moved to the trash folder.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (selectedEmail) deleteEmailMutation.mutate(selectedEmail.id); }} disabled={deleteEmailMutation.isPending}>{deleteEmailMutation.isPending ? <><Loader2Icon className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
