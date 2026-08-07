import type { Metadata } from "next";
import "./globals.css";

import { Cairo, Anton, Pacifico } from "next/font/google";

const cairo = Cairo({
  subsets: ["latin", "arabic"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
  display: "swap",
});


export const metadata: Metadata = {
  title: "La Rotunda",
  description: "Pizza, fried chicken, and more — ordered in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cairo.variable} ${anton.variable} ${pacifico.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
