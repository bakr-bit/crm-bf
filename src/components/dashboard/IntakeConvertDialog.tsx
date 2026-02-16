"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { COUNTRY_MAP } from "@/lib/countries";

interface IntakeBrand {
  brandName: string;
  brandDomain?: string;
  targetGeos?: string[];
  licenseInfo?: string;
}

interface Submission {
  submissionId: string;
  companyName: string;
  websiteDomain: string | null;
  brands: IntakeBrand[];
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactTelegram: string | null;
  preferredContact: string | null;
  notes: string | null;
  status: string;
  submittedAt: string;
  intakeLink: {
    createdBy: { name: string };
  };
}

interface Duplicate {
  partnerId: string;
  name: string;
  websiteDomain: string | null;
  matchType: "name" | "domain" | "both";
}

interface IntakeConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: Submission | null;
  onSuccess: () => void;
}

export function IntakeConvertDialog({
  open,
  onOpenChange,
  submission,
  onSuccess,
}: IntakeConvertDialogProps) {
  const [partnerStatus, setPartnerStatus] = useState("Pending");
  const [isDirect, setIsDirect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  if (!submission) return null;

  const isPending = submission.status === "Pending";
  const brands = submission.brands || [];

  async function handleConvert(force = false) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/intake-submissions/${submission!.submissionId}/convert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerStatus, isDirect, force }),
        }
      );

      const data = await res.json();

      if (res.status === 409 && data.code === "DUPLICATE_PARTNER") {
        setDuplicates(data.duplicates);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to convert");
      }

      toast.success("Submission converted to Partner + Brand(s) + Contact.");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      const res = await fetch(
        `/api/intake-submissions/${submission!.submissionId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to reject");
      }

      toast.success("Submission rejected.");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setRejecting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Intake Submission — {submission.companyName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Company Details */}
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Company
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Company Name</dt>
              <dd>{submission.companyName}</dd>
              <dt className="text-muted-foreground">Website Domain</dt>
              <dd>{submission.websiteDomain || "—"}</dd>
            </dl>
          </section>

          {/* Brand Details */}
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Brands ({brands.length})
            </h4>
            <div className="space-y-3">
              {brands.map((brand, i) => (
                <div key={i} className="rounded-md border p-3">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Brand Name</dt>
                    <dd>{brand.brandName}</dd>
                    <dt className="text-muted-foreground">Brand Domain</dt>
                    <dd>{brand.brandDomain || "—"}</dd>
                    <dt className="text-muted-foreground">License Info</dt>
                    <dd>{brand.licenseInfo || "—"}</dd>
                    <dt className="text-muted-foreground">Target Geos</dt>
                    <dd>
                      {(brand.targetGeos ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(brand.targetGeos ?? []).map((code) => (
                            <Badge key={code} variant="secondary" className="text-xs">
                              {COUNTRY_MAP[code] ?? code}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Details */}
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contact
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{submission.contactName}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{submission.contactEmail}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{submission.contactPhone || "—"}</dd>
              <dt className="text-muted-foreground">Telegram</dt>
              <dd>{submission.contactTelegram || "—"}</dd>
              <dt className="text-muted-foreground">Preferred Contact</dt>
              <dd>{submission.preferredContact || "—"}</dd>
            </dl>
          </section>

          {/* Notes */}
          {submission.notes && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </h4>
              <p className="text-sm">{submission.notes}</p>
            </section>
          )}

          <div className="text-xs text-muted-foreground">
            Submitted {new Date(submission.submittedAt).toLocaleString()} — Assigned to{" "}
            {submission.intakeLink.createdBy.name}
          </div>

          {/* Dedup Warning */}
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
                  onClick={() => setDuplicates([])}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleConvert(true)}
                  disabled={loading}
                >
                  {loading ? "Converting..." : "Convert Anyway"}
                </Button>
              </div>
            </div>
          )}

          {/* Conversion Options */}
          {isPending && duplicates.length === 0 && !showReject && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Partner Status</Label>
                  <Select value={partnerStatus} onValueChange={setPartnerStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end space-x-2 pb-1">
                  <Checkbox
                    id="isDirect"
                    checked={isDirect}
                    onCheckedChange={(checked) =>
                      setIsDirect(checked === true)
                    }
                  />
                  <Label htmlFor="isDirect">Direct Partner</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleConvert()} disabled={loading}>
                  {loading ? "Converting..." : "Convert"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReject(true)}
                >
                  Reject
                </Button>
              </div>
            </>
          )}

          {/* Reject Form */}
          {isPending && showReject && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Rejection Reason (optional)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejecting this submission..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejecting}
                >
                  {rejecting ? "Rejecting..." : "Confirm Reject"}
                </Button>
                <Button variant="outline" onClick={() => setShowReject(false)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
