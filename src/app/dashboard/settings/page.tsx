"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ---------- types ----------

interface Session {
  user?: {
    email?: string;
    name?: string;
  };
}

// ---------- component ----------

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ---------- fetch session ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data: Session = await res.json();
          setSession(data);
        }
      } catch {
        console.error("Failed to fetch session");
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);

  // ---------- handle password change (stub) ----------
  function handlePasswordChange() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    toast.info("Password change not yet implemented.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Information</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSession ? (
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">
                  Email:
                </span>
                <span>{session?.user?.email ?? "Unknown"}</span>
              </div>
              {session?.user?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    Name:
                  </span>
                  <span>{session.user.name}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="old-password">Current Password</Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button onClick={handlePasswordChange}>Update Password</Button>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">
                App Version:
              </span>
              <span>0.1.0</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">
                Environment:
              </span>
              <span>{process.env.NODE_ENV ?? "development"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">
                Framework:
              </span>
              <span>Next.js</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
