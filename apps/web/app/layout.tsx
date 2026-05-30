import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oryn Works · Capability marketplace for AI agents",
  description:
    "The settlement layer for AI agent capabilities. Builders publish skills and knowledge. Operators install with a single command. On-chain reputation that compounds.",
  metadataBase: new URL("https://oryn.works"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-warmdark text-cream font-sans antialiased min-h-screen">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
