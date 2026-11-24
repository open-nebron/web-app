import * as React from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { WsProvider } from '@/components/chat/ws-provider';
import { ChatProvider } from '@/components/chat/chat-provider';
import { CallProvider } from '@/components/call/call-provider';
import { SearchDialog } from '@/components/chat/search-dialog';

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
            <div className="flex min-h-screen bg-background">
              <div className="hidden md:block">
                <AppSidebar />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
            <SearchDialog />
          </ChatProvider>
        </CallProvider>
      </WsProvider>
    </AuthGuard>
  );
}
