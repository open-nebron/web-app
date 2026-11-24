'use client';

import * as React from 'react';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Sparkles, Loader2, Check } from 'lucide-react';
import type { MessageRequestPolicy } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PolicyOption {
  value: MessageRequestPolicy;
  title: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const POLICIES: PolicyOption[] = [
  {
    value: 'everyone',
    title: 'Everyone',
    description: 'Anyone on nebron can send you direct messages directly to your inbox.',
  },
  {
    value: 'known',
    title: 'Known users (Recommended)',
    description: 'Messages from users you do not follow or have not chatted with will go to message requests.',
    comingSoon: true,
  },
  {
    value: 'nobody',
    title: 'Nobody',
    description: 'No one can initiate new 1:1 conversations with you. Incoming message attempts will be dropped.',
  },
];

export function PolicyRadioGroup() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const currentPolicy: MessageRequestPolicy = profile?.messageRequestPolicy || 'everyone';
  const [selectedPolicy, setSelectedPolicy] = React.useState<MessageRequestPolicy>(currentPolicy);

  React.useEffect(() => {
    if (profile?.messageRequestPolicy) {
      setSelectedPolicy(profile.messageRequestPolicy);
    }
  }, [profile?.messageRequestPolicy]);

  const handleSelect = async (val: MessageRequestPolicy) => {
    if (val === selectedPolicy) return;
    setSelectedPolicy(val);
    try {
      await updateProfile.mutateAsync({ messageRequestPolicy: val });
      const opt = POLICIES.find((p) => p.value === val);
      toast({
        title: 'Privacy policy saved',
        description: `Direct message policy set to "${opt?.title}".`,
      });
    } catch {
      // Revert if API fails
      if (profile?.messageRequestPolicy) {
        setSelectedPolicy(profile.messageRequestPolicy);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Loading privacy settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {POLICIES.map((option) => {
        const isSelected = selectedPolicy === option.value;

        return (
          <div
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              'flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all select-none relative',
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-2xs'
                : 'border-border/60 hover:border-border hover:bg-muted/40'
            )}
          >
            {/* Custom Radio Circle */}
            <div
              className={cn(
                'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40 bg-background'
              )}
            >
              {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">
                  {option.title}
                </span>
                {option.comingSoon && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted font-normal">
                    <Sparkles className="w-3 h-3 text-primary" /> Coming soon (5f)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {option.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
