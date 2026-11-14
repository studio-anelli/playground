import type { Metadata } from "next";
import "./globals.css";
import { appearanceInitScript } from "@/lib/site-appearance";

export const metadata: Metadata = {
  title: "Anelli Prototype Platform",
  description: "An evolving platform for typographic, graphic, sonic and interactive experiments.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />{children}</body>
    </html>
  );
}
