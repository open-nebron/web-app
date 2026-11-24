'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { chatApi } from '@/lib/chat-api';
import { toast } from '@/components/ui/use-toast';
import { Users, Loader2, AlertCircle } from 'lucide-react';

interface JoinViaLinkProps {
  code: string;
}

export function JoinViaLink({ code }: JoinViaLinkProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function join() {
      try {
        const conversation = await chatApi.joinConversation(code);
        if (!cancelled) {
          setStatus('success');
          toast({
            title: 'Joined group',
            description: `You have joined "${conversation.name || 'Group'}"!`,
          });
          router.push(`/chat/${conversation.id}`);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus('error');
          const error = err as { message?: string; data?: { error?: { message?: string; code?: string } } };
          const msg =
            error?.data?.error?.message ||
            error?.message ||
            'Failed to join group with this invite link.';
          setErrorMessage(msg);
        }
      }
    }

    join();

    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
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
              ? 'Joining group...'
              : status === 'error'
              ? 'Could not join group'
              : 'Joined successfully!'}
          </CardTitle>
          <CardDescription>
            {status === 'joining'
              ? 'Please wait while we verify your invite link...'
              : status === 'error'
              ? errorMessage
              : 'Redirecting to your conversation...'}
          </CardDescription>
        </CardHeader>

        {status === 'error' && (
          <CardContent className="pt-2">
            <Button
              className="w-full text-xs"
              onClick={() => router.push('/chat')}
            >
              Return to Chat
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
