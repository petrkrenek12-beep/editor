import type { Metadata, Viewport } from "next";
import "./globals.css";
import { googleFontsHref } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Presetka – sportovní grafiky",
  description: "Generátor sportovních grafik pro sociální sítě ze šablon a dat.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Presetka", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E1218",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={googleFontsHref()} data-presetka-fonts="1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
