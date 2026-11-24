'use client';

import React from 'react';

export function UnreadDivider() {
  return (
    <div className="relative my-3 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-destructive/60" />
      </div>
      <span className="relative z-10 bg-destructive/10 text-destructive px-3 py-0.5 text-xs font-medium rounded-full border border-destructive/30">
        New messages
      </span>
    </div>
  );
}
