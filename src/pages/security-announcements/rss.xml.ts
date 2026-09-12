import type { APIRoute } from "astro";

import { hasBlogCategory, mainSiteRssResponse } from "@/lib/main-site-rss";

export const prerender = true;

export const GET: APIRoute = () =>
  mainSiteRssResponse({
    title: "Micronaut Security Announcements",
    description:
      "Security announcements and vulnerability fixes from the Micronaut project.",
    filter: (post) => hasBlogCategory(post, "security-announcements"),
  });
