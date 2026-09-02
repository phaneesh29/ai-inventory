"use client";

import React from "react";
import { Cpu, Activity } from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { Badge } from "./ui/Badge";

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#23252a] bg-[#010102]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#14172e] border border-[#282d5c] text-[#828fff]">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-[#f7f8f8]">
                INVEN<span className="text-[#5e6ad2]">.AI</span>
              </span>
              <Badge variant="primary">Linear v2.0</Badge>
            </div>
          </div>

          <div className="h-4 w-px bg-[#23252a]" />

          <WorkspaceSwitcher />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-[#0f1f14] border border-[#1b3d26] px-2.5 py-1 text-[11px] text-[#4ade80]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="font-medium">Backend & Neon DB Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
