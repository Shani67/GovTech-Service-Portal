import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Apply for a trade licence – Lakeside Municipal Council (demo)",
    template: "%s – Apply for a trade licence (demo)",
  },
  description:
    "A demonstration public service: apply for a trade licence, track your application and review it as council staff.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only bg-focus p-3 font-bold text-ink focus:not-sr-only focus:block"
        >
          Skip to main content
        </a>
        <header>
          <div className="border-b-8 border-[#5694ca] bg-brand text-white">
            <div className="container-page flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-4">
              <Link
                href="/"
                className="text-xl font-bold text-white no-underline hover:underline sm:text-2xl"
              >
                Lakeside Municipal Council
              </Link>
              <Link href="/" className="text-lg font-bold text-white hover:underline">
                Apply for a trade licence
              </Link>
            </div>
          </div>
          <div className="bg-white text-ink">
            <div className="container-page">
              <p className="flex flex-wrap items-center gap-3 border-b border-border py-3 text-base">
                <strong className="bg-[#1d70b8] px-2 py-0.5 text-sm tracking-wide text-white uppercase">
                  Demo
                </strong>
                <span>
                  This is not a real government service. It is a portfolio project, and any details
                  you enter are test data.
                </span>
              </p>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="container-page flex-1 py-8 sm:py-10">
          {children}
        </main>
        <footer className="mt-12 border-t-4 border-[#5694ca] bg-surface py-8 text-base">
          <div className="container-page flex flex-col gap-4 sm:flex-row sm:justify-between">
            <nav aria-label="Support links">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                <li>
                  <Link href="/accessibility" className="link text-ink">
                    Accessibility statement
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="link text-ink">
                    Privacy and cookies
                  </Link>
                </li>
                <li>
                  <Link href="/staff" className="link text-ink">
                    Licensing team sign in
                  </Link>
                </li>
              </ul>
            </nav>
            <p>Lakeside Municipal Council is fictional. Built by Geethma Ranathunga.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
