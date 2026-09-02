"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "tier-1"
    | "tier-2"
    | "tier-3"
    | "success"
    | "warning"
    | "danger"
    | "neutral"
    | "primary";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight select-none";

  const variants = {
    "tier-1": "bg-[#0f1f14] text-[#4ade80] border border-[#1b3d26]",
    "tier-2": "bg-[#1f1a0e] text-[#facc15] border border-[#3d3319]",
    "tier-3": "bg-[#0e1626] text-[#60a5fa] border border-[#1c2e4f]",
    success: "bg-[#0f1f14] text-[#4ade80] border border-[#1b3d26]",
    warning: "bg-[#1f1a0e] text-[#facc15] border border-[#3d3319]",
    danger: "bg-[#241414] text-[#f87171] border border-[#451e1e]",
    neutral: "bg-[#141516] text-[#8a8f98] border border-[#23252a]",
    primary: "bg-[#14172e] text-[#828fff] border border-[#282d5c]",
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
