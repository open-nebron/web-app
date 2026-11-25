'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Ban,
  AlertTriangle,
  FileText,
  MessageCircle,
  MessageSquare,
  User,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { adminApi, type AdminReportItem } from '@/lib/admin-api';
import { normalizeStorageUrl } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function SingleReportReviewPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id as string;
  const { toast } = useToast();

  const [report, setReport] = React.useState<AdminReportItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [resolutionNote, setResolutionNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadReport = React.useCallback(async () => {
    if (!reportId) return;
    setIsLoading(true);
    try {
      const data = await adminApi.getReportById(reportId);
      setReport(data.report);
      if (data.report.resolutionNote) {
        setResolutionNote(data.report.resolutionNote);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading report',
        description: err?.message || 'Report not found',
      });
      router.push('/admin/reports');
    } finally {
      setIsLoading(false);
    }
  }, [reportId, router, toast]);

  React.useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleAction = async (action: string) => {
    if (!report) return;
    setIsSubmitting(true);
    try {
      const data = await adminApi.resolveReport(report.id, action, resolutionNote.trim() || undefined);
      setReport(data.report);
      toast({
        title: 'Action executed',
        description: `Report successfully updated with action: ${action.replace('_', ' ')}.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err?.message || 'Could not resolve report',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !report) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
      </div>
    );
  }

  const deleteActionName =
    report.targetType === 'post'
      ? 'delete_post'
      : report.targetType === 'comment'
      ? 'delete_comment'
      : report.targetType === 'message'
      ? 'delete_message'
      : 'delete_post';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Link href="/admin/reports">
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          {report.status === 'pending' ? (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1">
              <Clock className="h-3 w-3" />
              Pending Review
            </Badge>
          ) : report.status === 'resolved' ? (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Resolved
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <XCircle className="h-3 w-3" />
              Dismissed
            </Badge>
          )}
        </div>
      </div>

      {/* Main Report Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="capitalize">
                  {report.targetType} Report
                </Badge>
                <Badge variant="secondary" className="uppercase font-semibold">
                  {report.reason}
                </Badge>
              </div>
              <CardTitle className="text-xl">Report #{report.id}</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Submitted {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
            </span>
          </div>
          {report.details && (
            <div className="mt-3 p-3 bg-muted/40 border rounded text-sm text-foreground">
              <span className="font-semibold text-xs text-muted-foreground block mb-1">
                Reporter&apos;s statement:
              </span>
              &ldquo;{report.details}&rdquo;
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Target Content Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Reported Content Inline
            </h3>
            <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
              {report.target ? (
                <div>
                  {report.target.body && (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {report.target.body}
                    </p>
                  )}
                  {report.target.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={normalizeStorageUrl(report.target.imageUrl)}
                      alt="Reported media"
                      className="mt-3 max-h-80 rounded-md border object-contain bg-background"
                    />
                  )}
                  {report.target.bio && (
                    <p className="text-sm text-muted-foreground italic">
                      Bio: {report.target.bio}
                    </p>
                  )}
                  {report.target.deleted && (
                    <Badge variant="destructive" className="mt-2 text-xs">
                      Content has been deleted
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Content could not be loaded or was already permanently removed.
                </p>
              )}
            </div>
          </div>

          {/* User Cards: Reporter and Target Owner */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Target Offender Card */}
            <Card className="border shadow-none bg-muted/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-destructive uppercase tracking-wider">
                  Target Account
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={normalizeStorageUrl(report.targetOwner.avatarUrl || '')} />
                  <AvatarFallback>
                    {(report.targetOwner.name || report.targetOwner.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {report.targetOwner.name || report.targetOwner.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{report.targetOwner.username}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                  <Link href={`/admin/users/${report.targetOwner.userId}`}>
                    <User className="h-3.5 w-3.5 mr-1" />
                    Inspect Account Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Reporter Card */}
            <Card className="border shadow-none bg-muted/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Reporter
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={normalizeStorageUrl(report.reporter.avatarUrl || '')} />
                  <AvatarFallback>
                    {(report.reporter.name || report.reporter.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {report.reporter.name || report.reporter.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{report.reporter.username}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                  <Link href={`/admin/users/${report.reporter.userId}`}>
                    <User className="h-3.5 w-3.5 mr-1" />
                    Inspect Reporter History
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Moderator Action Section */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Moderator Actions
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="actionNote" className="text-xs font-medium">
                Resolution Note (stored in audit log):
              </Label>
              <Textarea
                id="actionNote"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Explain the reason for this action or warning note..."
                maxLength={500}
                rows={2}
                disabled={isSubmitting}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleAction('dismiss')}
                className="gap-1.5 text-xs"
              >
                <XCircle className="h-4 w-4 text-muted-foreground" />
                Dismiss Report
              </Button>

              {report.targetType !== 'user' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleAction(deleteActionName)}
                  className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Content
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleAction('warn_user')}
                className="gap-1.5 text-xs text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
              >
                <AlertTriangle className="h-4 w-4" />
                Warn User
              </Button>

              <Button
                variant="destructive"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleAction('ban_user')}
                className="gap-1.5 text-xs font-semibold"
              >
                <Ban className="h-4 w-4" />
                Ban User Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
