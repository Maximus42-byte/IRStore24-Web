import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IRStore24 | Coming Soon",
  description: "IRStore24 CS2 Items Store - Under Construction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
