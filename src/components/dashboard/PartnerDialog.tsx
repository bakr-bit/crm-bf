"use client";

import { useState, useEffect, useRef } from "react";
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
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  contractFileUrl?: string | null;
  licenseFileUrl?: string | null;
  bankingFileUrl?: string | null;
  sopNotes?: string;
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
  const [status, setStatus] = useState("Active");
  const [hasContract, setHasContract] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [hasBanking, setHasBanking] = useState(false);
  const [sopNotes, setSopNotes] = useState("");
  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null);
  const [licenseFileUrl, setLicenseFileUrl] = useState<string | null>(null);
  const [bankingFileUrl, setBankingFileUrl] = useState<string | null>(null);
  const [sopUploading, setSopUploading] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const contractInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const bankingInputRef = useRef<HTMLInputElement>(null);
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
      setStatus(partner.status ?? "Active");
      setHasContract(partner.hasContract ?? false);
      setHasLicense(partner.hasLicense ?? false);
      setHasBanking(partner.hasBanking ?? false);
      setContractFileUrl(partner.contractFileUrl ?? null);
      setLicenseFileUrl(partner.licenseFileUrl ?? null);
      setBankingFileUrl(partner.bankingFileUrl ?? null);
      setSopNotes(partner.sopNotes ?? "");
      setAccountManagerUserId(partner.accountManagerUserId ?? "");
    } else {
      setName("");
      setWebsiteDomain("");
      setIsDirect(false);
      setStatus("Active");
      setHasContract(false);
      setHasLicense(false);
      setHasBanking(false);
      setContractFileUrl(null);
      setLicenseFileUrl(null);
      setBankingFileUrl(null);
      setSopNotes("");
      setAccountManagerUserId("");
    }
    setDuplicates([]);
    setPendingFiles({});
  }, [partner, open]);

  const fileUrlState: Record<string, { value: string | null; set: (v: string | null) => void }> = {
    contract: { value: contractFileUrl, set: setContractFileUrl },
    license: { value: licenseFileUrl, set: setLicenseFileUrl },
    banking: { value: bankingFileUrl, set: setBankingFileUrl },
  };

  const fileInputRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    contract: contractInputRef,
    license: licenseInputRef,
    banking: bankingInputRef,
  };

  async function handleSopUpload(docType: string, file: File) {
    if (!isEdit) {
      // Queue file for upload after partner creation
      setPendingFiles((prev) => ({ ...prev, [docType]: file }));
      fileUrlState[docType].set("pending");
      toast.success(`${docType} document queued for upload.`);
      return;
    }
    setSopUploading(docType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);
      const res = await fetch(`/api/partners/${partner!.id}/sop-documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed");
      }
      const { storagePath } = await res.json();
      fileUrlState[docType].set(storagePath);
      toast.success(`${docType} document uploaded.`);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setSopUploading(null);
    }
  }

  async function handleSopDelete(docType: string) {
    if (!isEdit) {
      // Remove queued file
      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
      fileUrlState[docType].set(null);
      return;
    }
    if (!partner?.id) return;
    try {
      const res = await fetch(`/api/partners/${partner.id}/sop-documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }
      fileUrlState[docType].set(null);
      toast.success(`${docType} document removed.`);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    }
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

      // Upload pending files after creating a new partner
      if (!isEdit) {
        const data = await res.json();
        const newPartnerId = data.partnerId;
        const fileEntries = Object.entries(pendingFiles);
        if (fileEntries.length > 0 && newPartnerId) {
          for (const [docType, file] of fileEntries) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("docType", docType);
            try {
              await fetch(`/api/partners/${newPartnerId}/sop-documents`, {
                method: "POST",
                body: formData,
              });
            } catch {
              toast.error(`Failed to upload ${docType} document.`);
            }
          }
        }
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
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
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

          {/* SOP Section - only visible when isDirect is checked */}
          {isDirect && (
            <div className="grid gap-4 rounded-md border p-4">
              <p className="text-sm font-medium">SOP Details</p>

              {([
                { key: "contract", id: "partner-has-contract", label: "Has Contract", checked: hasContract, setChecked: setHasContract },
                { key: "license", id: "partner-has-license", label: "Has License", checked: hasLicense, setChecked: setHasLicense },
                { key: "banking", id: "partner-has-banking", label: "Has Banking", checked: hasBanking, setChecked: setHasBanking },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.setChecked(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={item.id} className="min-w-[100px]">{item.label}</Label>
                  {fileUrlState[item.key].value ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-muted-foreground">
                        {pendingFiles[item.key] ? pendingFiles[item.key].name : "File uploaded"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        title="Remove file"
                        onClick={() => handleSopDelete(item.key)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="ml-auto">
                      <input
                        ref={fileInputRefs[item.key]}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSopUpload(item.key, file);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={sopUploading === item.key}
                        onClick={() => fileInputRefs[item.key]?.current?.click()}
                      >
                        <Upload className="mr-1 size-3" />
                        {sopUploading === item.key ? "Uploading…" : "Upload"}
                      </Button>
                    </div>
                  )}
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
