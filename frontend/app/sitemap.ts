import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/about", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/events", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/map", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/minigame", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/journey", priority: 0.7, changeFrequency: "monthly" as const },
  ];

  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${SITE_CONFIG.url}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

