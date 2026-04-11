import { useMemo } from "react";
import { type Expense } from "@/hooks/use-expenses";
import { safeGetTime } from "@/lib/date-utils";

export interface DetectedSubscription {
  vendor: string;
  avgAmount: number;
  amountVariance: number;
  occurrences: number;
  months: string[]; // YYYY-MM
  categoryId: string | null;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  latestExpense: Expense;
  billingCycle: "monthly" | "quarterly" | "yearly";
}

const KNOWN_SAAS_VENDORS = new Set([
  "netflix", "spotify", "adobe", "notion", "slack", "zoom",
  "github", "figma", "canva", "dropbox", "google", "microsoft",
  "aws", "vercel", "heroku", "openai", "replit", "chatgpt",
  "midjourney", "grammarly", "1password", "lastpass", "zapier",
  "hubspot", "mailchimp", "convertkit", "beehiiv", "substack",
  "linear", "jira", "asana", "monday", "trello", "airtable",
  "stripe", "shopify", "squarespace", "webflow", "wix",
  "hulu", "disney", "apple", "amazon", "twilio", "sendgrid",
  "datadog", "sentry", "cloudflare", "netlify", "render",
  "cursor", "copilot", "claude", "anthropic", "perplexity",
]);

function normalizeVendor(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isKnownSaaS(vendor: string): boolean {
  const norm = normalizeVendor(vendor);
  return Array.from(KNOWN_SAAS_VENDORS).some(
    (s) => norm.includes(s) || s.includes(norm)
  );
}

function getYearMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function detectBillingCycle(months: string[]): "monthly" | "quarterly" | "yearly" {
  if (months.length < 2) return "monthly";
  const sorted = [...months].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const [y1, m1] = sorted[i - 1].split("-").map(Number);
    const [y2, m2] = sorted[i].split("-").map(Number);
    gaps.push((y2 - y1) * 12 + (m2 - m1));
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avgGap >= 10) return "yearly";
  if (avgGap >= 2.5) return "quarterly";
  return "monthly";
}

export function useSubscriptionDetection(
  expenses: Expense[],
  existingSubscriptionVendors: Set<string>
): DetectedSubscription[] {
  return useMemo(() => {
    if (!expenses.length) return [];

    // Group by normalized vendor
    const vendorGroups = new Map<
      string,
      { original: string; expenses: Expense[] }
    >();

    for (const exp of expenses) {
      const vendor = exp.vendor?.trim();
      if (!vendor) continue;
      const key = normalizeVendor(vendor);
      if (!key) continue;
      const group = vendorGroups.get(key) || { original: vendor, expenses: [] };
      group.expenses.push(exp);
      vendorGroups.set(key, group);
    }

    const detected: DetectedSubscription[] = [];

    for (const [normKey, { original, expenses: vendorExps }] of vendorGroups) {
      // Skip if already tracked as a subscription
      if (existingSubscriptionVendors.has(normKey)) continue;

      // Need at least 2 occurrences
      if (vendorExps.length < 2) continue;

      const months = [...new Set(vendorExps.map((e) => getYearMonth(e.expense_date)))].sort();
      const amounts = vendorExps.map((e) => Number(e.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxDev = Math.max(...amounts.map((a) => Math.abs(a - avgAmount)));
      const variance = avgAmount > 0 ? maxDev / avgAmount : 0;

      const reasons: string[] = [];
      let score = 0;

      // Heuristic 1: Same amount every month
      if (variance < 0.01 && months.length >= 2) {
        reasons.push(`Same amount ($${avgAmount.toFixed(2)}) across ${months.length} months`);
        score += 3;
      } else if (variance < 0.05 && months.length >= 2) {
        reasons.push(`Near-identical amounts (within 5%) across ${months.length} months`);
        score += 2;
      }

      // Heuristic 2: Recurring monthly pattern
      if (months.length >= 3) {
        const sorted = [...months].sort();
        let consecutive = 0;
        for (let i = 1; i < sorted.length; i++) {
          const [y1, m1] = sorted[i - 1].split("-").map(Number);
          const [y2, m2] = sorted[i].split("-").map(Number);
          const gap = (y2 - y1) * 12 + (m2 - m1);
          if (gap === 1 || gap === 3 || gap === 12) consecutive++;
        }
        if (consecutive >= sorted.length - 1) {
          reasons.push(`Regular billing pattern detected (${months.length} occurrences)`);
          score += 3;
        } else if (consecutive >= Math.floor(sorted.length * 0.6)) {
          reasons.push(`Mostly regular billing pattern`);
          score += 1;
        }
      }

      // Heuristic 3: Known SaaS vendor
      if (isKnownSaaS(original)) {
        reasons.push("Known subscription service");
        score += 2;
      }

      // Heuristic 4: Multiple months of presence
      if (months.length >= 4) {
        reasons.push(`Found in ${months.length} different months`);
        score += 1;
      }

      if (score < 2) continue;

      const confidence: "high" | "medium" | "low" =
        score >= 5 ? "high" : score >= 3 ? "medium" : "low";

      const latestExpense = vendorExps.sort(
        (a, b) => safeGetTime(b.expense_date) - safeGetTime(a.expense_date)
      )[0];

      detected.push({
        vendor: original,
        avgAmount,
        amountVariance: variance,
        occurrences: vendorExps.length,
        months,
        categoryId: latestExpense.category_id,
        confidence,
        reasons,
        latestExpense,
        billingCycle: detectBillingCycle(months),
      });
    }

    return detected.sort((a, b) => {
      const confOrder = { high: 0, medium: 1, low: 2 };
      return confOrder[a.confidence] - confOrder[b.confidence] || b.occurrences - a.occurrences;
    });
  }, [expenses, existingSubscriptionVendors]);
}
