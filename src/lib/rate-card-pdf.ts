import jsPDF from "jspdf";
import type { RateCardItem, RateCardTerm } from "@/hooks/use-rate-card";

const COLORS = {
  black: [0, 0, 0] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  medium: [100, 100, 100] as [number, number, number],
  light: [160, 160, 160] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
  bg: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [80, 80, 80] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 20;
const MR = 20;
const CONTENT_W = PAGE_W - ML - MR;

interface ExportOptions {
  items: RateCardItem[];
  terms: RateCardTerm[];
  workspaceName: string;
  logoUrl?: string | null;
}

function fmtPrice(price: number): string {
  return price > 0 ? `$${price.toLocaleString()}` : "Included";
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportRateCardPDF(options: ExportOptions) {
  const { items, terms, workspaceName, logoUrl } = options;
  const doc = new jsPDF("p", "mm", "a4");
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > PAGE_H - 25) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header with logo ──
  let logoBase64: string | null = null;
  if (logoUrl) {
    logoBase64 = await loadImageAsBase64(logoUrl);
  }

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", ML, y, 14, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...COLORS.black);
      doc.text(workspaceName, ML + 18, y + 10);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...COLORS.black);
      doc.text(workspaceName, ML, y + 10);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.black);
    doc.text(workspaceName, ML, y + 10);
  }
  y += 18;

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.medium);
  doc.text("Sponsorship Rate Card", ML, y);
  y += 4;

  // Date
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.light);
  doc.text(`Updated ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, ML, y);
  y += 8;

  // Divider
  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.8);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 10;

  // ── Group items by category ──
  const CATEGORY_LABELS: Record<string, string> = {
    video: "YouTube Videos",
    addon: "Cross-Platform Add-ons",
    newsletter: "Newsletter",
  };

  const grouped: Record<string, RateCardItem[]> = {};
  for (const item of items.filter((i) => i.is_active)) {
    (grouped[item.category] ??= []).push(item);
  }

  for (const cat of ["video", "addon", "newsletter"]) {
    const catItems = grouped[cat];
    if (!catItems?.length) continue;

    checkPage(30);

    // Category header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.black);
    doc.text(CATEGORY_LABELS[cat] ?? cat, ML, y);
    y += 6;

    // Table header
    doc.setFillColor(...COLORS.bg);
    doc.rect(ML, y, CONTENT_W, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.medium);
    doc.text("ITEM", ML + 3, y + 5);
    doc.text("PRICE", PAGE_W - MR - 3, y + 5, { align: "right" });
    y += 9;

    for (const item of catItems) {
      const descLines = item.description
        ? doc.splitTextToSize(item.description, CONTENT_W - 50)
        : [];
      const rowH = 7 + descLines.length * 3.5;
      checkPage(rowH + 2);

      // Item name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.dark);
      doc.text(item.name, ML + 3, y + 4.5);

      // Price
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.black);
      doc.text(fmtPrice(item.price), PAGE_W - MR - 3, y + 4.5, { align: "right" });

      // Description
      if (descLines.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.medium);
        doc.text(descLines, ML + 3, y + 8.5);
      }

      y += rowH;

      // Row separator
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(ML, y, PAGE_W - MR, y);
      y += 2;
    }

    y += 6;
  }

  // ── Terms & Conditions ──
  const groupedTerms: Record<string, RateCardTerm[]> = {};
  for (const term of terms.filter((t) => t.is_active)) {
    (groupedTerms[term.category] ??= []).push(term);
  }

  const TERM_LABELS: Record<string, string> = {
    general: "Campaign Terms & Conditions",
    affiliate: "Affiliate Requirements",
  };

  for (const cat of ["general", "affiliate"]) {
    const catTerms = groupedTerms[cat];
    if (!catTerms?.length) continue;

    checkPage(20);

    // Divider before terms
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PAGE_W - MR, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    doc.text(TERM_LABELS[cat] ?? cat, ML, y);
    y += 7;

    for (const term of catTerms) {
      const lines = doc.splitTextToSize(term.content, CONTENT_W - 8);
      checkPage(lines.length * 4 + 4);

      // Bullet
      doc.setFillColor(...COLORS.accent);
      doc.circle(ML + 2, y + 1, 0.8, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.dark);
      doc.text(lines, ML + 6, y + 2);

      y += lines.length * 3.8 + 3;
    }

    y += 4;
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.light);
    doc.text(
      `${workspaceName} · Confidential`,
      ML,
      PAGE_H - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_W - MR,
      PAGE_H - 10,
      { align: "right" }
    );
  }

  doc.save(`${workspaceName.replace(/\s+/g, "-").toLowerCase()}-rate-card.pdf`);
}
