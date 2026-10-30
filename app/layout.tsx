import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrainOps | Preston maintenance simulator",
  description: "Illustrative drainage maintenance decision simulator for Lancashire.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
