"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LICENSES, LICENSE_MAP } from "@/lib/licenses";
import { ChevronsUpDown, X } from "lucide-react";

interface LicenseMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function LicenseMultiSelect({ value, onChange }: LicenseMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = LICENSES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  }

  function remove(code: string) {
    onChange(value.filter((v) => v !== code));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value.length === 0
              ? "Select licenses..."
              : `${value.length} selected`}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2">
            <Input
              placeholder="Search licenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto overscroll-contain px-2 pb-2">
            {filtered.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                No licenses found.
              </p>
            ) : (
              filtered.map((license) => (
                <label
                  key={license.code}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={value.includes(license.code)}
                    onCheckedChange={() => toggle(license.code)}
                  />
                  <span>{license.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {license.code}
                  </span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1">
              {LICENSE_MAP[code] ?? code}
              <button
                type="button"
                onClick={() => remove(code)}
                className="ml-0.5 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
