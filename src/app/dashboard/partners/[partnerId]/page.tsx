"use client";

import { useState, useEffect, useCallback } from "react";
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
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { LICENSE_MAP } from "@/lib/licenses";

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
  email: string;
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
  contractFileUrl: string | null;
  licenseFileUrl: string | null;
  bankingFileUrl: string | null;
  sopNotes: string | null;
  ownerUserId: string;
  owner: { id: string; name: string } | null;
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
      contractFileUrl: p.contractFileUrl,
      licenseFileUrl: p.licenseFileUrl,
      bankingFileUrl: p.bankingFileUrl,
      sopNotes: p.sopNotes ?? undefined,
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
      email: c.email,
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
      softwareType: c.softwareType ?? undefined,
      notes: c.notes ?? undefined,
    };
  }

  // SOP file download handler
  async function handleSopDownload(docType: string) {
    try {
      const res = await fetch(
        `/api/partners/${partnerId}/sop-documents?docType=${docType}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Download failed");
      }
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      toast.error(message);
    }
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
                      { key: "contract" as const, label: "Contract", has: partner.hasContract, fileUrl: partner.contractFileUrl },
                      { key: "license" as const, label: "License", has: partner.hasLicense, fileUrl: partner.licenseFileUrl },
                      { key: "banking" as const, label: "Banking", has: partner.hasBanking, fileUrl: partner.bankingFileUrl },
                    ]).map((item) => (
                      <li key={item.key} className="flex items-center gap-2">
                        {item.has ? (
                          <Check className="size-4 text-green-600" />
                        ) : (
                          <X className="size-4 text-red-500" />
                        )}
                        <span className="min-w-[70px]">{item.label}</span>
                        {item.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 ml-2"
                            title={`Download ${item.label}`}
                            onClick={() => handleSopDownload(item.key)}
                          >
                            <Download className="size-3.5" />
                          </Button>
                        )}
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
                          {brand.name}
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
                                  {LICENSE_MAP[code] ?? code}
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
                          {contact.email}
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
                    <TableHead>Password</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partner.credentials.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
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
      </Tabs>

      {/* Dialogs */}
      <PartnerDialog
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        partner={partner ? toPartnerDialogShape(partner) : undefined}
        onSuccess={fetchPartner}
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
