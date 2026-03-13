"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { HELP_SECTIONS, ROUTE_TO_SECTION } from "./help-content";

/**
 * Minimal markdown-to-HTML renderer.
 * Handles headings, bold, lists, tables, links, code, and paragraphs.
 */
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  let inTable = false;
  let tableHeader = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Table rows
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Skip separator row (|---|---|)
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        tableHeader = false;
        continue;
      }

      if (!inTable) {
        if (inList) { html.push("</ul>"); inList = false; }
        html.push('<table class="help-table">');
        inTable = true;
        tableHeader = true;
      }

      const tag = tableHeader ? "th" : "td";
      html.push(
        "<tr>" + cells.map((c) => `<${tag}>${inlineFormat(c)}</${tag}>`).join("") + "</tr>"
      );
      continue;
    } else if (inTable) {
      html.push("</table>");
      inTable = false;
    }

    // Headings
    if (line.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h4>${inlineFormat(line.slice(4))}</h4>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3>${inlineFormat(line.slice(3))}</h3>`);
      continue;
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      // Treat as unordered for simplicity
      if (!inList) { html.push('<ol class="help-ol">'); inList = true; }
      html.push(`<li>${inlineFormat(line.replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    }

    // Close list if we hit a non-list line
    if (inList && line.trim() === "") {
      html.push(inList ? "</ul>" : "</ol>");
      inList = false;
      continue;
    }
    if (inList && !line.startsWith(" ")) {
      html.push("</ul>");
      inList = false;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      html.push("<hr />");
      continue;
    }

    // Empty line
    if (line.trim() === "") continue;

    // Paragraph
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  if (inTable) html.push("</table>");

  return html.join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

export function HelpPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);

  // Determine which section to scroll to based on current route
  const getSectionForRoute = useCallback(() => {
    // Try exact match first, then prefix match
    if (ROUTE_TO_SECTION[pathname]) return ROUTE_TO_SECTION[pathname];
    for (const [route, section] of Object.entries(ROUTE_TO_SECTION)) {
      if (pathname.startsWith(route)) return section;
    }
    return "getting-started";
  }, [pathname]);

  // When panel opens, scroll to the relevant section
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const sectionId = getSectionForRoute();
      setActiveSection(sectionId);

      // Small delay to let the panel animate in
      requestAnimationFrame(() => {
        const el = document.getElementById(`help-section-${sectionId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, [isOpen, getSectionForRoute]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(`help-section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="no-underline font-bold py-2 px-3 border border-gray-200 rounded-xl bg-white text-center text-sm md:text-base hover:bg-gray-50 transition-colors"
      >
        Help
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 bg-white shadow-2xl transition-transform duration-300 ease-in-out flex ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "min(800px, 90vw)" }}
      >
        {/* Table of Contents sidebar */}
        <div className="w-56 shrink-0 border-r bg-gray-50 overflow-y-auto hidden md:block">
          <div className="p-4 border-b">
            <h3 className="text-sm font-bold text-gray-800">Contents</h3>
          </div>
          <nav className="p-2">
            {HELP_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`block w-full text-left text-xs py-1.5 px-2 rounded transition-colors ${
                  activeSection === section.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Help Guide
              </h2>
              <p className="text-xs text-gray-500">
                The Real Estate Genie &mdash; Version 1.0
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none px-2"
              aria-label="Close help panel"
            >
              &times;
            </button>
          </div>

          {/* Mobile TOC dropdown */}
          <div className="md:hidden px-4 py-2 border-b bg-gray-50">
            <select
              value={activeSection || "getting-started"}
              onChange={(e) => scrollToSection(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1.5 bg-white"
            >
              {HELP_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="help-content">
              {HELP_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  id={`help-section-${section.id}`}
                  className="mb-10 scroll-mt-4"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(section.content),
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scoped styles for help content */}
      <style jsx global>{`
        .help-content h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 1.5rem 0 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .help-content h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 1.25rem 0 0.5rem;
        }
        .help-content p {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #4b5563;
          margin: 0.5rem 0;
        }
        .help-content ul,
        .help-content ol.help-ol {
          margin: 0.5rem 0;
          padding-left: 1.25rem;
        }
        .help-content li {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #4b5563;
          margin: 0.25rem 0;
        }
        .help-content strong {
          color: #1f2937;
          font-weight: 600;
        }
        .help-content code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8125rem;
        }
        .help-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .help-content a:hover {
          color: #1d4ed8;
        }
        .help-content hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .help-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          margin: 0.75rem 0;
        }
        .help-table th,
        .help-table td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem 0.75rem;
          text-align: left;
          vertical-align: top;
        }
        .help-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .help-table td {
          color: #4b5563;
        }
      `}</style>
    </>
  );
}
