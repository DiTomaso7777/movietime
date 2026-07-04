import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google Drive Music App",
  description: "Browse your Google Drive files",
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
