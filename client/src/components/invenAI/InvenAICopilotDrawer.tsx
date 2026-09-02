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
  X,
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
    description: "Scan warehouse inventory for shortages below reorder threshold",
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
    description: "Review open vendor orders and delivery tracking",
    prompt: "List all open purchase orders, their total spend, and their current delivery statuses.",
    icon: FileSpreadsheet,
  },
  {
    command: "/catalog",
    title: "Component Catalog Search",
    description: "Search master component catalog specifications",
    prompt: "Search the catalog for all 0805 SMD resistors and report their package and unit specs.",
    icon: Boxes,
  },
  {
    command: "/valuation",
    title: "Warehouse Stock Valuation",
    description: "Calculate total monetary valuation of inventory",
    prompt: "Calculate the total inventory valuation across all warehouse shelf bins and locations.",
    icon: Microchip,
  },
  {
    command: "/bom",
    title: "BOM Inventory Allocation",
    description: "Inspect project BOM line items and highlight deficits",
    prompt: "Inspect the latest project BOM line items and calculate required procurement quantities.",
    icon: Layers,
  },
];

export const InvenAICopilotDrawer: React.FC = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

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
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#5e6ad2] px-4 py-3 text-xs font-semibold text-white shadow-xl shadow-[#5e6ad2]/30 hover:bg-[#6875e5] transition-all transform hover:scale-105 cursor-pointer ${
          isOpen ? "hidden" : "flex"
        }`}
      >
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span>InvenAI</span>
        <span className="flex h-2 w-2 rounded-full bg-[#4ade80]" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <aside className="relative flex w-full max-w-lg flex-col border-l border-[#23252a] bg-[#0f1011] shadow-2xl z-50 h-full">
            <div className="flex items-center justify-between border-b border-[#23252a] p-4 bg-[#141516]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 text-[#828fff]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-[#f7f8f8]">InvenAI</h2>
                    <span className="flex items-center gap-1 rounded bg-[#0d2e16] px-1.5 py-0.5 text-[9px] font-mono text-[#4ade80] border border-[#14532d]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                      Live Agent
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8a8f98]">Autonomous Hardware Supply Chain Intelligence</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    title="Clear conversation"
                    className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#010102] rounded-md transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[#8a8f98] hover:text-white hover:bg-[#010102] rounded-md transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 max-w-sm mx-auto">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/30 text-[#828fff]">
                    <Sparkles className="h-6 w-6 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#f7f8f8]">
                      How can I help you today?
                    </h3>
                    <p className="text-[11px] text-[#8a8f98]">
                      Type questions naturally or type <span className="font-mono text-[#828fff] bg-[#14172e] px-1 py-0.2 rounded border border-[#282d5c]">/</span> for directives.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 w-full pt-1">
                    {SLASH_COMMANDS.slice(0, 3).map((sc, i) => {
                      const Icon = sc.icon;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectCommand(sc)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#010102] border border-[#23252a] hover:border-[#5e6ad2]/60 hover:bg-[#141516] transition-all text-left group cursor-pointer"
                        >
                          <Icon className="h-3.5 w-3.5 text-[#5e6ad2] shrink-0 group-hover:text-[#828fff]" />
                          <div className="overflow-hidden">
                            <span className="text-xs font-semibold text-[#f7f8f8] group-hover:text-[#828fff] block truncate">
                              {sc.title}
                            </span>
                            <span className="text-[9px] text-[#8a8f98] font-mono">
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
                                className="rounded-lg border border-[#23252a] bg-[#010102] overflow-hidden text-[11px]"
                              >
                                <div
                                  onClick={() => toggleTool(tc.toolCallId)}
                                  className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[#141516] transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Wrench className="h-3.5 w-3.5 text-[#5e6ad2]" />
                                    <span className="font-mono font-semibold text-[#828fff]">
                                      Executed tool: {tc.toolName}
                                    </span>
                                    <span className="rounded bg-[#14172e] px-1.5 py-0.2 text-[9px] text-[#828fff] border border-[#282d5c]">
                                      Tool Call
                                    </span>
                                  </div>
                                  {isExp ? (
                                    <ChevronUp className="h-3 w-3 text-[#8a8f98]" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 text-[#8a8f98]" />
                                  )}
                                </div>

                                {isExp && (
                                  <div className="p-3 border-t border-[#23252a] bg-[#090a0f] space-y-2 font-mono text-[10px]">
                                    <div>
                                      <span className="text-[#8a8f98] block">Inputs:</span>
                                      <pre className="p-2 rounded bg-[#010102] border border-[#23252a] text-[#d0d6e0] overflow-x-auto">
                                        {JSON.stringify(tc.input, null, 2)}
                                      </pre>
                                    </div>
                                    {result && (
                                      <div>
                                        <span className="text-[#8a8f98] block">Result:</span>
                                        <pre className="p-2 rounded bg-[#010102] border border-[#23252a] text-[#4ade80] overflow-x-auto max-h-48">
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
                      className={`rounded-2xl p-3.5 max-w-[90%] ${
                        m.role === "user"
                          ? "bg-[#5e6ad2] text-white rounded-br-xs"
                          : "bg-[#010102] border border-[#23252a] text-[#d0d6e0] rounded-bl-xs"
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
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 text-[#828fff]">
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="rounded-2xl bg-[#010102] border border-[#23252a] p-3.5 text-xs text-[#8a8f98] flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5e6ad2] animate-ping" />
                    <span>InvenAI is inspecting supply chain metrics & tools...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {showSlashMenu && filteredCommands.length > 0 && (
              <div className="absolute left-3 right-3 bottom-20 z-30 rounded-xl border border-[#23252a] bg-[#0f1011]/95 backdrop-blur-md p-1 shadow-2xl space-y-1 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#62666d]">
                  <span className="flex items-center gap-1">
                    <Terminal className="h-2.5 w-2.5" />
                    Directives
                  </span>
                  <span>↑↓ Navigate • Enter</span>
                </div>
                {filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.command}
                      onClick={() => handleSelectCommand(cmd)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#5e6ad2] text-white"
                          : "hover:bg-[#141516] text-[#f7f8f8]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-[#5e6ad2]"}`} />
                        <div>
                          <span className="text-[11px] font-bold font-mono mr-1.5">{cmd.command}</span>
                          <span className={`text-[11px] ${isSelected ? "text-white" : "text-[#d0d6e0]"}`}>
                            {cmd.title}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 border-t border-[#23252a] bg-[#090a0f] space-y-2">
              <div className="relative flex items-center">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask InvenAI about stock, quotes, POs, or BOMs... (Type / for directives)"
                  rows={2}
                  disabled={isLoading}
                  className="w-full resize-none rounded-xl bg-[#010102] border border-[#23252a] p-2.5 pr-10 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => executePrompt(input)}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2.5 bottom-3.5 p-1.5 rounded-lg bg-[#5e6ad2] text-white hover:bg-[#6875e5] disabled:opacity-40 disabled:hover:bg-[#5e6ad2] transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
