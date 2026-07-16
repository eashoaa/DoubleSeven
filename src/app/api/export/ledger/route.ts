import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getDevMasterlist, MASTERLIST_SNAPSHOT_DATE } from "@/lib/domain/dev-masterlist";
import { listCollections, listExpenses } from "@/lib/server/local-store";
import { centavosToPesos } from "@/lib/format";

interface LedgerLine {
  date: string;
  reference: string;
  particulars: string;
  debitCents: number;
  creditCents: number;
}

async function buildLedgerLines(): Promise<LedgerLine[]> {
  const lines: LedgerLine[] = [];

  // Credits: money in.
  const { contracts } = getDevMasterlist();
  for (const c of contracts) {
    if (c.paidCents > 0) {
      lines.push({
        date: MASTERLIST_SNAPSHOT_DATE,
        reference: c.lotDisplayId,
        particulars: `Opening balance - ${c.clientName} (${c.lotDisplayId})`,
        debitCents: 0,
        creditCents: c.paidCents,
      });
    }
  }
  const collections = await listCollections();
  for (const row of collections) {
    if (row.voided) continue;
    lines.push({
      date: row.paidAt,
      reference: row.orNumber ?? row.id.slice(0, 10),
      particulars: `${row.type.replace(/_/g, " ")} - ${row.clientName}${row.lotDisplayId ? ` (${row.lotDisplayId})` : ""} [${row.method}]`,
      debitCents: 0,
      creditCents: row.grossCents,
    });
  }

  // Debits: money out.
  const expenses = await listExpenses();
  for (const e of expenses) {
    lines.push({
      date: e.incurredAt,
      reference: e.id.slice(0, 10),
      particulars: `${e.description} [${e.category}, ${e.paidFrom.replace(/_/g, " ")}]`,
      debitCents: e.amountCents,
      creditCents: 0,
    });
  }

  return lines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export async function GET() {
  const lines = await buildLedgerLines();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Double Seven, Heaven's Gate Memorial Park";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("General Ledger", {
    views: [{ state: "frozen", ySplit: 7 }],
  });

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Double Seven Properties: Heaven's Gate Memorial Park";
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = "General Ledger: Debit / Credit";
  sheet.getCell("A2").font = { bold: true, size: 11, color: { argb: "FF6B7280" } };

  sheet.mergeCells("A3:F3");
  sheet.getCell("A3").value = `Generated ${new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}`;
  sheet.getCell("A3").font = { size: 9, color: { argb: "FF9CA3AF" } };

  const headerRow = sheet.getRow(5);
  headerRow.values = ["Date", "Reference", "Particulars", "Debit (₱)", "Credit (₱)", "Balance (₱)"];
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF0FE" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
  });

  sheet.columns = [
    { key: "date", width: 14 },
    { key: "reference", width: 16 },
    { key: "particulars", width: 56 },
    { key: "debit", width: 16 },
    { key: "credit", width: 16 },
    { key: "balance", width: 16 },
  ];

  let runningBalance = 0;
  let rowIndex = 6;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    runningBalance += line.creditCents - line.debitCents;
    totalDebit += line.debitCents;
    totalCredit += line.creditCents;

    const row = sheet.getRow(rowIndex);
    row.values = [
      line.date,
      line.reference,
      line.particulars,
      line.debitCents > 0 ? centavosToPesos(line.debitCents) : null,
      line.creditCents > 0 ? centavosToPesos(line.creditCents) : null,
      centavosToPesos(runningBalance),
    ];
    row.getCell(4).numFmt = "#,##0.00";
    row.getCell(5).numFmt = "#,##0.00";
    row.getCell(6).numFmt = "#,##0.00";
    rowIndex++;
  }

  const totalsRow = sheet.getRow(rowIndex + 1);
  totalsRow.values = ["", "", "TOTAL", centavosToPesos(totalDebit), centavosToPesos(totalCredit), centavosToPesos(runningBalance)];
  totalsRow.font = { bold: true };
  totalsRow.getCell(4).numFmt = "#,##0.00";
  totalsRow.getCell(5).numFmt = "#,##0.00";
  totalsRow.getCell(6).numFmt = "#,##0.00";
  totalsRow.eachCell((cell) => {
    cell.border = { top: { style: "double", color: { argb: "FF14151A" } } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `d7-ledger-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
