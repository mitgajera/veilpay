"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; level: 2 | 3 };

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * "On this page" sub-navigation. Scans the rendered article for h2/h3, assigns
 * stable slug ids (so headings are deep-linkable), and scroll-spies the active
 * section. Rebuilds per route. Renders nothing if a page has < 2 sections.
 */
export function OnThisPage() {
  const pathname = usePathname();
  const [headings, setHeadings] = React.useState<Heading[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("main article h2, main article h3"),
    );
    const used = new Set<string>();
    const items: Heading[] = nodes.map((node) => {
      let id = node.id || slugify(node.textContent ?? "");
      while (used.has(id)) id += "-x";
      used.add(id);
      node.id = id;
      return { id, text: node.textContent ?? "", level: node.tagName === "H3" ? 3 : 2 };
    });
    setHeadings(items);

    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: [0, 1] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((h) => {
          const active = activeId === h.id;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l py-1 transition-colors",
                  h.level === 3 ? "pl-6" : "pl-4",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border-hi hover:text-foreground",
                )}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
