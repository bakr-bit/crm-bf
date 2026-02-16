"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PartnerDialog } from "@/components/dashboard/PartnerDialog";
import { BrandDialog } from "@/components/dashboard/BrandDialog";
import { BrandDetailDialog } from "@/components/dashboard/BrandDetailDialog";
import { ContactDialog } from "@/components/dashboard/ContactDialog";
import { CredentialDialog } from "@/components/dashboard/CredentialDialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Check,
  X,
  MoreHorizontal,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Upload,
  FileText,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { LICENSE_MAP } from "@/lib/licenses";
import { COUNTRY_MAP } from "@/lib/countries";

// ---------- types ----------

interface Brand {
  brandId: string;
  partnerId: string;
  name: string;
  brandDomain: string | null;
  brandIdentifiers: unknown;
  postbacks: string | null;
  licenses: string[];
  extraInfo: string | null;
  affiliateSoftware: string | null;
  status: string;
  targetGeos: string[];
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  contactId: string;
  partnerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  telegram: string | null;
  whatsapp: string | null;
  preferredContact: string | null;
  geo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Credential {
  credentialId: string;
  partnerId: string;
  label: string;
  loginUrl: string | null;
  username: string;
  email: string | null;
  softwareType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DealPosition {
  positionId: string;
  name: string;
  details: string | null;
}

interface DealAsset {
  assetId: string;
  name: string;
  assetDomain: string | null;
}

interface DealBrand {
  brandId: string;
  name: string;
}

interface Deal {
  dealId: string;
  partnerId: string;
  brandId: string;
  brand: DealBrand;
  assetId: string;
  asset: DealAsset;
  positionId: string;
  position: DealPosition;
  affiliateLink: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  isDirect: boolean;
  geo: string;
  notes: string | null;
  createdAt: string;
}

interface PartnerDetail {
  partnerId: string;
  name: string;
  websiteDomain: string | null;
  isDirect: boolean;
  status: string;
  hasContract: boolean;
  hasLicense: boolean;
  hasBanking: boolean;
  sopNotes: string | null;
  lastInvoicedAt: string | null;
  ownerUserId: string;
  owner: { id: string; name: string } | null;
  accountManagerUserId: string | null;
  accountManager: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  brands: Brand[];
  contacts: Contact[];
  deals: Deal[];
  credentials: Credential[];
}

// ---------- component ----------

export default function PartnerDetailPage() {
  const params = useParams<{ partnerId: string }>();
  const partnerId = params.partnerId;

  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>(
    undefined
  );
  const [viewingBrand, setViewingBrand] = useState<Brand | undefined>(
    undefined
  );
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(
    undefined
  );
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | undefined>(
    undefined
  );

  // Password reveal state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});

  const fetchPartner = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/${partnerId}`);
      if (!res.ok) throw new Error("Failed to fetch partner");
      const json: PartnerDetail = await res.json();
      setPartner(json);
    } catch (err) {
      console.error("Partner detail fetch error:", err);
      toast.error("Failed to load partner.");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchPartner();
  }, [fetchPartner]);

  // Archive brand
  async function handleArchiveBrand(brandId: string) {
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Archived" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to archive brand.");
      }
      toast.success("Brand archived.");
      fetchPartner();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  // Delete credential
  async function handleDeleteCredential(credentialId: string) {
    try {
      const res = await fetch(
        `/api/partners/${partnerId}/credentials/${credentialId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete credential.");
      }
      toast.success("Credential deleted.");
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[credentialId];
        return next;
      });
      fetchPartner();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  // Reveal password
  async function handleRevealPassword(credentialId: string) {
    if (revealedPasswords[credentialId]) {
      // Toggle off
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[credentialId];
        return next;
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/partners/${partnerId}/credentials/${credentialId}/reveal`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to reveal password");
      const data = await res.json();
      setRevealedPasswords((prev) => ({
        ...prev,
        [credentialId]: data.password,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  // Copy password
  async function handleCopyPassword(credentialId: string) {
    let password = revealedPasswords[credentialId];
    if (!password) {
      try {
        const res = await fetch(
          `/api/partners/${partnerId}/credentials/${credentialId}/reveal`,
          { method: "POST" }
        );
        if (!res.ok) throw new Error("Failed to reveal password");
        const data = await res.json();
        password = data.password;
      } catch {
        toast.error("Failed to copy password.");
        return;
      }
    }
    await navigator.clipboard.writeText(password);
    toast.success("Password copied to clipboard.");
  }

  // Dialog helpers
  function toPartnerDialogShape(p: PartnerDetail) {
    return {
      id: p.partnerId,
      name: p.name,
      websiteDomain: p.websiteDomain ?? undefined,
      isDirect: p.isDirect,
      status: p.status,
      hasContract: p.hasContract,
      hasLicense: p.hasLicense,
      hasBanking: p.hasBanking,
      sopNotes: p.sopNotes ?? undefined,
      lastInvoicedAt: p.lastInvoicedAt ?? undefined,
      accountManagerUserId: p.accountManagerUserId ?? undefined,
    };
  }

  function toBrandDialogShape(b: Brand) {
    return {
      id: b.brandId,
      name: b.name,
      brandDomain: b.brandDomain ?? undefined,
      postbacks: b.postbacks ?? undefined,
      licenses: b.licenses ?? [],
      extraInfo: b.extraInfo ?? undefined,
      affiliateSoftware: b.affiliateSoftware ?? undefined,
      status: b.status,
      targetGeos: b.targetGeos,
    };
  }

  function toContactDialogShape(c: Contact) {
    return {
      id: c.contactId,
      name: c.name,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      role: c.role ?? undefined,
      telegram: c.telegram ?? undefined,
      whatsapp: c.whatsapp ?? undefined,
      preferredContact: c.preferredContact ?? undefined,
      geo: c.geo ?? undefined,
    };
  }

  function toCredentialDialogShape(c: Credential) {
    return {
      id: c.credentialId,
      label: c.label,
      loginUrl: c.loginUrl ?? undefined,
      username: c.username,
      email: c.email ?? undefined,
      softwareType: c.softwareType ?? undefined,
      notes: c.notes ?? undefined,
    };
  }

  // ---------- Attachments ----------
  interface Attachment {
    name: string;
    path: string;
    size: number;
    mimeType: string | null;
    createdAt: string;
  }

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    setAttachmentsLoading(true);
    try {
      const res = await fetch(`/api/partners/${partnerId}/attachments`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      const data = await res.json();
      setAttachments(Array.isArray(data) ? data : []);
    } catch {
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  async function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/partners/${partnerId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed");
      }
      toast.success("File uploaded.");
      fetchAttachments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownloadAttachment(filePath: string) {
    try {
      const res = await fetch(
        `/api/partners/${partnerId}/attachments?file=${encodeURIComponent(filePath)}`
      );
      if (!res.ok) throw new Error("Download failed");
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      toast.error(message);
    }
  }

  async function handleDeleteAttachment(filePath: string, fileName: string) {
    try {
      const res = await fetch(`/api/partners/${partnerId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Deleted ${fileName}`);
      fetchAttachments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-12 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Partner not found.</p>
        <Link
          href="/dashboard/partners"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Partners
        </Link>
      </div>
    );
  }

  const sopComplete =
    partner.hasContract && partner.hasLicense && partner.hasBanking;

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/dashboard/partners"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Partners
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{partner.name}</h1>
        <StatusBadge status={partner.status} variant="partner" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Company Info</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        {/* ---- Company Info Tab ---- */}
        <TabsContent value="info">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Company Information</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPartnerDialogOpen(true)}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Website Domain
                  </dt>
                  <dd className="text-sm">
                    {partner.websiteDomain ?? "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Direct Partner
                  </dt>
                  <dd className="text-sm">{partner.isDirect ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Status
                  </dt>
                  <dd className="text-sm">{partner.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Owner
                  </dt>
                  <dd className="text-sm">{partner.owner?.name ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Account Manager
                  </dt>
                  <dd className="text-sm">{partner.accountManager?.name ?? "Not assigned"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Last Invoiced
                  </dt>
                  <dd className="text-sm">
                    {partner.lastInvoicedAt
                      ? new Date(partner.lastInvoicedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Not set"}
                  </dd>
                </div>
              </dl>

              {/* SOP / Compliance section for direct partners */}
              {partner.isDirect && (
                <div className="mt-6 rounded-md border p-4">
                  <h3 className="mb-3 text-sm font-semibold">
                    SOP / Compliance
                    {sopComplete ? (
                      <span className="ml-2 text-green-600">(Complete)</span>
                    ) : (
                      <span className="ml-2 text-yellow-600">(Incomplete)</span>
                    )}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {([
                      { key: "contract", label: "Contract", has: partner.hasContract },
                      { key: "license", label: "License", has: partner.hasLicense },
                      { key: "banking", label: "Banking", has: partner.hasBanking },
                    ]).map((item) => (
                      <li key={item.key} className="flex items-center gap-2">
                        {item.has ? (
                          <Check className="size-4 text-green-600" />
                        ) : (
                          <X className="size-4 text-red-500" />
                        )}
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  {partner.sopNotes && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {partner.sopNotes}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Brands Tab ---- */}
        <TabsContent value="brands">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Brands</h2>
              <Button
                size="sm"
                onClick={() => {
                  setEditingBrand(undefined);
                  setBrandDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Add Brand
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Licenses</TableHead>
                    <TableHead>Target Geos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partner.brands.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No brands yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    partner.brands.map((brand) => (
                      <TableRow key={brand.brandId}>
                        <TableCell className="font-medium">
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => setViewingBrand(brand)}
                          >
                            {brand.name}
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {brand.brandDomain ?? "-"}
                        </TableCell>
                        <TableCell>
                          {(brand.licenses?.length ?? 0) === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(brand.licenses ?? []).map((code) => (
                                <Badge
                                  key={code}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  <GeoFlag geo={code} size="sm" showLabel={false} />
                                  {COUNTRY_MAP[code] ?? LICENSE_MAP[code] ?? code}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {(brand.targetGeos?.length ?? 0) === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(brand.targetGeos ?? []).map((geo) => (
                                <Badge
                                  key={geo}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {geo}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={brand.status} variant="brand" />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingBrand(brand);
                                  setBrandDialogOpen(true);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  handleArchiveBrand(brand.brandId)
                                }
                              >
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ---- Contacts Tab ---- */}
        <TabsContent value="contacts">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contacts</h2>
              <Button
                size="sm"
                onClick={() => {
                  setEditingContact(undefined);
                  setContactDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Add Contact
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Preferred</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Geo</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partner.contacts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground"
                      >
                        No contacts yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    partner.contacts.map((contact) => (
                      <TableRow key={contact.contactId}>
                        <TableCell className="font-medium">
                          {contact.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.email ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.phone ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.whatsapp ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.preferredContact ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.role ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.geo ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setEditingContact(contact);
                              setContactDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ---- Credentials Tab ---- */}
        <TabsContent value="credentials">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Credentials</h2>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCredential(undefined);
                  setCredentialDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Add Credential
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Software Type</TableHead>
                    <TableHead>Login URL</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partner.credentials.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No credentials yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    partner.credentials.map((cred) => (
                      <TableRow key={cred.credentialId}>
                        <TableCell className="font-medium">
                          {cred.label}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cred.softwareType ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cred.loginUrl ? (
                            <a
                              href={cred.loginUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {cred.loginUrl}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {cred.username}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cred.email ?? "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-sm">
                              {revealedPasswords[cred.credentialId]
                                ? revealedPasswords[cred.credentialId]
                                : "********"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                handleRevealPassword(cred.credentialId)
                              }
                            >
                              {revealedPasswords[cred.credentialId] ? (
                                <EyeOff className="size-3.5" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                handleCopyPassword(cred.credentialId)
                              }
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingCredential(cred);
                                  setCredentialDialogOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  handleDeleteCredential(cred.credentialId)
                                }
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ---- Deals Tab ---- */}
        <TabsContent value="deals">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Deals</h2>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Geo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partner.deals.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No deals yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    partner.deals.map((deal) => (
                      <TableRow key={deal.dealId}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/deals/${deal.dealId}`}
                            className="text-primary hover:underline"
                          >
                            {deal.brand.name}
                          </Link>
                        </TableCell>
                        <TableCell>{deal.asset.name}</TableCell>
                        <TableCell>{deal.position.name}</TableCell>
                        <TableCell><GeoFlag geo={deal.geo} /></TableCell>
                        <TableCell>
                          <StatusBadge status={deal.status} variant="deal" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(deal.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {deal.endDate
                            ? new Date(deal.endDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ---- Attachments Tab ---- */}
        <TabsContent value="attachments">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Attachments</h2>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleUploadAttachment}
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 size-4" />
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            </div>

            {attachmentsLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : attachments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <Paperclip className="mx-auto mb-2 size-8 opacity-50" />
                <p>No attachments yet.</p>
                <p className="text-xs mt-1">Upload PDF, images, documents, or spreadsheets (max 10MB)</p>
              </div>
            ) : (
              <div className="rounded-lg border divide-y">
                {attachments.map((att) => (
                  <div
                    key={att.path}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                  >
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <button
                      type="button"
                      className="flex-1 text-left text-sm font-medium text-primary hover:underline truncate"
                      onClick={() => handleDownloadAttachment(att.path)}
                    >
                      {att.name}
                    </button>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatFileSize(att.size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      title="Delete"
                      onClick={() => handleDeleteAttachment(att.path, att.name)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PartnerDialog
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        partner={partner ? toPartnerDialogShape(partner) : undefined}
        onSuccess={fetchPartner}
      />

      <BrandDetailDialog
        open={!!viewingBrand}
        onOpenChange={(open) => {
          if (!open) setViewingBrand(undefined);
        }}
        brand={viewingBrand ?? null}
      />

      <BrandDialog
        open={brandDialogOpen}
        onOpenChange={setBrandDialogOpen}
        partnerId={partnerId}
        brand={editingBrand ? toBrandDialogShape(editingBrand) : undefined}
        onSuccess={fetchPartner}
      />

      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        partnerId={partnerId}
        contact={
          editingContact ? toContactDialogShape(editingContact) : undefined
        }
        onSuccess={fetchPartner}
      />

      <CredentialDialog
        open={credentialDialogOpen}
        onOpenChange={setCredentialDialogOpen}
        partnerId={partnerId}
        credential={
          editingCredential
            ? toCredentialDialogShape(editingCredential)
            : undefined
        }
        onSuccess={fetchPartner}
      />
    </div>
  );
}
