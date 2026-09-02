"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg outline-none select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variants = {
      primary:
        "bg-[#5e6ad2] hover:bg-[#828fff] text-white shadow-sm hover:shadow-[#5e6ad2]/20 active:bg-[#5e69d1] focus-visible:ring-2 focus-visible:ring-[#5e69d1]/50",
      secondary:
        "bg-[#0f1011] hover:bg-[#141516] text-[#f7f8f8] border border-[#23252a] hover:border-[#34343a] active:bg-[#18191a] focus-visible:ring-2 focus-visible:ring-[#5e69d1]/30",
      tertiary:
        "bg-transparent hover:bg-[#0f1011] text-[#8a8f98] hover:text-[#f7f8f8] border border-transparent hover:border-[#23252a]",
      danger:
        "bg-[#191111] hover:bg-[#241414] text-[#f87171] border border-[#3b1d1d] hover:border-[#522323] focus-visible:ring-2 focus-visible:ring-red-500/30",
      success:
        "bg-[#0d1f13] hover:bg-[#122b1a] text-[#4ade80] border border-[#1b3d26] hover:border-[#265736] focus-visible:ring-2 focus-visible:ring-emerald-500/30",
      ghost:
        "bg-transparent hover:bg-[#141516] text-[#d0d6e0] hover:text-white",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 h-7 gap-1.5",
      md: "text-xs px-3.5 py-2 h-9 gap-2",
      lg: "text-sm px-4 py-2.5 h-11 gap-2.5",
      icon: "h-8 w-8 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
