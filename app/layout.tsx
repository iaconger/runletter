import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ParallaxInk } from "@/components/ui/ParallaxInk";

// Self-hosted, per foundations.md. No third-party font CDN in the app.
const display = localFont({
  src: "../public/fonts/InstrumentSerif-Regular.woff2",
  weight: "400",
  variable: "--rl-font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const sans = localFont({
  src: [
    { path: "../public/fonts/Geist-Regular.woff2", weight: "400" },
    { path: "../public/fonts/Geist-Medium.woff2", weight: "500" },
    { path: "../public/fonts/Geist-SemiBold.woff2", weight: "600" },
  ],
  variable: "--rl-font-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "RunLetter", template: "%s · RunLetter" },
  description: "Training plans from the runners you already follow.",
  icons: {
    icon: [{ url: "/brand/runletter-app-icon.svg", type: "image/svg+xml" }, { url: "/brand/icons/runletter-icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/brand/icons/runletter-icon-180.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RunLetter", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F4EE" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <ParallaxInk />
        {children}
      </body>
    </html>
  );
}
