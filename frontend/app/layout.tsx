import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import localFont from "next/font/local";
import { SITE_CONFIG, createPageMetadata, getWebsiteJsonLd } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const pixelFont = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const rogFont = localFont({
  src: "../public/Rogbold-3llGM.otf",
  variable: "--font-rog-local",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

export const viewport: Viewport = {
  themeColor: "#050a14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  ...createPageMetadata({
    title: SITE_CONFIG.defaultTitle,
    description: SITE_CONFIG.description,
    path: "/",
  }),
  title: {
    default: SITE_CONFIG.defaultTitle,
    template: "%s | Kalceria",
  },
  icons: {
    icon: "/favicon.webp",
    apple: "/favicon.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = getWebsiteJsonLd();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} ${rogFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050a14] text-[#ededed]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
