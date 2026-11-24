import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Apply for a trade licence",
  description: "Demonstration public service portal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
