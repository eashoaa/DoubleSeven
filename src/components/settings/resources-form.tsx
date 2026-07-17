"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadResourceAction, type ResourceActionState, type Resource } from "@/server/actions/resources";

const initialState: ResourceActionState = { error: null, success: false };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ResourcesForm({ resources }: { resources: Resource[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await uploadResourceAction(initialState, formData);
      if (result.success) {
        toast.success("Resource uploaded");
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Company resources</h2>
        <p className="text-sm text-muted-foreground">
          The logo, policy docs, anything people keep asking &ldquo;who has this&rdquo; about — one place,
          findable by anyone logged in.
        </p>
      </div>

      {resources.length > 0 ? (
        <ul className="flex flex-col divide-y divide-hairline">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="ml-2 text-xs text-muted-foreground capitalize">{r.category}</span>
              </div>
              <a
                href={`/api/resources/${r.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                <Download className="size-3.5" strokeWidth={2} />
                Download
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No resources uploaded yet.</p>
      )}

      <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="resourceName">Name</Label>
          <Input id="resourceName" name="name" placeholder="Company logo" className="w-48" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" defaultValue="other" className={selectClass}>
            <option value="brand">Brand</option>
            <option value="policy">Policy</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">File</Label>
          <input id="file" name="file" type="file" required className="text-sm" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
