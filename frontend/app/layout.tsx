import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blurt",
  description: "Just blurt it. We'll sort it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
