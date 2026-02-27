import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { TopNav } from "@/components/layout/TopNav";
import { UserTutorial } from "@/components/ui/UserTutorial";

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
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <UserTutorial />
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden min-h-0">
              <div className="flex-1 max-w-[1400px] mx-auto w-full flex flex-col min-h-0">
                {/* Top Navigation & Profile */}
                <TopNav />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto px-8 pb-8">
                  {children}
                </main>
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
