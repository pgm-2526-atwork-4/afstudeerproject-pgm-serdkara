import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DocumentCacheProvider } from "@/contexts/DocumentCacheContext";
import { TopNav } from "@/components/layout/TopNav";
import { UserTutorial } from "@/components/ui/UserTutorial";
import { ApiWakeupGuard } from "@/components/ui/ApiWakeupGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLM Policy Validator",
  description: "Validate LLM Outputs against structured policies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col md:flex-row`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DocumentCacheProvider>
              <UserTutorial />
              <ApiWakeupGuard />
              <Sidebar />
              <div className="flex-1 min-w-0 flex flex-col h-screen min-h-0">
                <div className="max-w-[1400px] mx-auto w-full shrink-0">
                  {/* Top Navigation & Profile */}
                  <TopNav />
                </div>

                {/* Scrollable Area — scrollbar stays at viewport edge */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-8">
                  <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8">
                    {children}
                  </div>
                </main>
              </div>
            </DocumentCacheProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
