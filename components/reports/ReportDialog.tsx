'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { adminApi, type CreateReportRequest } from '@/lib/admin-api';
import { useToast } from '@/components/ui/use-toast';
import { Flag, Loader2 } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'user' | 'post' | 'comment' | 'message';
  targetId: string;
  targetTitle?: string;
}

const REASONS: Array<{ value: CreateReportRequest['reason']; label: string; desc: string }> = [
  { value: 'spam', label: 'Spam', desc: 'Commercial advertisements, repetitive or misleading content' },
  { value: 'harassment', label: 'Harassment', desc: 'Bullying, targeted insults, or threatening behavior' },
  { value: 'hate', label: 'Hate speech', desc: 'Attacks based on race, religion, gender, or orientation' },
  { value: 'sexual', label: 'Sexual content', desc: 'Nudity, sexually explicit material, or solicitation' },
  { value: 'violence', label: 'Violence', desc: 'Graphic violence, gore, or incitement of harm' },
  { value: 'self_harm', label: 'Self-harm', desc: 'Encouraging suicide, self-injury, or eating disorders' },
  { value: 'impersonation', label: 'Impersonation', desc: 'Pretending to be another person or entity' },
  { value: 'other', label: 'Other', desc: 'Any other violation of community guidelines' },
];

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetTitle,
}: ReportDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = React.useState<CreateReportRequest['reason']>('spam');
  const [details, setDetails] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    setIsSubmitting(true);
    try {
      await adminApi.createReport({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });

      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep Nebron safe and respectful.',
      });
      onOpenChange(false);
      setDetails('');
      setReason('spam');
    } catch (err: any) {
      const errCode = err?.data?.error?.code || err?.code;
      const message = err?.message || 'Failed to submit report';

      if (errCode === 'cannot_report_self') {
        toast({
          variant: 'destructive',
          title: 'Invalid report',
          description: 'You cannot report your own account or content.',
        });
      } else if (errCode === 'already_reported') {
        toast({
          variant: 'destructive',
          title: 'Already reported',
          description: 'You have already reported this content in the last 24 hours.',
        });
      } else if (errCode === 'rate_limit_exceeded') {
        toast({
          variant: 'destructive',
          title: 'Daily limit reached',
          description: 'You have reached the maximum number of reports allowed today.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Report failed',
          description: message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Flag className="h-5 w-5" />
            Report {targetType}
          </DialogTitle>
          <DialogDescription>
            {targetTitle ? (
              <span>Reporting: &ldquo;{targetTitle}&rdquo;</span>
            ) : (
              <span>Select the reason that best describes why you are reporting this {targetType}.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Reason for report</Label>
            <div className="space-y-2 rounded-md border p-3 bg-muted/20">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-start gap-3 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="mt-1 h-4 w-4 text-primary accent-primary"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-foreground">{r.label}</span>
                    <p className="text-muted-foreground">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reportDetails" className="text-xs font-medium">
              Additional details (optional)
            </Label>
            <Textarea
              id="reportDetails"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context for moderators (max 1000 characters)..."
              maxLength={1000}
              rows={3}
              className="text-xs resize-none"
            />
            <div className="text-right text-[10px] text-muted-foreground">
              {details.length}/1000
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
