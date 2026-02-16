"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IntakeLinkDialog } from "@/components/dashboard/IntakeLinkDialog";
import { IntakeConvertDialog } from "@/components/dashboard/IntakeConvertDialog";

interface IntakeBrand {
  brandName: string;
  brandDomain?: string;
  targetGeos?: string[];
  licenses?: string[];
}

interface Submission {
  submissionId: string;
  companyName: string;
  websiteDomain: string | null;
  brands: IntakeBrand[];
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactTelegram: string | null;
  contactWhatsapp: string | null;
  preferredContact: string | null;
  notes: string | null;
  status: string;
  submittedAt: string;
  intakeLink: {
    createdBy: { name: string };
  };
}

interface IntakeLink {
  intakeLinkId: string;
  expiresAt: string;
  usedAt: string | null;
  note: string | null;
  createdAt: string;
  createdBy: { name: string };
  _count: { submissions: number };
}

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Converted: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

function getLinkStatus(link: IntakeLink) {
  if (link.usedAt) return { label: "Used", className: "bg-green-100 text-green-800" };
  if (new Date(link.expiresAt) < new Date()) return { label: "Expired", className: "bg-red-100 text-red-800" };
  return { label: "Active", className: "bg-blue-100 text-blue-800" };
}

export default function IntakePage() {
  const [tab, setTab] = useState("Pending");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [links, setLinks] = useState<IntakeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/intake-submissions?status=${tab}`);
      if (res.ok) {
        setSubmissions(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/intake-links");
      if (res.ok) {
        setLinks(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "Links") {
      fetchLinks();
    } else {
      fetchSubmissions();
    }
  }, [tab, fetchSubmissions, fetchLinks]);

  function handleRowClick(submission: Submission) {
    setSelectedSubmission(submission);
    setConvertDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sign Up Links</h1>
        <Button onClick={() => setLinkDialogOpen(true)}>Generate Link</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="Converted">Converted</TabsTrigger>
          <TabsTrigger value="Rejected">Rejected</TabsTrigger>
          <TabsTrigger value="Links">Links</TabsTrigger>
        </TabsList>

        {/* Submission tabs */}
        {tab !== "Links" && (
          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : submissions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No {tab.toLowerCase()} submissions.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Brands</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow
                        key={sub.submissionId}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(sub)}
                      >
                        <TableCell className="font-medium">
                          {sub.companyName}
                        </TableCell>
                        <TableCell>
                        {(sub.brands || []).map((b) => b.brandName).join(", ") || "—"}
                      </TableCell>
                        <TableCell>
                          <div>{sub.contactName}</div>
                          <div className="text-xs text-muted-foreground">
                            {sub.contactEmail}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.intakeLink.createdBy.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={statusColors[sub.status] ?? ""}
                          >
                            {sub.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* Links tab */}
        <TabsContent value="Links" className="mt-4">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : links.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sign up links generated yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const status = getLinkStatus(link);
                    return (
                      <TableRow key={link.intakeLinkId}>
                        <TableCell className="font-medium">
                          {link.note || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {link.createdBy.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(link.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(link.expiresAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {link._count.submissions}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <IntakeLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSuccess={() => {
          if (tab === "Links") fetchLinks();
        }}
      />

      <IntakeConvertDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        submission={selectedSubmission}
        onSuccess={fetchSubmissions}
      />
    </div>
  );
}
