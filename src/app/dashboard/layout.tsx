import { BottomNav } from "@/components/dashboard/nav-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      {/* Main content with bottom padding for nav */}
      <main className="pb-[calc(var(--nav-height)+var(--safe-area-bottom)+8px)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
