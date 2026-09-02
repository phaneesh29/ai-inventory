"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose prose-invert max-w-none text-xs text-[#d0d6e0] leading-relaxed space-y-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-[#f7f8f8] border-b border-[#23252a] pb-2 mt-4 mb-2.5 first:mt-0 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#828fff] mt-5 mb-2 first:mt-0 flex items-center gap-2 border-b border-[#23252a]/60 pb-1.5">
              <span className="h-2 w-2 rounded-full bg-[#5e6ad2]" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-[#f7f8f8] mt-3 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 text-xs text-[#d0d6e0] leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1.5 list-disc pl-4 text-xs text-[#d0d6e0]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1.5 list-decimal pl-4 text-xs text-[#d0d6e0]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-xs text-[#d0d6e0] leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => {
            const text = String(children);
            if (text.includes("CRITICAL") || text.includes("Red Alert") || text.includes("Urgent")) {
              return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#3b1212] text-[#f87171] border border-[#7f1d1d]/60">
                  {children}
                </span>
              );
            }
            if (text.includes("WARNING") || text.includes("HIGH")) {
              return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#38260d] text-[#facc15] border border-[#713f12]/60">
                  {children}
                </span>
              );
            }
            if (text.includes("HEALTHY") || text.includes("Tier 1")) {
              return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#0d2e16] text-[#4ade80] border border-[#14532d]/60">
                  {children}
                </span>
              );
            }
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em: ({ children }) => (
            <em className="text-[#8a8f98] italic">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#5e6ad2] bg-[#14172e]/40 px-3.5 py-2 rounded-r-lg my-2 text-xs text-[#828fff] border border-y-0 border-r-0">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-[#23252a] bg-[#010102] shadow-inner">
              <table className="w-full text-left text-xs divide-y divide-[#23252a]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#141516] text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#23252a]/60 bg-[#010102]/60">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#141516]/60 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold text-[#8a8f98]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 text-xs text-[#d0d6e0] font-sans">{children}</td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-[#14172e] px-1.5 py-0.5 font-mono text-[11px] text-[#828fff] border border-[#282d5c]">
              {children}
            </code>
          ),
          hr: () => <hr className="my-3 border-[#23252a]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
