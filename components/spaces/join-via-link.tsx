'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useJoinInvite } from '@/hooks/useSpaces';
import { toast } from '@/components/ui/use-toast';
import { Users, Loader2, AlertCircle } from 'lucide-react';

interface SpaceJoinViaLinkProps {
  code: string;
}

export function SpaceJoinViaLink({ code }: SpaceJoinViaLinkProps) {
  const router = useRouter();
  const joinMutation = useJoinInvite();
  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [joinedName, setJoinedName] = useState<string>('Space');

  useEffect(() => {
    let cancelled = false;

    async function join() {
      try {
        const res = await joinMutation.mutateAsync(code);
        if (!cancelled) {
          setJoinedName(res.space.name);
          setStatus('success');
          toast({
            title: res.alreadyMember ? 'Already a member' : 'Joined space',
            description: `Welcome to ${res.space.name}!`,
          });
          router.replace(`/spaces/${res.space.id}`);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus('error');
          const errObj = err as { message?: string; data?: { error?: { message?: string } } };
          setErrorMessage(
            errObj?.data?.error?.message ||
              errObj?.message ||
              'This invite link is invalid, expired, or revoked.'
          );
        }
      }
    }

    join();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center shadow-lg">
        <CardHeader className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {status === 'joining' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : status === 'error' ? (
              <AlertCircle className="w-6 h-6 text-destructive" />
            ) : (
              <Users className="w-6 h-6" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'joining'
              ? 'Joining space...'
              : status === 'error'
              ? 'Could not join space'
              : `Joined ${joinedName}!`}
          </CardTitle>
          <CardDescription>
            {status === 'joining'
              ? 'Verifying invite and preparing channels...'
              : status === 'error'
              ? errorMessage
              : 'Redirecting into channels...'}
          </CardDescription>
        </CardHeader>

        {status === 'error' && (
          <CardContent className="pt-2">
            <Button className="w-full text-xs" onClick={() => router.push('/')}>
              Return Home
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
