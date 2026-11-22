import * as React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-muted/30">
      <div className="w-full max-w-md flex flex-col items-center mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow mb-2">
          N
        </div>
        <h1 className="text-xl font-bold tracking-tight">Nebron</h1>
      </div>
      {children}
    </div>
  );
}

