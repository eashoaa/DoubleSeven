import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Phase 0 write layer: real, persisted mutations (new clients, logged
 * collections, logged expenses, uploaded receipts) made through the app
 * before a Supabase project exists to write to instead. Stored as JSON
 * files under .local-data/ (gitignored, never commit real client or
 * financial data). Every table here has a Supabase-shaped counterpart in
 * supabase/migrations; once NEXT_PUBLIC_SUPABASE_URL is set, the page-level
 * `if (!process.env.NEXT_PUBLIC_SUPABASE_URL)` branches that call this
 * module should simply be deleted in favor of the real Supabase queries
 * that already exist alongside them.
 */

const DATA_DIR = path.join(process.cwd(), ".local-data");
const RECEIPTS_DIR = path.join(DATA_DIR, "receipts");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  await ensureDir(DATA_DIR);
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Audit log: every mutation in this module appends here automatically, so
// the Audit page reflects real actions taken through the app, not filler.
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  ts: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

async function appendAudit(entry: Omit<AuditEntry, "id" | "ts">) {
  const log = await readJson<AuditEntry[]>("audit-log.json", []);
  log.unshift({ id: newId("audit"), ts: new Date().toISOString(), ...entry });
  await writeJson("audit-log.json", log.slice(0, 500));
}

export async function listAuditEntries(): Promise<AuditEntry[]> {
  return readJson<AuditEntry[]>("audit-log.json", []);
}

// ---------------------------------------------------------------------------
// Clients created through the "New Client" flow (in addition to the 257
// real masterlist clients, which stay read-only/derived).
// ---------------------------------------------------------------------------

export interface LocalClient {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  since: string;
  createdBy: string;
}

export async function listLocalClients(): Promise<LocalClient[]> {
  return readJson<LocalClient[]>("clients.json", []);
}

export async function createLocalClient(input: {
  name: string;
  contact: string;
  email: string;
  address: string;
  createdBy: string;
}): Promise<LocalClient> {
  const clients = await listLocalClients();
  const client: LocalClient = {
    id: newId("client"),
    name: input.name.trim(),
    contact: input.contact.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    since: new Date().toISOString().slice(0, 10),
    createdBy: input.createdBy,
  };
  clients.push(client);
  await writeJson("clients.json", clients);
  await appendAudit({
    actor: input.createdBy,
    action: "client.created",
    entityType: "client",
    entityId: client.id,
    summary: `Created client "${client.name}"`,
  });
  return client;
}

/**
 * Adds contact info to a client that doesn't have any on file: the real
 * masterlist (257 clients) has no phone/email column at all, so this is
 * how staff progressively complete real data instead of it being invented.
 * Stored as an override keyed by client id (masterlist ids too, so it
 * works for both real and locally-created clients) rather than mutating
 * masterlist.json, which stays a faithful, untouched copy of the source.
 */
export interface ClientContactOverride {
  contact: string | null;
  email: string | null;
  address: string | null;
}

export async function getContactOverrides(): Promise<Record<string, ClientContactOverride>> {
  return readJson<Record<string, ClientContactOverride>>("client-contact-overrides.json", {});
}

export async function setContactOverride(
  clientId: string,
  clientName: string,
  input: ClientContactOverride,
  actor: string
): Promise<void> {
  const overrides = await getContactOverrides();
  overrides[clientId] = input;
  await writeJson("client-contact-overrides.json", overrides);
  await appendAudit({
    actor,
    action: "client.contact_updated",
    entityType: "client",
    entityId: clientId,
    summary: `Added/updated contact info for "${clientName}"`,
  });
}

// ---------------------------------------------------------------------------
// Collections (payments) logged through the app.
// ---------------------------------------------------------------------------

export interface LocalCollection {
  id: string;
  clientId: string;
  clientName: string;
  lotDisplayId: string | null;
  paidAt: string;
  type: "payment" | "reservation" | "downpayment" | "other";
  grossCents: number;
  method: "cash" | "bank_transfer" | "check" | "gcash" | "other";
  orNumber: string | null;
  note: string | null;
  receiptId: string | null;
  deposited: boolean;
  depositedAt: string | null;
  recordedBy: string;
  voided: boolean;
}

export async function listCollections(): Promise<LocalCollection[]> {
  return readJson<LocalCollection[]>("collections.json", []);
}

export async function recordCollection(input: {
  clientId: string;
  clientName: string;
  lotDisplayId?: string | null;
  type: LocalCollection["type"];
  grossCents: number;
  method: LocalCollection["method"];
  orNumber?: string | null;
  note?: string | null;
  receiptId?: string | null;
  recordedBy: string;
}): Promise<LocalCollection> {
  const rows = await listCollections();
  const row: LocalCollection = {
    id: newId("txn"),
    clientId: input.clientId,
    clientName: input.clientName,
    lotDisplayId: input.lotDisplayId ?? null,
    paidAt: new Date().toISOString().slice(0, 10),
    type: input.type,
    grossCents: input.grossCents,
    method: input.method,
    orNumber: input.orNumber ?? null,
    note: input.note ?? null,
    receiptId: input.receiptId ?? null,
    deposited: input.method !== "cash",
    depositedAt: input.method !== "cash" ? new Date().toISOString().slice(0, 10) : null,
    recordedBy: input.recordedBy,
    voided: false,
  };
  rows.push(row);
  await writeJson("collections.json", rows);
  await appendAudit({
    actor: input.recordedBy,
    action: "collection.recorded",
    entityType: "collection",
    entityId: row.id,
    summary: `Recorded ₱${(row.grossCents / 100).toLocaleString()} ${row.type} from ${row.clientName} (${row.method})`,
  });
  return row;
}

export async function markCollectionDeposited(id: string, actor: string): Promise<void> {
  const rows = await listCollections();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  row.deposited = true;
  row.depositedAt = new Date().toISOString().slice(0, 10);
  await writeJson("collections.json", rows);
  await appendAudit({
    actor,
    action: "collection.deposited",
    entityType: "collection",
    entityId: row.id,
    summary: `Marked ₱${(row.grossCents / 100).toLocaleString()} from ${row.clientName} as deposited`,
  });
}

// ---------------------------------------------------------------------------
// Expenses (petty cash and otherwise).
// ---------------------------------------------------------------------------

export interface LocalExpense {
  id: string;
  incurredAt: string;
  category: string;
  description: string;
  amountCents: number;
  paidFrom: "petty_cash" | "bank" | "other";
  receiptId: string | null;
  recordedBy: string;
}

export async function listExpenses(): Promise<LocalExpense[]> {
  return readJson<LocalExpense[]>("expenses.json", []);
}

export async function recordExpense(input: {
  category: string;
  description: string;
  amountCents: number;
  paidFrom: LocalExpense["paidFrom"];
  receiptId?: string | null;
  recordedBy: string;
}): Promise<LocalExpense> {
  const rows = await listExpenses();
  const row: LocalExpense = {
    id: newId("expense"),
    incurredAt: new Date().toISOString().slice(0, 10),
    category: input.category,
    description: input.description,
    amountCents: input.amountCents,
    paidFrom: input.paidFrom,
    receiptId: input.receiptId ?? null,
    recordedBy: input.recordedBy,
  };
  rows.push(row);
  await writeJson("expenses.json", rows);
  await appendAudit({
    actor: input.recordedBy,
    action: "expense.recorded",
    entityType: "expense",
    entityId: row.id,
    summary: `Logged ₱${(row.amountCents / 100).toLocaleString()} expense: ${row.description} (${row.paidFrom})`,
  });
  return row;
}

// ---------------------------------------------------------------------------
// Receipt uploads: stored as files under .local-data/receipts/, referenced
// by id from collections/expenses. Served via /api/receipts/[id].
// ---------------------------------------------------------------------------

export interface ReceiptMeta {
  id: string;
  filename: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export async function saveReceipt(input: {
  filename: string;
  mimeType: string;
  data: Buffer;
  uploadedBy: string;
}): Promise<ReceiptMeta> {
  await ensureDir(RECEIPTS_DIR);
  const id = newId("receipt");
  const ext = path.extname(input.filename) || "";
  await fs.writeFile(path.join(RECEIPTS_DIR, `${id}${ext}`), input.data);

  const meta: ReceiptMeta = {
    id,
    filename: input.filename,
    mimeType: input.mimeType,
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
  const index = await readJson<Record<string, ReceiptMeta & { ext: string }>>("receipts-index.json", {});
  index[id] = { ...meta, ext };
  await writeJson("receipts-index.json", index);
  await appendAudit({
    actor: input.uploadedBy,
    action: "receipt.uploaded",
    entityType: "receipt",
    entityId: id,
    summary: `Uploaded receipt "${input.filename}"`,
  });
  return meta;
}

export async function getReceiptFile(id: string): Promise<{ data: Buffer; meta: ReceiptMeta } | null> {
  const index = await readJson<Record<string, ReceiptMeta & { ext: string }>>("receipts-index.json", {});
  const entry = index[id];
  if (!entry) return null;
  try {
    const data = await fs.readFile(path.join(RECEIPTS_DIR, `${id}${entry.ext}`));
    return { data, meta: entry };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reminder template + automation toggle (Brevo integration settings).
// Template rendering itself lives in lib/domain/reminder-template.ts (pure,
// client-safe; this module pulls in Node's fs/path and can't be imported
// from client components).
// ---------------------------------------------------------------------------

import { REMINDER_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/lib/domain/reminder-template";

export interface TemplateOverride {
  subject: string;
  body: string;
}

export interface ReminderSettings {
  /** Keyed by ReminderTemplate.id; only present once a template's default has been edited. */
  templateOverrides: Record<string, TemplateOverride>;
  automationEnabled: boolean;
  automationTemplateId: string;
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  return readJson<ReminderSettings>("reminder-settings.json", {
    templateOverrides: {},
    automationEnabled: false,
    automationTemplateId: DEFAULT_TEMPLATE_ID,
  });
}

/** Merges saved overrides onto the built-in templates for display/editing. */
export async function getEffectiveTemplates() {
  const settings = await getReminderSettings();
  return REMINDER_TEMPLATES.map((t) => ({
    ...t,
    subject: settings.templateOverrides[t.id]?.subject ?? t.subject,
    body: settings.templateOverrides[t.id]?.body ?? t.body,
  }));
}

export async function saveReminderSettings(
  settings: ReminderSettings,
  actor: string
): Promise<void> {
  await writeJson("reminder-settings.json", settings);
  await appendAudit({
    actor,
    action: "reminder_settings.updated",
    entityType: "settings",
    entityId: "reminder-settings",
    summary: settings.automationEnabled
      ? "Enabled automated monthly payment reminders"
      : "Updated reminder template / disabled automation",
  });
}


export interface ReminderLogEntry {
  id: string;
  contractId: string;
  clientName: string;
  channel: "email" | "sms";
  ok: boolean;
  error: string | null;
  sentAt: string;
  sentBy: string;
}

export async function logReminder(entry: Omit<ReminderLogEntry, "id" | "sentAt">): Promise<void> {
  const log = await readJson<ReminderLogEntry[]>("reminder-log.json", []);
  log.unshift({ id: newId("reminder"), sentAt: new Date().toISOString(), ...entry });
  await writeJson("reminder-log.json", log.slice(0, 1000));
  await appendAudit({
    actor: entry.sentBy,
    action: entry.ok ? "reminder.sent" : "reminder.failed",
    entityType: "reminder",
    entityId: entry.contractId,
    summary: entry.ok
      ? `Sent ${entry.channel} reminder to ${entry.clientName}`
      : `Failed to send ${entry.channel} reminder to ${entry.clientName}: ${entry.error}`,
  });
}

export async function listReminderLog(): Promise<ReminderLogEntry[]> {
  return readJson<ReminderLogEntry[]>("reminder-log.json", []);
}

// ---------------------------------------------------------------------------
// Contracts created through the "New Client" flow: a client plus the lot
// they're taking and their payment terms, with the signed contract on file.
// ---------------------------------------------------------------------------

export interface LocalContract {
  id: string;
  clientId: string;
  clientName: string;
  lotDisplayId: string;
  priceCents: number;
  downpaymentCents: number;
  termMonths: number;
  planType: "monthly" | "quarterly" | "annual";
  startDate: string;
  contractFileId: string | null;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// Manual "mark as defaulted" overrides: staff can flag a contract defaulted
// by hand (ahead of the automatic delinquency schedule), but only with a
// reason on record, so the audit trail explains why.
// ---------------------------------------------------------------------------

export interface DefaultOverride {
  contractId: string;
  lotDisplayId: string;
  clientName: string;
  reason: string;
  markedBy: string;
  markedAt: string;
}

export async function listDefaultOverrides(): Promise<Record<string, DefaultOverride>> {
  return readJson<Record<string, DefaultOverride>>("default-overrides.json", {});
}

export async function markContractDefaulted(input: {
  contractId: string;
  lotDisplayId: string;
  clientName: string;
  reason: string;
  markedBy: string;
}): Promise<void> {
  const reason = input.reason.trim();
  const overrides = await listDefaultOverrides();
  overrides[input.contractId] = {
    contractId: input.contractId,
    lotDisplayId: input.lotDisplayId,
    clientName: input.clientName,
    reason,
    markedBy: input.markedBy,
    markedAt: new Date().toISOString(),
  };
  await writeJson("default-overrides.json", overrides);
  await appendAudit({
    actor: input.markedBy,
    action: "contract.marked_defaulted",
    entityType: "contract",
    entityId: input.contractId,
    summary: `Marked ${input.clientName} (${input.lotDisplayId}) as defaulted: ${reason}`,
  });
}

export async function listLocalContracts(): Promise<LocalContract[]> {
  return readJson<LocalContract[]>("local-contracts.json", []);
}

export async function createLocalContract(input: {
  clientId: string;
  clientName: string;
  lotDisplayId: string;
  priceCents: number;
  downpaymentCents: number;
  termMonths: number;
  planType: LocalContract["planType"];
  contractFileId: string | null;
  createdBy: string;
}): Promise<LocalContract> {
  const contracts = await listLocalContracts();
  const contract: LocalContract = {
    id: newId("contract"),
    clientId: input.clientId,
    clientName: input.clientName,
    lotDisplayId: input.lotDisplayId,
    priceCents: input.priceCents,
    downpaymentCents: input.downpaymentCents,
    termMonths: input.termMonths,
    planType: input.planType,
    startDate: new Date().toISOString().slice(0, 10),
    contractFileId: input.contractFileId,
    createdBy: input.createdBy,
  };
  contracts.push(contract);
  await writeJson("local-contracts.json", contracts);
  await appendAudit({
    actor: input.createdBy,
    action: "contract.created",
    entityType: "contract",
    entityId: contract.id,
    summary: `Assigned lot ${contract.lotDisplayId} to ${contract.clientName} (₱${(contract.priceCents / 100).toLocaleString()}, ${contract.termMonths}mo)`,
  });
  return contract;
}
