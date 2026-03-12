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
import { COUNTRIES } from "@/lib/countries";
import { Plus, X } from "lucide-react";

interface Credential {
  id: string;
  label: string;
  loginUrl?: string;
  username: string;
  email?: string;
  password?: string;
  softwareType?: string;
  notes?: string;
  geo?: string | null;
  trackingLinks?: string[];
}

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  credential?: Credential;
  onSuccess: () => void;
}

export function CredentialDialog({
  open,
  onOpenChange,
  partnerId,
  credential,
  onSuccess,
}: CredentialDialogProps) {
  const isEdit = Boolean(credential);

  const [label, setLabel] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [softwareType, setSoftwareType] = useState("");
  const [notes, setNotes] = useState("");
  const [geo, setGeo] = useState<string>("__global");
  const [trackingLinks, setTrackingLinks] = useState<string[]>([]);
  const [newTrackingLink, setNewTrackingLink] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (credential) {
      setLabel(credential.label ?? "");
      setLoginUrl(credential.loginUrl ?? "");
      setUsername(credential.username ?? "");
      setEmail(credential.email ?? "");
      setPassword(credential.password ?? "");
      setSoftwareType(credential.softwareType ?? "");
      setNotes(credential.notes ?? "");
      setGeo(credential.geo ?? "__global");
      setTrackingLinks(credential.trackingLinks ?? []);
    } else {
      setLabel("");
      setLoginUrl("");
      setUsername("");
      setEmail("");
      setPassword("");
      setSoftwareType("");
      setNotes("");
      setGeo("__global");
      setTrackingLinks([]);
    }
    setNewTrackingLink("");
  }, [credential, open]);

  function handleAddTrackingLink() {
    const url = newTrackingLink.trim();
    if (!url) return;
    if (trackingLinks.includes(url)) {
      toast.error("This tracking link already exists.");
      return;
    }
    setTrackingLinks([...trackingLinks, url]);
    setNewTrackingLink("");
  }

  function handleRemoveTrackingLink(index: number) {
    setTrackingLinks(trackingLinks.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!label.trim()) {
      toast.error("Label is required.");
      return;
    }
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (!password.trim() && !isEdit) {
      toast.error("Password is required.");
      return;
    }

    setLoading(true);

    const body: Record<string, unknown> = {
      label: label.trim(),
      loginUrl: loginUrl.trim() || undefined,
      username: username.trim(),
      email: email.trim() || undefined,
      softwareType: softwareType || undefined,
      notes: notes.trim() || undefined,
      geo: geo === "__global" ? null : geo,
      trackingLinks,
    };

    // Only include password if provided (for edit, it's optional)
    if (password.trim()) {
      body.password = password.trim();
    }

    try {
      const url = isEdit
        ? `/api/partners/${partnerId}/credentials/${credential!.id}`
        : `/api/partners/${partnerId}/credentials`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save credential.");
      }

      toast.success(isEdit ? "Credential updated." : "Credential created.");
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Credential" : "Add Credential"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Label + Geo row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cred-label">Label *</Label>
              <Input
                id="cred-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Income Access"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label>Geo</Label>
              <Select value={geo} onValueChange={setGeo}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global">
                    Global
                  </SelectItem>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="inline-flex items-center gap-2">
                        <span className={`fflag fflag-${c.code} ff-sm`} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Login URL */}
          <div className="grid gap-2">
            <Label htmlFor="cred-login-url">Login URL</Label>
            <Input
              id="cred-login-url"
              value={loginUrl}
              onChange={(e) => setLoginUrl(e.target.value)}
              placeholder="https://..."
              autoComplete="off"
            />
          </div>

          {/* Username */}
          <div className="grid gap-2">
            <Label htmlFor="cred-username">Username *</Label>
            <Input
              id="cred-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="off"
            />
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="cred-email">Email</Label>
            <Input
              id="cred-email"
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="cred-password">
              Password {isEdit ? "(leave blank to keep)" : "*"}
            </Label>
            <Input
              id="cred-password"
              type="text"
              className="[-webkit-text-security:disc]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Password"}
              autoComplete="off"
            />
          </div>

          {/* Software Type */}
          <div className="grid gap-2">
            <Label htmlFor="cred-software-type">Software Type</Label>
            <Input
              id="cred-software-type"
              value={softwareType}
              onChange={(e) => setSoftwareType(e.target.value)}
              placeholder="e.g. Income Access, NetRefer, MyAffiliates"
            />
          </div>

          {/* Tracking Links */}
          <div className="grid gap-2">
            <Label>Tracking Links</Label>
            {trackingLinks.length > 0 && (
              <div className="space-y-1.5">
                {trackingLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm font-mono bg-muted px-2 py-1 rounded">
                      {link}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => handleRemoveTrackingLink(i)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={newTrackingLink}
                onChange={(e) => setNewTrackingLink(e.target.value)}
                placeholder="https://tracking-link..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTrackingLink();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTrackingLink}
                disabled={!newTrackingLink.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="cred-notes">Notes</Label>
            <Textarea
              id="cred-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
