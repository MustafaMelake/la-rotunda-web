import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Rotunda",
  description: "Pizza, fried chicken, and more — ordered in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
