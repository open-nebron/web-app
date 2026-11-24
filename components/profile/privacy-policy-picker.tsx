'use client';

import * as React from 'react';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Check, Shield } from 'lucide-react';
import type { MessageRequestPolicy } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PolicyOption {
  value: MessageRequestPolicy;
  title: string;
  description: string;
}

const POLICIES: PolicyOption[] = [
  {
    value: 'everyone',
    title: 'Everyone',
    description: 'Anyone can send you direct messages directly to your inbox.',
  },
  {
    value: 'known',
    title: 'Known users',
    description:
      'Only people you already have conversations with can message you directly. Others will go to requests.',
  },
  {
    value: 'nobody',
    title: 'Nobody',
    description:
      'No one can send you new direct messages. Incoming requests will be rejected silently.',
  },
];

export function PrivacyPolicyPicker() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const currentPolicy: MessageRequestPolicy = profile?.messageRequestPolicy || 'known';
  const [selectedPolicy, setSelectedPolicy] = React.useState<MessageRequestPolicy>(currentPolicy);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Sync state when profile loads
  React.useEffect(() => {
    if (profile?.messageRequestPolicy) {
      setSelectedPolicy(profile.messageRequestPolicy);
    }
  }, [profile?.messageRequestPolicy]);

  const handleSelect = (val: MessageRequestPolicy) => {
    setSelectedPolicy(val);
    setHasChanges(val !== currentPolicy);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ messageRequestPolicy: selectedPolicy });
      setHasChanges(false);
      toast({
        title: 'Privacy settings saved',
        description: `Message request policy updated to "${POLICIES.find((p) => p.value === selectedPolicy)?.title}".`,
      });
    } catch {
      // Error handled by useUpdateProfile
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading privacy settings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {POLICIES.map((option) => {
          const isSelected = selectedPolicy === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/60 hover:border-border hover:bg-muted/40'
              )}
            >
              <input
                type="radio"
                name="messageRequestPolicy"
                value={option.value}
                checked={isSelected}
                onChange={() => handleSelect(option.value)}
                className="mt-1 h-4 w-4 text-primary border-muted-foreground/40 focus:ring-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{option.title}</span>
                  {isSelected && (
                    <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.2 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="pt-2 flex items-center justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateProfile.isPending}
          loading={updateProfile.isPending}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
