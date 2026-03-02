import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TacoTime - Celebrate Your Team \uD83C\uDF2E",
  description:
    "Give tacos, spread joy, build culture. TacoTime is a peer recognition platform that helps teams celebrate each other with virtual tacos.",
  keywords: ["team recognition", "peer appreciation", "tacos", "team culture", "employee engagement"],
  authors: [{ name: "TacoTime" }],
  openGraph: {
    title: "TacoTime - Celebrate Your Team \uD83C\uDF2E",
    description: "Give tacos, spread joy, build culture.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
