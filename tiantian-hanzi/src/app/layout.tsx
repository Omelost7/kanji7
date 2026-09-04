import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tiantian Hanzi 天天汉字",
  description: "Learn Chinese characters a little every day, with spaced repetition.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl items-baseline gap-6 px-6 py-5">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="hanzi text-2xl">天天汉字</span>
              <span className="text-sm tracking-wide text-ink-faint">Tiantian Hanzi</span>
            </Link>
            <nav className="ml-auto flex items-center gap-6 text-sm">
              <Link href="/" className="text-ink-soft hover:text-ink">
                Dashboard
              </Link>
              <Link href="/levels" className="text-ink-soft hover:text-ink">
                Levels
              </Link>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-6 py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-5xl px-6 pb-12 text-xs text-ink-faint">
          Content lives in editable JSON under <code>content/</code>. 天天学一点。
        </footer>
      </body>
    </html>
  );
}
