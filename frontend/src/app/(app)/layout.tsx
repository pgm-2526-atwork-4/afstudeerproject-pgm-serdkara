import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { UserTutorial } from "@/components/ui/UserTutorial";
import { ApiWakeupGuard } from "@/components/ui/ApiWakeupGuard";
import { DocumentCacheProvider } from "@/contexts/DocumentCacheContext";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DocumentCacheProvider>
      <UserTutorial />
      <ApiWakeupGuard />
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col h-screen min-h-0">
          <div className="max-w-[1400px] mx-auto w-full shrink-0">
            <TopNav />
          </div>
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-8">
            <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8">{children}</div>
          </main>
        </div>
      </div>
    </DocumentCacheProvider>
  );
}
