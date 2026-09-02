"use client";

import React, { useEffect, useState } from "react";
import { checkSystemHealth, type SystemHealthData } from "@/services/api";
import { Activity, RefreshCw, Calendar, AlertCircle } from "lucide-react";

export const SystemHealthModule: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealth = async () => {
    setIsLoading(true);
    const data = await checkSystemHealth();
    setHealth(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === "ok";
  const isError = health?.status === "error";

  const formattedDate = health?.timestamp
    ? new Date(health.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div className="rounded-xl bg-[#010102] border border-[#23252a] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isLoading
                ? "bg-[#facc15] animate-ping"
                : isHealthy
                ? "bg-[#4ade80] animate-pulse"
                : "bg-[#f87171]"
            }`}
          />
          <span className="text-[11px] font-semibold text-[#f7f8f8]">
            {isHealthy ? "System Operational" : isError ? "Server Offline" : "Connecting..."}
          </span>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={isLoading}
          className="text-[#8a8f98] hover:text-[#f7f8f8] p-1 rounded transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh Health Status"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#23252a]/60 text-[10px] text-[#8a8f98]">
        <div className="flex items-center gap-1.5 truncate">
          <Calendar className="h-3 w-3 shrink-0 text-[#5e6ad2]" />
          <span className="truncate">{formattedDate}</span>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <Activity className="h-3 w-3 shrink-0 text-[#4ade80]" />
          <span className="font-mono">{health ? `${health.latencyMs}ms` : "--"}</span>
        </div>
      </div>
    </div>
  );
};
