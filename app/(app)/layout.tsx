import * as React from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppShell } from '@/components/layout/app-shell';
import { WsProvider } from '@/components/chat/ws-provider';
import { ChatProvider } from '@/components/chat/chat-provider';
import { CallProvider } from '@/components/call/call-provider';
import { SearchDialog } from '@/components/chat/search-dialog';
import { KeyboardShortcutsDialog } from '@/components/layout/keyboard-shortcuts-dialog';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <WsProvider>
        <CallProvider>
          <ChatProvider>
            <AppShell>{children}</AppShell>
            <SearchDialog />
            <KeyboardShortcutsDialog />
          </ChatProvider>
        </CallProvider>
      </WsProvider>
    </AuthGuard>
  );
}
