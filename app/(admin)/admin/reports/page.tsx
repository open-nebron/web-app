'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  ChevronRight,
  User,
  FileText,
  MessageSquare,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { adminApi, type AdminReportItem } from '@/lib/admin-api';
import { normalizeStorageUrl } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

export default function AdminReportsQueuePage() {
  const [reports, setReports] = React.useState<AdminReportItem[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('pending');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedReport, setSelectedReport] = React.useState<AdminReportItem | null>(null);

  const fetchReports = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getReports({
        status: statusFilter,
        targetType: typeFilter,
        limit: 50,
      });
      setReports(data.reports);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-3.5 w-3.5" />;
      case 'post':
        return <FileText className="h-3.5 w-3.5" />;
      case 'comment':
        return <MessageCircle className="h-3.5 w-3.5" />;
      case 'message':
        return <MessageSquare className="h-3.5 w-3.5" />;
      default:
        return <ShieldAlert className="h-3.5 w-3.5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </Badge>
        );
      case 'dismissed':
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
            <XCircle className="h-3 w-3" />
            Dismissed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moderation Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review reported content and user infractions across Nebron.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchReports()} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Type Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'dismissed', label: 'Dismissed' },
            { id: 'all', label: 'All Reports' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                statusFilter === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs rounded-md border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Targets</option>
            <option value="user">Users</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
            <option value="message">Messages</option>
          </select>
        </div>
      </div>

      {/* Reports Table & Drawer Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table List */}
        <div className="flex-1 bg-card rounded-lg border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-destructive" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="font-medium text-foreground">No reports matching filter</p>
              <p className="text-xs mt-1">There are no reports for the selected status and target type.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Target Owner</th>
                    <th className="px-4 py-3">Reporter</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reported</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`hover:bg-muted/40 cursor-pointer transition-colors ${
                        selectedReport?.id === report.id ? 'bg-muted/60' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getTargetIcon(report.targetType)}
                          <span className="capitalize text-xs font-medium">{report.targetType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={normalizeStorageUrl(report.targetOwner.avatarUrl || '')} />
                            <AvatarFallback className="text-[10px]">
                              {(report.targetOwner.name || report.targetOwner.username).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">@{report.targetOwner.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">@{report.reporter.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                          {report.reason}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                          <Link href={`/admin/reports/${report.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Review
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Report Quick Drawer */}
        {selectedReport && (
          <div className="w-full lg:w-96 bg-card border rounded-lg p-5 shadow-sm space-y-4 shrink-0">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-sm">Report Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={() => setSelectedReport(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
              </div>

              <div>
                <span className="text-muted-foreground">Reason & Details:</span>
                <p className="font-medium uppercase text-[11px] mt-0.5">{selectedReport.reason}</p>
                {selectedReport.details ? (
                  <p className="mt-1 p-2 bg-muted rounded italic text-foreground">
                    &ldquo;{selectedReport.details}&rdquo;
                  </p>
                ) : (
                  <p className="text-muted-foreground italic mt-0.5">No additional details provided</p>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Target ({selectedReport.targetType}):</span>
                <div className="mt-1 p-2 bg-muted/40 rounded border text-foreground space-y-1">
                  {selectedReport.target ? (
                    <div>
                      {selectedReport.target.body && (
                        <p className="font-sans line-clamp-3">&ldquo;{selectedReport.target.body}&rdquo;</p>
                      )}
                      {selectedReport.target.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={normalizeStorageUrl(selectedReport.target.imageUrl)}
                          alt="Report target"
                          className="mt-2 h-20 w-auto rounded object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Target content no longer accessible or deleted.</p>
                  )}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Target Owner:</span>
                <p className="font-medium mt-0.5">@{selectedReport.targetOwner.username}</p>
              </div>

              <div className="pt-2">
                <Button asChild variant="destructive" size="sm" className="w-full gap-1 text-xs">
                  <Link href={`/admin/reports/${selectedReport.id}`}>
                    Open Full Review & Actions
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
