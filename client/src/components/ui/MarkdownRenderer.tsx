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
    <div className={`prose prose-invert max-w-none text-xs text-[#d0d6e0] leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-[#f7f8f8] border-b border-[#23252a] pb-2 mt-4 mb-3 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-[#828fff] mt-4 mb-2 first:mt-0 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5e6ad2]" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f7f8f8] mt-3 mb-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 text-xs text-[#d0d6e0] leading-normal">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 list-disc pl-4 text-xs text-[#d0d6e0]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 list-decimal pl-4 text-xs text-[#d0d6e0]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-xs text-[#d0d6e0] leading-normal">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-[#8a8f98] italic">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#5e6ad2] bg-[#14172e]/30 px-3 py-1.5 rounded-r my-2 text-xs text-[#828fff]">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-[#23252a] bg-[#010102]">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#141516] border-b border-[#23252a] text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#23252a]/60">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#141516]/40 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-[#8a8f98]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-xs text-[#d0d6e0] font-mono">{children}</td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-[#141516] px-1.5 py-0.5 font-mono text-[11px] text-[#828fff] border border-[#23252a]">
              {children}
            </code>
          ),
          hr: () => <hr className="my-4 border-[#23252a]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
