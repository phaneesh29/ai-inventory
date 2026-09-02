"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[#23252a] bg-[#0f1011] px-3 py-1.5 text-xs text-[#f7f8f8] placeholder:text-[#8a8f98] focus:border-[#5e6ad2] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
