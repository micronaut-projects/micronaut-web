import type { APIRoute } from "astro";

import { hasBlogCategory, mainSiteRssResponse } from "@/lib/main-site-rss";

export const prerender = true;

export const GET: APIRoute = () =>
  mainSiteRssResponse({
    title: "Micronaut Announcements",
    description: "Release announcements from the Micronaut project.",
    filter: (post) => hasBlogCategory(post, "release-announcements"),
  });
