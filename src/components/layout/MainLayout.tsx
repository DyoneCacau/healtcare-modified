import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { CashClosingAlert } from "@/components/financial/CashClosingAlert";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CashClosingAlert />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
