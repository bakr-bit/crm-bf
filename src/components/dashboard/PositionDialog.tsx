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

interface Position {
  id: string;
  name: string;
  details?: string;
}

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  position?: Position;
  onSuccess: () => void;
}

export function PositionDialog({
  open,
  onOpenChange,
  assetId,
  position,
  onSuccess,
}: PositionDialogProps) {
  const isEdit = Boolean(position);

  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (position) {
      setName(position.name ?? "");
      setDetails(position.details ?? "");
    } else {
      setName("");
      setDetails("");
    }
  }, [position, open]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Position name is required.");
      return;
    }

    setLoading(true);

    const body = {
      name: name.trim(),
      details: details.trim() || undefined,
    };

    try {
      const url = isEdit
        ? `/api/assets/${assetId}/positions/${position!.id}`
        : `/api/assets/${assetId}/positions`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save position.");
      }

      toast.success(isEdit ? "Position updated." : "Position created.");
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
            {isEdit ? "Edit Position" : "Create Position"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="position-name">Name *</Label>
            <Input
              id="position-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Position name"
            />
          </div>

          {/* Details */}
          <div className="grid gap-2">
            <Label htmlFor="position-details">Details</Label>
            <Textarea
              id="position-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Position details..."
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
