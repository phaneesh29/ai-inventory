"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  sendInvenAIChat,
  type InvenAIChatMessage,
  type InvenAIStep,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  Send,
  Wrench,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Boxes,
  Truck,
  FileSpreadsheet,
  Flame,
  Microchip,
  Layers,
  Terminal,
} from "lucide-react";

interface MessageItem extends InvenAIChatMessage {
  id: string;
  steps?: InvenAIStep[];
  timestamp: string;
}

interface SlashCommand {
  command: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ElementType;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/audit",
    title: "Warehouse Stockout Audit",
    description: "Scan warehouse inventory and list critical shortages below reorder threshold",
    prompt: "Perform a full warehouse stockout audit. List all components below reorder threshold with recommended reorder quantities.",
    icon: Flame,
  },
  {
    command: "/pricing",
    title: "Compare Distributor Pricing",
    description: "Benchmark DigiKey, Mouser, and LCSC quotes and lead times",
    prompt: "Compare pricing tiers, MOQ, and lead times across all distributors for SSD1306 OLED and ESP32 components.",
    icon: Truck,
  },
  {
    command: "/orders",
    title: "Purchase Order Status Check",
    description: "Review open vendor orders, active spend, and delivery tracking",
    prompt: "List all open purchase orders, their total spend, and their current delivery statuses.",
    icon: FileSpreadsheet,
  },
  {
    command: "/catalog",
    title: "Component Catalog Search",
    description: "Search master component catalog specifications and package types",
    prompt: "Search the catalog for all 0805 SMD resistors and report their package and unit specs.",
    icon: Boxes,
  },
  {
    command: "/valuation",
    title: "Warehouse Stock Valuation",
    description: "Calculate total monetary valuation across all warehouse shelf bins",
    prompt: "Calculate the total inventory valuation across all warehouse shelf bins and locations.",
    icon: Microchip,
  },
  {
    command: "/bom",
    title: "BOM Inventory Allocation",
    description: "Inspect project BOM line items and highlight missing stock deficits",
    prompt: "Inspect the latest project BOM line items and calculate required procurement quantities.",
    icon: Layers,
  },
];

export default function InvenAIPage() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showSlashMenu = input.startsWith("/");

  const filteredCommands = useMemo(() => {
    if (!showSlashMenu) return [];
    const query = input.slice(1).toLowerCase().trim();
    if (!query) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (c) =>
        c.command.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
    );
  }, [input, showSlashMenu]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleTool = (toolCallId: string) => {
    setExpandedTools((prev) => ({ ...prev, [toolCallId]: !prev[toolCallId] }));
  };

  const executePrompt = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      const payloadMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendInvenAIChat(payloadMessages);

      const assistantMessage: MessageItem = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.text,
        steps: response.steps,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      toast.error("InvenAI Error", err.message);
      const errorMessage: MessageItem = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Error:** Unable to process request. (${err.message})`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCommand = (cmd: SlashCommand) => {
    executePrompt(cmd.prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          handleSelectCommand(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executePrompt(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#010102] text-[#f7f8f8] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4 text-xs">
        <div className="max-w-4xl mx-auto w-full space-y-4 h-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-lg mx-auto my-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/30 text-[#828fff] shadow-xl shadow-[#5e6ad2]/10">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-[#f7f8f8]">
                  What would you like to analyze?
                </h2>
                <p className="text-xs text-[#8a8f98] leading-relaxed max-w-md mx-auto">
                  Ask supply chain questions in natural language, or type <span className="font-mono text-[#828fff] bg-[#14172e] px-1.5 py-0.5 rounded border border-[#282d5c]">/</span> for quick automated directives.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
                {SLASH_COMMANDS.slice(0, 4).map((sc, i) => {
                  const Icon = sc.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectCommand(sc)}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0f1011] border border-[#23252a] hover:border-[#5e6ad2]/60 hover:bg-[#141516] transition-all text-left group cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-[#5e6ad2] shrink-0 group-hover:text-[#828fff]" />
                      <div className="overflow-hidden">
                        <span className="text-xs font-semibold text-[#f7f8f8] group-hover:text-[#828fff] block truncate">
                          {sc.title}
                        </span>
                        <span className="text-[10px] text-[#8a8f98] font-mono">
                          {sc.command}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} space-y-1.5`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-[#8a8f98] px-1">
                  <span>{m.role === "user" ? "You" : "InvenAI"}</span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </div>

                {m.steps && m.steps.length > 0 && (
                  <div className="w-full space-y-2 mb-2">
                    {m.steps.map((step, sIdx) =>
                      step.toolCalls.map((tc) => {
                        const result = step.toolResults.find((tr) => tr.toolCallId === tc.toolCallId);
                        const isExp = expandedTools[tc.toolCallId];

                        return (
                          <div
                            key={tc.toolCallId || sIdx}
                            className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden text-[11px]"
                          >
                            <div
                              onClick={() => toggleTool(tc.toolCallId)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#141516] transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Wrench className="h-3.5 w-3.5 text-[#5e6ad2]" />
                                <span className="font-mono font-semibold text-[#828fff]">
                                  Executed Tool: {tc.toolName}
                                </span>
                                <span className="rounded bg-[#14172e] px-1.5 py-0.2 text-[9px] text-[#828fff] border border-[#282d5c]">
                                  AI Action
                                </span>
                              </div>
                              {isExp ? (
                                <ChevronUp className="h-3.5 w-3.5 text-[#8a8f98]" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-[#8a8f98]" />
                              )}
                            </div>

                            {isExp && (
                              <div className="p-3 border-t border-[#23252a] bg-[#090a0f] space-y-2 font-mono text-[10px]">
                                <div>
                                  <span className="text-[#8a8f98] block">Arguments:</span>
                                  <pre className="p-2 rounded-lg bg-[#010102] border border-[#23252a] text-[#d0d6e0] overflow-x-auto">
                                    {JSON.stringify(tc.input, null, 2)}
                                  </pre>
                                </div>
                                {result && (
                                  <div>
                                    <span className="text-[#8a8f98] block">Database Output:</span>
                                    <pre className="p-2 rounded-lg bg-[#010102] border border-[#23252a] text-[#4ade80] overflow-x-auto max-h-56">
                                      {JSON.stringify(result.output, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 max-w-[90%] ${
                    m.role === "user"
                      ? "bg-[#5e6ad2] text-white rounded-br-xs"
                      : "bg-[#0f1011] border border-[#23252a] text-[#d0d6e0] rounded-bl-xs"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 text-[#828fff]">
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-4 text-xs text-[#8a8f98] flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#5e6ad2] animate-ping" />
                <span>InvenAI is inspecting database tools and reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t border-[#23252a] bg-[#090a0f] shrink-0 relative">
        <div className="max-w-4xl mx-auto w-full relative">
          {showSlashMenu && filteredCommands.length > 0 && (
            <div className="absolute left-0 right-0 bottom-full mb-3 z-30 rounded-xl border border-[#23252a] bg-[#0f1011]/95 backdrop-blur-md p-1.5 shadow-2xl space-y-1 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#62666d]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" />
                  Directives (Type / to filter)
                </span>
                <span>↑↓ Navigate • Enter Select</span>
              </div>
              {filteredCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={cmd.command}
                    onClick={() => handleSelectCommand(cmd)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#5e6ad2] text-white"
                        : "hover:bg-[#141516] text-[#f7f8f8]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-[#5e6ad2]"}`} />
                      <div>
                        <span className="text-xs font-bold font-mono mr-2">{cmd.command}</span>
                        <span className={`text-xs ${isSelected ? "text-white" : "text-[#d0d6e0]"}`}>
                          {cmd.title}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] hidden sm:inline ${isSelected ? "text-white/80" : "text-[#8a8f98]"}`}>
                      {cmd.description}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                title="Start new conversation"
                className="p-3 rounded-xl bg-[#0f1011] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516] transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <div className="relative flex-1 flex items-center">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask InvenAI about stock, quotes, POs, or BOMs... (Type / for commands)"
                rows={2}
                disabled={isLoading}
                className="w-full resize-none rounded-xl bg-[#0f1011] border border-[#23252a] p-3 pr-12 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => executePrompt(input)}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3.5 p-2 rounded-lg bg-[#5e6ad2] text-white hover:bg-[#6875e5] disabled:opacity-40 disabled:hover:bg-[#5e6ad2] transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
