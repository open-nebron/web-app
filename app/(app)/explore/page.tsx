'use client';

import * as React from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { Compass, Sparkles } from 'lucide-react';

export default function ExplorePage() {
  return (
    <div>
      <AppHeader title="Explore" />
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
          <Compass className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Explore Nebron</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Discover trending posts, popular creators, and discussions across Nebron.
        </p>
        <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Full exploration features releasing in Phase 7d
        </div>
      </div>
    </div>
  );
}
