"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./Card";
import { Button } from "./Button";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <Card className="w-full max-w-sm border-[#23252a] bg-[#0f1011] shadow-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  variant === "danger"
                    ? "bg-[#241414] border border-[#451e1e] text-[#f87171]"
                    : "bg-[#14172e] border border-[#282d5c] text-[#828fff]"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="p-1 text-[#8a8f98] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <CardDescription className="pt-2 text-xs text-[#8a8f98] leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="flex items-center justify-end gap-2 border-t border-[#23252a] pt-3">
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
