import type { Metadata } from "next";
import { GlobalSidebar } from "@/components/GlobalSidebar";
import { ToastProvider } from "@/context/ToastContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvenAI | Hardware Vendor & Inventory Management",
  description: "Autonomous Hardware Vendor, BOM & Inventory Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#010102] text-[#f7f8f8] antialiased flex flex-col md:flex-row">
        <ToastProvider>
          <GlobalSidebar />
          <div className="flex-1 min-w-0 overflow-y-auto min-h-screen">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
