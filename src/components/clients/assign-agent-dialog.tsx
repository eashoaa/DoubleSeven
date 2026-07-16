"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAgentsAction, assignClientAgentAction } from "@/server/actions/agents";
import type { Agent } from "@/server/actions/agents";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AssignAgentDialog({
  clientId,
  clientName,
  currentAgentName,
}: {
  clientId: string;
  clientName: string;
  currentAgentName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [pending, startTransition] = useTransition();

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(true);
    if (agents === null) {
      startTransition(async () => {
        setAgents(await getAgentsAction());
      });
    }
  }

  function handleSave() {
    const agent = agents?.find((a) => a.id === selectedAgentId);
    if (!agent) return;
    startTransition(async () => {
      await assignClientAgentAction({
        clientId,
        clientName,
        agentId: agent.id,
        agentName: agent.name,
      });
      toast.success(`Tagged ${clientName} to ${agent.name}`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-hairline px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Pencil className="size-3" strokeWidth={2} />
        {currentAgentName ? "Change" : "Tag agent"}
      </button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{clientName}</DialogTitle>
          <DialogDescription>Tag the sales agent responsible for this client, for commissions.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agentId">Agent</Label>
          <select
            id="agentId"
            value={selectedAgentId}
            disabled={!agents}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              {agents ? "Select an agent…" : "Loading agents…"}
            </option>
            {agents?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.commission_rate}%)
              </option>
            ))}
          </select>
          {agents && agents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No agents yet — add one under Agents first.</p>
          ) : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            disabled={!selectedAgentId || pending}
            onClick={handleSave}
            className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
