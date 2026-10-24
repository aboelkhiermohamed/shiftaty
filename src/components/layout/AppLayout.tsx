import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideMenu } from "./SideMenu";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-28 pt-safe relative">
      <main className="max-w-xl mx-auto">
        {children}
      </main>
      <SideMenu />
      <BottomNav />
    </div>
  );
}
