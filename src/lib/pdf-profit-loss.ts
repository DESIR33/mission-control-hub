/**
 * Generate a printable P&L statement PDF for tax filing.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface PLRow {
  month: string;
  income: number;
  expenses: number;
  profit: number;
  margin: number;
}

interface PLTotals {
  totalIncome: number;
  totalExpenses: number;
  totalProfit: number;
  avgMargin: number;
}

interface PLPdfOptions {
  rows: PLRow[];
  totals: PLTotals;
  period: string;
  businessName?: string;
  generatedDate?: string;
}

const fmtMoney = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function generateProfitLossPdf({
  rows,
  totals,
  period,
  businessName = "My Business",
  generatedDate,
}: PLPdfOptions) {
  const date = generatedDate || new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${r.month}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:'Courier New',monospace;font-size:13px;color:#059669;">${fmtMoney(r.income)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:'Courier New',monospace;font-size:13px;color:#dc2626;">${fmtMoney(r.expenses)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:'Courier New',monospace;font-size:13px;font-weight:600;color:${r.profit >= 0 ? "#059669" : "#dc2626"};">${fmtMoney(r.profit)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:'Courier New',monospace;font-size:13px;">${r.margin.toFixed(1)}%</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Profit &amp; Loss Statement — ${escapeHtml(period)}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111827;
      background: #fff;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #111827;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      margin: 0 0 4px 0;
      font-weight: 700;
    }
    .header .subtitle {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
    }
    .meta {
      text-align: right;
      font-size: 12px;
      color: #6b7280;
    }
    .meta p { margin: 2px 0; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .summary-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }
    .summary-card .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin: 0 0 4px 0;
    }
    .summary-card .value {
      font-size: 22px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      margin: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    thead th {
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      border-bottom: 2px solid #d1d5db;
      font-weight: 600;
    }
    thead th:not(:first-child) { text-align: right; }
    .totals-row td {
      padding: 10px 12px;
      font-weight: 700;
      font-size: 14px;
      border-top: 2px solid #111827;
      border-bottom: none !important;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 24px;
      background: #111827;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }
    .print-btn:hover { background: #1f2937; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div>
      <h1>Profit & Loss Statement</h1>
      <p class="subtitle">${escapeHtml(businessName)}</p>
    </div>
    <div class="meta">
      <p><strong>Period:</strong> ${period}</p>
      <p><strong>Generated:</strong> ${date}</p>
      <p>Prepared for tax filing purposes</p>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <p class="label">Total Revenue</p>
      <p class="value" style="color:#059669;">${fmtMoney(totals.totalIncome)}</p>
    </div>
    <div class="summary-card">
      <p class="label">Total Expenses</p>
      <p class="value" style="color:#dc2626;">${fmtMoney(totals.totalExpenses)}</p>
    </div>
    <div class="summary-card">
      <p class="label">Net Profit</p>
      <p class="value" style="color:${totals.totalProfit >= 0 ? "#059669" : "#dc2626"};">${fmtMoney(totals.totalProfit)}</p>
    </div>
    <div class="summary-card">
      <p class="label">Avg Margin</p>
      <p class="value">${totals.avgMargin.toFixed(1)}%</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th>Revenue</th>
        <th>Expenses</th>
        <th>Net Profit</th>
        <th>Margin</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="totals-row">
        <td>Total</td>
        <td style="text-align:right;font-family:'Courier New',monospace;color:#059669;">${fmtMoney(totals.totalIncome)}</td>
        <td style="text-align:right;font-family:'Courier New',monospace;color:#dc2626;">${fmtMoney(totals.totalExpenses)}</td>
        <td style="text-align:right;font-family:'Courier New',monospace;color:${totals.totalProfit >= 0 ? "#059669" : "#dc2626"};">${fmtMoney(totals.totalProfit)}</td>
        <td style="text-align:right;font-family:'Courier New',monospace;">${totals.avgMargin.toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>This document was auto-generated for tax filing purposes. Please verify all figures with your accountant.</p>
    <p>Generated on ${date}</p>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
