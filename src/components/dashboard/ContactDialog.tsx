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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  telegram?: string;
  whatsapp?: string;
  preferredContact?: string;
  brandId?: string;
  geo?: string;
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  contact?: Contact;
  onSuccess: () => void;
  brands?: { brandId: string; name: string }[];
}

export function ContactDialog({
  open,
  onOpenChange,
  partnerId,
  contact,
  onSuccess,
  brands,
}: ContactDialogProps) {
  const isEdit = Boolean(contact);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [telegram, setTelegram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [brandId, setBrandId] = useState("");
  const [geo, setGeo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.name ?? "");
      setEmail(contact.email ?? "");
      setPhone(contact.phone ?? "");
      setRole(contact.role ?? "");
      setTelegram(contact.telegram ?? "");
      setWhatsapp(contact.whatsapp ?? "");
      setPreferredContact(contact.preferredContact ?? "");
      setBrandId(contact.brandId ?? "");
      setGeo(contact.geo ?? "");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("");
      setTelegram("");
      setWhatsapp("");
      setPreferredContact("");
      setBrandId("");
      setGeo("");
    }
  }, [contact, open]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Contact name is required.");
      return;
    }
    if (!email.trim()) {
      toast.error("Contact email is required.");
      return;
    }

    setLoading(true);

    const body = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      role: role.trim() || undefined,
      telegram: telegram.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      preferredContact: preferredContact || undefined,
      brandId: brandId && brandId !== "__none" ? brandId : undefined,
      geo: geo.trim().toUpperCase() || undefined,
    };

    try {
      const url = isEdit
        ? `/api/partners/${partnerId}/contacts/${contact!.id}`
        : `/api/partners/${partnerId}/contacts`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save contact.");
      }

      toast.success(isEdit ? "Contact updated." : "Contact created.");
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
            {isEdit ? "Edit Contact" : "Create Contact"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Name *</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="contact-email">Email *</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {/* Phone */}
          <div className="grid gap-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Role */}
          <div className="grid gap-2">
            <Label htmlFor="contact-role">Role</Label>
            <Input
              id="contact-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Account Manager"
            />
          </div>

          {/* Telegram */}
          <div className="grid gap-2">
            <Label htmlFor="contact-telegram">Telegram</Label>
            <Input
              id="contact-telegram"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
            />
          </div>

          {/* WhatsApp */}
          <div className="grid gap-2">
            <Label htmlFor="contact-whatsapp">WhatsApp</Label>
            <Input
              id="contact-whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Preferred Contact Method */}
          <div className="grid gap-2">
            <Label>Preferred Contact</Label>
            <Select value={preferredContact} onValueChange={setPreferredContact}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select preferred method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Telegram">Telegram</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Brand Scope */}
          {brands && brands.length > 0 && (
            <div className="grid gap-2">
              <Label>Brand Scope</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All brands (no scope)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">All brands (no scope)</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.brandId} value={b.brandId}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Geo Scope */}
          <div className="grid gap-2">
            <Label htmlFor="contact-geo">Geo Scope</Label>
            <Input
              id="contact-geo"
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              placeholder="e.g. US, GB (2-letter code)"
              maxLength={2}
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
