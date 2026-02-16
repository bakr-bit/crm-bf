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
import { toast } from "sonner";

interface Page {
  id: string;
  name: string;
  path?: string;
  description?: string;
}

interface PageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  page?: Page;
  onSuccess: () => void;
}

export function PageDialog({
  open,
  onOpenChange,
  assetId,
  page,
  onSuccess,
}: PageDialogProps) {
  const isEdit = Boolean(page);

  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (page) {
      setName(page.name ?? "");
      setPath(page.path ?? "");
      setDescription(page.description ?? "");
    } else {
      setName("");
      setPath("");
      setDescription("");
    }
  }, [page, open]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Page name is required.");
      return;
    }

    setLoading(true);

    const body = {
      name: name.trim(),
      path: path.trim() || undefined,
      description: description.trim() || undefined,
    };

    try {
      const url = isEdit
        ? `/api/assets/${assetId}/pages/${page!.id}`
        : `/api/assets/${assetId}/pages`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save page.");
      }

      toast.success(isEdit ? "Page updated." : "Page created.");
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
            {isEdit ? "Edit Page" : "Create Page"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="page-name">Name *</Label>
            <Input
              id="page-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Page name"
            />
          </div>

          {/* Path */}
          <div className="grid gap-2">
            <Label htmlFor="page-path">Path</Label>
            <Input
              id="page-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/best-sites"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="page-description">Description</Label>
            <Textarea
              id="page-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Page description..."
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
