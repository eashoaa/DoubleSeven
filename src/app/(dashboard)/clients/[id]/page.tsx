import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Money } from "@/components/shared/money";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getDevMasterlist } from "@/lib/domain/dev-masterlist";
import { generateInstallmentSchedule } from "@/lib/domain/schedule";
import { deriveLotStatus, netPaidCents, outstandingBalanceCents } from "@/lib/domain/status";
import { listLocalClients, listLocalContracts, listCollections, getContactOverrides } from "@/lib/server/local-store";
import { getClientHistoryAction } from "@/server/actions/client-history";
import { getCurrentUser } from "@/lib/supabase/current-user";
import contractPdfs from "../../../../../scripts/data/contract-pdfs.json";
import { EditContactDialog } from "@/components/clients/edit-contact-dialog";
import { WaivePenaltyButton } from "@/components/clients/waive-penalty-button";
import { VerifyClientButton } from "@/components/clients/verify-client-button";
import { can } from "@/lib/permissions";
import type { LotStatus } from "@/types/domain";

const CONTRACT_PDFS = contractPdfs as Record<string, string[]>;

interface ClientDetail {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  since: string;
  verifiedAt: string | null;
}

interface PenaltyRow {
  id: string;
  installmentSeq: number;
  amountCents: number;
}

interface ContractSummary {
  id: string;
  lotDisplayId: string;
  priceCents: number;
  paidCents: number;
  status: LotStatus;
  penalties: PenaltyRow[];
}

async function getDevFallbackDetail(id: string) {
  const { clients, contracts: masterlistContracts } = getDevMasterlist();
  const [localClients, localContracts, collections, overrides] = await Promise.all([
    listLocalClients(),
    listLocalContracts(),
    listCollections(),
    getContactOverrides(),
  ]);

  const masterlistClient = clients.find((c) => c.id === id);
  const localClient = localClients.find((c) => c.id === id);
  if (!masterlistClient && !localClient) return null;

  const override = overrides[id];
  const client: ClientDetail = masterlistClient
    ? {
        id: masterlistClient.id,
        name: masterlistClient.name,
        contact: override?.contact ?? masterlistClient.contact,
        email: override?.email ?? masterlistClient.email,
        address: override?.address ?? null,
        since: masterlistClient.since,
        verifiedAt: null,
      }
    : {
        id: localClient!.id,
        name: localClient!.name,
        contact: override?.contact ?? localClient!.contact,
        email: override?.email ?? localClient!.email,
        address: override?.address ?? localClient!.address,
        since: localClient!.since,
        verifiedAt: null,
      };

  const contracts: ContractSummary[] = masterlistContracts
    .filter((c) => c.clientId === id)
    .map((c) => ({
      id: c.id,
      lotDisplayId: c.lotDisplayId,
      priceCents: c.priceCents,
      paidCents: c.paidCents,
      status: c.status,
      penalties: [],
    }));

  for (const c of localContracts.filter((c) => c.clientId === id)) {
    const paidCents = collections
      .filter((row) => !row.voided && row.lotDisplayId === c.lotDisplayId)
      .reduce((sum, row) => sum + row.grossCents, 0);
    const schedule = generateInstallmentSchedule({
      priceCents: c.priceCents,
      downpaymentCents: c.downpaymentCents,
      interestRatePercent: 0,
      termMonths: c.termMonths,
      planType: c.planType,
      startDate: c.startDate,
    });
    const status = deriveLotStatus({
      priceCents: c.priceCents,
      transactions: [{ type: "payment", grossCents: paidCents, discountCents: 0, voided: false }],
      installments: schedule.filter((s) => s.seq > 0),
      today: new Date(),
    });
    contracts.push({ id: c.id, lotDisplayId: c.lotDisplayId, priceCents: c.priceCents, paidCents, status, penalties: [] });
  }

  return { client, contracts, contractIdsWithFiles: [] as string[] };
}

async function getSupabaseDetail(id: string) {
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) return null;

  const { data: contracts } = await supabase
    .from("contracts")
    .select(
      "id, price_cents, status, contract_file_path, lots(display_id), transactions(type, gross_cents, discount_cents, voided), penalties(id, installment_seq, amount_cents, waived_at)"
    )
    .eq("client_id", id)
    .is("deleted_at", null);

  const summaries: ContractSummary[] = (contracts ?? []).map((c) => {
    const lot = c.lots as unknown as { display_id: string } | null;
    const txns =
      (c.transactions as unknown as { type: string; gross_cents: number; discount_cents: number; voided: boolean }[]) ?? [];
    const penaltyRows =
      (c.penalties as unknown as { id: string; installment_seq: number; amount_cents: number; waived_at: string | null }[]) ??
      [];
    return {
      id: c.id,
      lotDisplayId: lot?.display_id ?? "-",
      priceCents: c.price_cents,
      paidCents: netPaidCents(
        txns.map((t) => ({ type: t.type, grossCents: t.gross_cents, discountCents: t.discount_cents, voided: t.voided }))
      ),
      status: c.status,
      penalties: penaltyRows
        .filter((p) => !p.waived_at)
        .map((p) => ({ id: p.id, installmentSeq: p.installment_seq, amountCents: p.amount_cents })),
    };
  });

  const contractIdsWithFiles = (contracts ?? []).filter((c) => c.contract_file_path).map((c) => c.id);

  return {
    client: {
      id: client.id,
      name: client.name,
      contact: client.contact,
      email: client.email,
      address: client.address ?? null,
      since: client.since,
      verifiedAt: client.verified_at,
    } as ClientDetail,
    contracts: summaries,
    contractIdsWithFiles,
  };
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getSupabaseDetail(id) : await getDevFallbackDetail(id);
  if (!detail) notFound();

  const { client, contracts, contractIdsWithFiles } = detail;
  const history = await getClientHistoryAction(client.id, client.name);
  const user = await getCurrentUser();
  const canWaivePenalty = user.role === "admin" || user.role === "accountant";
  const canVerify = can(user.role, "editClient");
  const pdfs = CONTRACT_PDFS[client.name] ?? [];
  const hasAnyContractFile = pdfs.length > 0 || contractIdsWithFiles.length > 0;
  const totalPrice = contracts.reduce((sum, c) => sum + c.priceCents, 0);
  const totalPaid = contracts.reduce((sum, c) => sum + c.paidCents, 0);
  const totalPenalty = contracts.reduce((sum, c) => sum + c.penalties.reduce((s, p) => s + p.amountCents, 0), 0);
  const totalBalance = outstandingBalanceCents({ priceCents: totalPrice, paidCents: totalPaid, penaltyCents: totalPenalty });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Clients
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{client.name}</h1>
            <p className="text-sm text-muted-foreground">Client since {formatDate(client.since)}</p>
          </div>
          <EditContactDialog clientId={client.id} clientName={client.name} contact={client.contact} email={client.email} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="shadow-card rounded-2xl border border-hairline bg-card p-5">
          <div className="text-sm text-muted-foreground">Total contract value</div>
          <Money centavos={totalPrice} className="mt-1 block text-2xl font-semibold text-foreground" />
        </div>
        <div className="shadow-card rounded-2xl border border-hairline bg-card p-5">
          <div className="text-sm text-muted-foreground">Total paid</div>
          <Money centavos={totalPaid} className="mt-1 block text-2xl font-semibold text-foreground" />
        </div>
        <div className="shadow-card rounded-2xl border border-hairline bg-card p-5">
          <div className="text-sm text-muted-foreground">Balance remaining</div>
          <Money centavos={totalBalance} className="mt-1 block text-2xl font-semibold text-foreground" />
        </div>
      </div>

      <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          {canVerify && <VerifyClientButton clientId={client.id} verifiedAt={client.verifiedAt} />}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Contact number</div>
            <div className="text-sm text-foreground">{client.contact ?? "Not on file"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="text-sm text-foreground">{client.email ?? "Not on file"}</div>
          </div>
          {client.address ? (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Address</div>
              <div className="text-sm text-foreground">{client.address}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Lots &amp; contracts</h2>
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contracts on record for this client.</p>
        ) : (
          <div className="flex flex-col divide-y divide-hairline">
            {contracts.map((c) => {
              const contractPenaltyCents = c.penalties.reduce((sum, p) => sum + p.amountCents, 0);
              const balanceCents = outstandingBalanceCents({
                priceCents: c.priceCents,
                paidCents: c.paidCents,
                penaltyCents: contractPenaltyCents,
              });
              return (
                <div key={c.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link
                        href={`/map?lot=${encodeURIComponent(c.lotDisplayId)}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {c.lotDisplayId}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        <Money centavos={c.paidCents} /> paid of <Money centavos={c.priceCents} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Money centavos={balanceCents} className="text-sm text-muted-foreground" />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                  {c.penalties.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-status-defaulted-bg px-3 py-2 text-xs"
                    >
                      <span className="text-status-defaulted-fg">
                        2% penalty · installment #{p.installmentSeq} · <Money centavos={p.amountCents} />
                      </span>
                      {canWaivePenalty && <WaivePenaltyButton penaltyId={p.id} />}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Signed contract</h2>
        {!hasAnyContractFile ? (
          <p className="text-sm text-muted-foreground">Not on file.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {/* The per-contract contractIdsWithFiles mechanism is now the
                complete, authoritative source for every contract's scan —
                only fall back to the legacy name-keyed contract-pdfs.json
                map (a small early pilot batch) when a client has no
                per-contract file at all, so the two don't double-render
                the same PDF as two separate buttons. */}
            {(contractIdsWithFiles.length > 0 ? [] : pdfs).map((filename) => (
              <Link
                key={filename}
                href={`/api/contracts/${encodeURIComponent(filename)}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <FileText className="size-3.5" strokeWidth={2} />
                View contract
              </Link>
            ))}
            {contractIdsWithFiles.map((contractId) => (
              <Link
                key={contractId}
                href={`/api/contracts/by-id/${contractId}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <FileText className="size-3.5" strokeWidth={2} />
                View contract
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Payment history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments on record for this client.</p>
        ) : (
          <div className="flex flex-col divide-y divide-hairline">
            {history.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground capitalize">{r.type.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.date)} · {r.lotDisplayId}
                    {r.method ? ` · ${r.method.replace(/_/g, " ")}` : ""}
                  </div>
                </div>
                <Money centavos={r.amountCents} className="text-sm font-medium text-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
