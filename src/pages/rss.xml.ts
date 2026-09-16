import type { APIRoute } from "astro";

import { mainSiteRssResponse } from "@/lib/main-site-rss";

export const prerender = true;

export const GET: APIRoute = () =>
  mainSiteRssResponse({
    title: "Micronaut Blog",
    description:
      "News, technical articles, release information, and community updates from the Micronaut project.",
  });
