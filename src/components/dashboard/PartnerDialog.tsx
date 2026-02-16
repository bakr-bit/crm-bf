"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { PARTNER_STATUSES, PARTNER_STATUS_LABELS } from "@/lib/partner-status";

interface DuplicateMatch {
  partnerId: string;
  name: string;
  websiteDomain: string | null;
  matchType: "name" | "domain" | "both";
}

interface Partner {
  id: string;
  name: string;
  websiteDomain?: string;
  isDirect?: boolean;
  status?: string;
  hasContract?: boolean;
  hasLicense?: boolean;
  hasBanking?: boolean;
  sopNotes?: string;
  lastInvoicedAt?: string;
  accountManagerUserId?: string;
}

interface PartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner;
  onSuccess: () => void;
}

export function PartnerDialog({
  open,
  onOpenChange,
  partner,
  onSuccess,
}: PartnerDialogProps) {
  const isEdit = Boolean(partner);

  const [name, setName] = useState("");
  const [websiteDomain, setWebsiteDomain] = useState("");
  const [isDirect, setIsDirect] = useState(false);
  const [status, setStatus] = useState("Lead");
  const [hasContract, setHasContract] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [hasBanking, setHasBanking] = useState(false);
  const [sopNotes, setSopNotes] = useState("");
  const [lastInvoicedAt, setLastInvoicedAt] = useState<Date | undefined>(undefined);
  const [accountManagerUserId, setAccountManagerUserId] = useState("");
  const [users, setUsers] = useState<{id: string; name: string; email: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [open]);

  useEffect(() => {
    if (partner) {
      setName(partner.name ?? "");
      setWebsiteDomain(partner.websiteDomain ?? "");
      setIsDirect(partner.isDirect ?? false);
      setStatus(partner.status ?? "Lead");
      setHasContract(partner.hasContract ?? false);
      setHasLicense(partner.hasLicense ?? false);
      setHasBanking(partner.hasBanking ?? false);
      setSopNotes(partner.sopNotes ?? "");
      setLastInvoicedAt(partner.lastInvoicedAt ? new Date(partner.lastInvoicedAt) : undefined);
      setAccountManagerUserId(partner.accountManagerUserId ?? "");
    } else {
      setName("");
      setWebsiteDomain("");
      setIsDirect(false);
      setStatus("Lead");
      setHasContract(false);
      setHasLicense(false);
      setHasBanking(false);
      setSopNotes("");
      setLastInvoicedAt(undefined);
      setAccountManagerUserId("");
    }
    setDuplicates([]);
  }, [partner, open]);

  async function handleSubmit(force = false) {
    if (!name.trim()) {
      toast.error("Partner name is required.");
      return;
    }

    setLoading(true);
    setDuplicates([]);

    const body = {
      name: name.trim(),
      websiteDomain: websiteDomain.trim() || undefined,
      isDirect,
      status,
      lastInvoicedAt: lastInvoicedAt ? lastInvoicedAt.toISOString() : undefined,
      accountManagerUserId: accountManagerUserId || undefined,
      force,
      ...(isDirect && {
        hasContract,
        hasLicense,
        hasBanking,
        sopNotes: sopNotes.trim() || undefined,
      }),
    };

    try {
      const url = isEdit
        ? `/api/partners/${partner!.id}`
        : "/api/partners";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409 && data?.code === "DUPLICATE_PARTNER") {
          setDuplicates(data.duplicates);
          return;
        }
        throw new Error(data?.error ?? "Failed to save partner.");
      }

      toast.success(isEdit ? "Partner updated." : "Partner created.");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Partner" : "Create Partner"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="partner-name">Name *</Label>
            <Input
              id="partner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Partner name"
            />
          </div>

          {/* Website Domain */}
          <div className="grid gap-2">
            <Label htmlFor="partner-domain">Website Domain</Label>
            <Input
              id="partner-domain"
              value={websiteDomain}
              onChange={(e) => setWebsiteDomain(e.target.value)}
              placeholder="example.com"
            />
          </div>

          {/* Is Direct */}
          <div className="flex items-center gap-2">
            <input
              id="partner-is-direct"
              type="checkbox"
              checked={isDirect}
              onChange={(e) => setIsDirect(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="partner-is-direct">Direct Partner</Label>
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTNER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PARTNER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Manager */}
          <div className="grid gap-2">
            <Label>Account Manager</Label>
            <Select
              value={accountManagerUserId}
              onValueChange={(val) => setAccountManagerUserId(val === "none" ? "" : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Last Invoiced */}
          <div className="grid gap-2">
            <Label>Last Invoiced</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !lastInvoicedAt ? "text-muted-foreground" : ""
                  }`}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {lastInvoicedAt ? format(lastInvoicedAt, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={lastInvoicedAt}
                  onSelect={setLastInvoicedAt}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* SOP Section - only visible when isDirect is checked */}
          {isDirect && (
            <div className="grid gap-4 rounded-md border p-4">
              <p className="text-sm font-medium">SOP Compliance</p>

              {([
                { id: "partner-has-contract", label: "Has Contract", checked: hasContract, setChecked: setHasContract },
                { id: "partner-has-license", label: "Has License", checked: hasLicense, setChecked: setHasLicense },
                { id: "partner-has-banking", label: "Has Banking", checked: hasBanking, setChecked: setHasBanking },
              ] as const).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.setChecked(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={item.id}>{item.label}</Label>
                </div>
              ))}

              <div className="grid gap-2">
                <Label htmlFor="partner-sop-notes">SOP Notes</Label>
                <Textarea
                  id="partner-sop-notes"
                  value={sopNotes}
                  onChange={(e) => setSopNotes(e.target.value)}
                  placeholder="Additional SOP notes..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {duplicates.length > 0 && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-800">
              Potential duplicate partner{duplicates.length > 1 ? "s" : ""} found:
            </p>
            <ul className="mt-1 space-y-1">
              {duplicates.map((d) => (
                <li key={d.partnerId} className="text-sm text-yellow-700">
                  <Link
                    href={`/dashboard/partners/${d.partnerId}`}
                    target="_blank"
                    className="font-medium underline hover:text-yellow-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {d.name}
                  </Link>
                  {d.websiteDomain && (
                    <span className="text-yellow-600"> ({d.websiteDomain})</span>
                  )}
                  <span className="ml-1 text-xs text-yellow-500">
                    — matched by {d.matchType}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDuplicates([]); onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? "Saving..." : isEdit ? "Update Anyway" : "Create Anyway"}
              </Button>
            </div>
          </div>
        )}

        {duplicates.length === 0 && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSubmit()} disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
