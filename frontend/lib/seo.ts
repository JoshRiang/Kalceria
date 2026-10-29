import type { Metadata } from "next";

export const SITE_CONFIG = {
  name: "Kalceria",
  defaultTitle: "Kalceria | Automotive Culture & Digital Art Collective",
  description:
    "Kalceria is an automotive culture and interactive digital art collective blending high-octane engineering, curated street events, live community radar, and bespoke creative experiences.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://kalceria-frontend.vercel.app",
  locale: "en_US",
  ogImage: "/aboutus_bg1.webp",
};

interface PageSeoOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
  ogImage = SITE_CONFIG.ogImage,
  noIndex = false,
}: PageSeoOptions): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;

  return {
    title,
    description,
    keywords: [
      "Kalceria",
      "automotive culture",
      "street culture Indonesia",
      "car enthusiast community",
      "interactive digital collective",
      ...keywords,
    ],
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_CONFIG.url}/#organization`,
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
        logo: `${SITE_CONFIG.url}/favicon.webp`,
        description: SITE_CONFIG.description,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_CONFIG.url}/#website`,
        url: SITE_CONFIG.url,
        name: SITE_CONFIG.name,
        description: SITE_CONFIG.description,
        publisher: {
          "@id": `${SITE_CONFIG.url}/#organization`,
        },
      },
    ],
  };
}

