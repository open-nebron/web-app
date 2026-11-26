'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSpace } from '@/hooks/useSpaces';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Sparkles } from 'lucide-react';

export default function CreateSpacePage() {
  const router = useRouter();
  const createMutation = useCreateSpace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = name.trim();
    if (cleaned.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Invalid space name',
        description: 'Name must be at least 2 characters.',
      });
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: cleaned,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast({
        title: 'Space created',
        description: `${created.space.name} is ready.`,
      });
      const firstText = created.channels.find((c) => c.kind === 'text') || created.channels[0];
      router.push(
        firstText
          ? `/spaces/${created.space.id}/channels/${firstText.id}`
          : `/spaces/${created.space.id}`
      );
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not create space',
        description: err instanceof Error ? err.message : 'Creation failed',
      });
    }
  };

  return (
    <div>
      <AppHeader title="Create Space" />
      <div className="max-w-lg mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <CardTitle>Create a New Space</CardTitle>
            <CardDescription>
              Start a server with text and voice channels, customizable roles, and invite links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-space-name">Space Name</Label>
                <Input
                  id="wizard-space-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nebron Creators"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-space-desc">Description (optional)</Label>
                <Textarea
                  id="wizard-space-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share updates, hang out in voice, collaborate..."
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Space
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
