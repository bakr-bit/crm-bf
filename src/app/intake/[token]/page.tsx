"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GeoMultiSelect } from "@/components/dashboard/GeoMultiSelect";
import { Plus, X } from "lucide-react";

interface BrandEntry {
  brandName: string;
  brandDomain: string;
  targetGeos: string[];
  licenseInfo: string;
}

function emptyBrand(): BrandEntry {
  return { brandName: "", brandDomain: "", targetGeos: [], licenseInfo: "" };
}

type PageState = "loading" | "invalid" | "form" | "submitting" | "success";

export default function IntakePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [error, setError] = useState("");

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [websiteDomain, setWebsiteDomain] = useState("");
  const [brands, setBrands] = useState<BrandEntry[]>([emptyBrand()]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/intake/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setState("form");
        } else {
          setError(data.error || "Invalid link");
          setState("invalid");
        }
      })
      .catch(() => {
        setError("Failed to validate link");
        setState("invalid");
      });
  }, [token]);

  function updateBrand(index: number, field: keyof BrandEntry, value: string | string[]) {
    setBrands((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  }

  function addBrand() {
    setBrands((prev) => [...prev, emptyBrand()]);
  }

  function removeBrand(index: number) {
    if (brands.length <= 1) return;
    setBrands((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("submitting");

    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          websiteDomain: websiteDomain.trim() || undefined,
          brands: brands.map((b) => ({
            brandName: b.brandName.trim(),
            brandDomain: b.brandDomain.trim() || undefined,
            targetGeos: b.targetGeos,
            licenseInfo: b.licenseInfo.trim() || undefined,
          })),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || undefined,
          contactTelegram: contactTelegram.trim() || undefined,
          preferredContact: preferredContact || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Submission failed");
      }

      setState("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setState("form");
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            Validating link...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-xl">Link Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-xl">Thank You!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Your information has been submitted successfully. Our team will
              review it shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Partner Intake Form</CardTitle>
          <CardDescription>
            Please fill in your company, brand, and contact details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Company
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteDomain">Website Domain</Label>
                  <Input
                    id="websiteDomain"
                    value={websiteDomain}
                    onChange={(e) => setWebsiteDomain(e.target.value)}
                    placeholder="acme.com"
                  />
                </div>
              </div>
            </div>

            {/* Brands Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Brands
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBrand}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Brand
                </Button>
              </div>
              <div className="space-y-4">
                {brands.map((brand, i) => (
                  <div
                    key={i}
                    className="relative rounded-md border bg-white p-4"
                  >
                    {brands.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBrand(i)}
                        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Brand Name *</Label>
                        <Input
                          value={brand.brandName}
                          onChange={(e) =>
                            updateBrand(i, "brandName", e.target.value)
                          }
                          placeholder="Brand name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Brand Domain</Label>
                        <Input
                          value={brand.brandDomain}
                          onChange={(e) =>
                            updateBrand(i, "brandDomain", e.target.value)
                          }
                          placeholder="brand.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>License Info</Label>
                        <Input
                          value={brand.licenseInfo}
                          onChange={(e) =>
                            updateBrand(i, "licenseInfo", e.target.value)
                          }
                          placeholder="e.g. MGA, Curacao, UKGC"
                        />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label>Target Geos</Label>
                      <GeoMultiSelect
                        value={brand.targetGeos}
                        onChange={(val) => updateBrand(i, "targetGeos", val)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="john@acme.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactTelegram">Telegram</Label>
                  <Input
                    id="contactTelegram"
                    value={contactTelegram}
                    onChange={(e) => setContactTelegram(e.target.value)}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Contact</Label>
                  <Select value={preferredContact} onValueChange={setPreferredContact}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Telegram">Telegram</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else we should know..."
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={state === "submitting"}
            >
              {state === "submitting" ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
