"use client";

import { useState } from "react";
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
import { Copy, Check } from "lucide-react";

interface IntakeLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IntakeLinkDialog({
  open,
  onOpenChange,
  onSuccess,
}: IntakeLinkDialogProps) {
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [maxUses, setMaxUses] = useState("1");
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generatedMaxUses, setGeneratedMaxUses] = useState(1);
  const [copied, setCopied] = useState(false);

  function handleClose(open: boolean) {
    if (!open) {
      setNote("");
      setExpiresInDays("7");
      setMaxUses("1");
      setGeneratedUrl("");
      setGeneratedMaxUses(1);
      setCopied(false);
    }
    onOpenChange(open);
  }

  async function handleGenerate() {
    setLoading(true);

    const parsedMaxUses = parseInt(maxUses) || 1;

    try {
      const res = await fetch("/api/intake-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note.trim() || undefined,
          expiresInDays: parseInt(expiresInDays),
          maxUses: parsedMaxUses,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate link");
      }

      const data = await res.json();
      setGeneratedUrl(data.url);
      setGeneratedMaxUses(parsedMaxUses);
      toast.success("Sign up link generated.");
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Sign Up Link</DialogTitle>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="intake-note">Note (optional)</Label>
              <Input
                id="intake-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Sent to John at Acme"
              />
            </div>

            <div className="grid gap-2">
              <Label>Expires In</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="intake-max-uses">Max Uses</Label>
              <Input
                id="intake-max-uses"
                type="number"
                min={1}
                max={1000}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Number of times this link can be used to submit a form.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? "Generating..." : "Generate Link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Share this link with the partner. It can be used{" "}
              {generatedMaxUses === 1
                ? "once"
                : `up to ${generatedMaxUses} times`}.
            </p>
            <div className="flex gap-2">
              <Input value={generatedUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
