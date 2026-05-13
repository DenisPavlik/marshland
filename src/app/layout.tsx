import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marshland — find your next role",
  description:
    "A focused job board for engineers who care about craft. Discover roles at startups that move quietly and decisively.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="font-sans min-h-screen flex flex-col" suppressHydrationWarning>
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="mt-24 border-t border-gray-200 py-8 bg-white opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:400ms]">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
            <span className="font-mono">
              MARSHLAND &copy; {new Date().getFullYear()}
            </span>
            <span>Built quietly in the swamp.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
