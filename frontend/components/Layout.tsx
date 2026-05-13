import type React from "react";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";


export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:ml-64">
        <Header />
        <main className="mx-auto w-full max-w-container-max flex-1 p-margin-mobile md:p-margin-desktop">{children}</main>
        <Footer />
      </div>
    </div>
  );
}



