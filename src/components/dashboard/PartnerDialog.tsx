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
  const [lastInvoicedAt, setLastInvoicedAt] = useState("");
  const [accountManagerUserId, setAccountManagerUserId] = useState("");
  const [users, setUsers] = useState<{id: string; name: string; email: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  // Brand creation step state
  const [showBrandStep, setShowBrandStep] = useState(false);
  const [createdPartnerId, setCreatedPartnerId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandDomain, setBrandDomain] = useState("");
  const [brandAffiliateSoftware, setBrandAffiliateSoftware] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);

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
      setLastInvoicedAt(partner.lastInvoicedAt ? partner.lastInvoicedAt.slice(0, 10) : "");
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
      setLastInvoicedAt("");
      setAccountManagerUserId("");
    }
    setDuplicates([]);
    setShowBrandStep(false);
    setCreatedPartnerId("");
    setBrandName("");
    setBrandDomain("");
    setBrandAffiliateSoftware("");
  }, [partner, open]);

  function handleClose(openState: boolean) {
    if (!openState && showBrandStep) {
      // If closing during brand step, still trigger success (partner was already created)
      onSuccess();
    }
    onOpenChange(openState);
  }

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
      lastInvoicedAt: lastInvoicedAt || undefined,
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

      const responseData = await res.json();
      toast.success(isEdit ? "Partner updated." : "Partner created.");

      if (!isEdit && responseData.partnerId) {
        // After creating, show brand creation step
        setCreatedPartnerId(responseData.partnerId);
        setShowBrandStep(true);
        onSuccess(); // Refresh parent list
      } else {
        onOpenChange(false);
        onSuccess();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBrand() {
    if (!brandName.trim()) {
      toast.error("Brand name is required.");
      return;
    }

    setBrandLoading(true);
    try {
      const res = await fetch(`/api/partners/${createdPartnerId}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brandName.trim(),
          brandDomain: brandDomain.trim() || undefined,
          affiliateSoftware: brandAffiliateSoftware.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create brand.");
      }

      toast.success("Brand created.");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setBrandLoading(false);
    }
  }

  if (showBrandStep) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a Brand?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Would you like to add the first brand for this partner?
          </p>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="brand-name">Brand Name *</Label>
              <Input
                id="brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Brand name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand-domain">Brand Domain</Label>
              <Input
                id="brand-domain"
                value={brandDomain}
                onChange={(e) => setBrandDomain(e.target.value)}
                placeholder="example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand-software">Affiliate Software</Label>
              <Input
                id="brand-software"
                value={brandAffiliateSoftware}
                onChange={(e) => setBrandAffiliateSoftware(e.target.value)}
                placeholder="e.g. Income Access, NetRefer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={brandLoading}
            >
              Skip
            </Button>
            <Button onClick={handleCreateBrand} disabled={brandLoading || !brandName.trim()}>
              {brandLoading ? "Creating..." : "Create Brand"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
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
            <Label htmlFor="partner-last-invoiced">Last Invoiced</Label>
            <Input
              id="partner-last-invoiced"
              type="date"
              value={lastInvoicedAt}
              onChange={(e) => setLastInvoicedAt(e.target.value)}
            />
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
