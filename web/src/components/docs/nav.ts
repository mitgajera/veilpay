export type DocLink = { href: string; label: string };
export type DocSection = { title: string; items: DocLink[] };

export const docsNav: DocSection[] = [
  {
    title: "Getting started",
    items: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/concepts", label: "Concepts" },
      { href: "/docs/architecture", label: "Architecture" },
    ],
  },
  {
    title: "Guides",
    items: [{ href: "/docs/recipes", label: "Recipes" }],
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/sdk", label: "SDK" },
      { href: "/docs/cli", label: "CLI" },
      { href: "/docs/program", label: "Program" },
      { href: "/docs/errors", label: "Errors & troubleshooting" },
    ],
  },
];
