import type { Metadata } from "next";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { Header } from "@/components/Header";
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
      <body className="min-h-screen bg-[#010102] text-[#f7f8f8] antialiased">
        <WorkspaceProvider>
          <Header />
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
