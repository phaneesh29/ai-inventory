"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { id, type, title, description };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, description?: string) => addToast("success", title, description),
    error: (title: string, description?: string) => addToast("error", title, description),
    info: (title: string, description?: string) => addToast("info", title, description),
    warning: (title: string, description?: string) => addToast("warning", title, description),
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-[#4ade80]" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-[#f87171]" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-[#facc15]" />;
      case "info":
      default:
        return <Info className="h-4 w-4 text-[#828fff]" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-[#1b3d26]";
      case "error":
        return "border-[#451e1e]";
      case "warning":
        return "border-[#3d3319]";
      case "info":
      default:
        return "border-[#282d5c]";
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl bg-[#0f1011] border ${getBorderColor(
              t.type
            )} p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">{getIcon(t.type)}</div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#f7f8f8]">{t.title}</p>
                {t.description && (
                  <p className="text-[11px] text-[#8a8f98] leading-relaxed">{t.description}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-[#8a8f98] hover:text-[#f7f8f8] p-0.5 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
