"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SystemHealthModule } from "./SystemHealthModule";
import {
  Cpu,
  Boxes,
  Truck,
  FileSpreadsheet,
  TrendingUp,
  FolderGit2,
  Microchip,
  Layers,
  Sparkles,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export const GlobalSidebar: React.FC = () => {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("invenai_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("invenai_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const navItems = [
    {
      label: "Workspaces",
      href: "/",
      icon: FolderGit2,
      active: pathname === "/" || (pathname.startsWith("/workspace") && !pathname.includes("/bom-studio")),
      badge: "Projects",
    },
    {
      label: "Bill of Materials",
      href: "/boms",
      icon: Layers,
      active: pathname.startsWith("/boms"),
      badge: "BOMs",
    },
    {
      label: "Component Catalog",
      href: "/items",
      icon: Microchip,
      active: pathname.startsWith("/items"),
      badge: "Master",
    },
    {
      label: "Warehouse Stock",
      href: "/inventory",
      icon: Boxes,
      active: pathname.startsWith("/inventory"),
    },
    {
      label: "Supplier Matrix",
      href: "/suppliers",
      icon: Truck,
      active: pathname.startsWith("/suppliers"),
    },
    {
      label: "Purchase Orders",
      href: "/purchase-orders",
      icon: FileSpreadsheet,
      active: pathname.startsWith("/purchase-orders"),
    },
    {
      label: "AI Insights & Forecasts",
      href: "/insights",
      icon: TrendingUp,
      active: pathname.startsWith("/insights"),
    },
    {
      label: "InvenAI",
      href: "/inven-ai",
      icon: Sparkles,
      active: pathname.startsWith("/inven-ai"),
      badge: "AI",
    },
  ];

  return (
    <>
      <aside
        className={`hidden md:flex flex-col border-r border-[#23252a] bg-[#0f1011] sticky top-0 h-screen z-30 transition-all duration-200 ease-in-out ${
          isCollapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <div className="flex h-full flex-col justify-between p-3 bg-[#0f1011]">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              {!isCollapsed ? (
                <Link
                  href="/"
                  className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#14172e] border border-[#282d5c] text-[#828fff]">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold tracking-tight text-[#f7f8f8]">
                        INVEN<span className="text-[#5e6ad2]">.AI</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8a8f98] truncate">
                      Enterprise Platform
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/"
                  className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#14172e] border border-[#282d5c] text-[#828fff] transition-opacity hover:opacity-90"
                  title="INVEN.AI Platform"
                >
                  <Cpu className="h-4 w-4" />
                </Link>
              )}

              <button
                type="button"
                onClick={toggleCollapsed}
                className={`p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516] rounded-md transition-colors ${
                  isCollapsed ? "mx-auto mt-2 block" : ""
                }`}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="h-px bg-[#23252a]" />

            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#62666d]">
                  Navigation
                </div>
              )}

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`group flex items-center rounded-lg text-xs font-medium transition-all ${
                        isCollapsed
                          ? "justify-center p-2.5"
                          : "justify-between px-2.5 py-2"
                      } ${
                        item.active
                          ? "bg-[#5e6ad2] text-white shadow-sm shadow-[#5e6ad2]/25"
                          : "text-[#8a8f98] hover:bg-[#141516] hover:text-[#f7f8f8]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            item.active
                              ? "text-white"
                              : "text-[#8a8f98] group-hover:text-[#f7f8f8]"
                          }`}
                        />
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>

                      {!isCollapsed && item.badge && !item.active && (
                        <span className="rounded bg-[#141516] px-1.5 py-0.5 text-[9px] font-mono text-[#8a8f98] border border-[#23252a]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="pt-3 border-t border-[#23252a]">
            {!isCollapsed ? (
              <SystemHealthModule />
            ) : (
              <div
                className="flex justify-center p-1 cursor-pointer"
                title="System Operational"
              >
                <div className="h-2 w-2 rounded-full bg-[#4ade80] animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex md:hidden items-center justify-between border-b border-[#23252a] bg-[#0f1011] px-4 py-3 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#14172e] border border-[#282d5c] text-[#828fff]">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-[#f7f8f8]">INVEN.AI</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-1.5 text-[#8a8f98] hover:text-white rounded-lg hover:bg-[#141516]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative flex w-72 flex-col border-r border-[#23252a] bg-[#0f1011] p-4 z-50 justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#14172e] border border-[#282d5c] text-[#828fff]">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#f7f8f8]">
                      INVEN<span className="text-[#5e6ad2]">.AI</span>
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 text-[#8a8f98] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                        item.active
                          ? "bg-[#5e6ad2] text-white"
                          : "text-[#8a8f98] hover:bg-[#141516] hover:text-[#f7f8f8]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#23252a]">
              <SystemHealthModule />
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
