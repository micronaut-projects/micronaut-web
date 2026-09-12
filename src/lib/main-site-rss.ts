import rss, { type RSSFeedItem } from "@astrojs/rss";

import { canonicalSurfaceUrl } from "@/lib/deployment-config";
import {
  cleanExcerptText,
  getBlogPosts,
  type BlogPostModel,
} from "@/lib/main-site-content";

export type MainSiteFeed = {
  title: string;
  description: string;
  filter?: (post: BlogPostModel) => boolean;
};

export async function mainSiteRssResponse(feed: MainSiteFeed) {
  const posts = await getBlogPosts();
  const items: RSSFeedItem[] = posts
    .filter(feed.filter ?? (() => true))
    .map((post) => {
      const { categories, tags, date, description, title } = post.entry.data;
      const postCategories = [
        ...(post.entry.data.category ? [post.entry.data.category] : []),
        ...categories,
        ...tags,
      ];

      return {
        title,
        description: cleanExcerptText(description),
        link: canonicalSurfaceUrl("main", post.href),
        ...(date ? { pubDate: date } : {}),
        categories: [...new Set(postCategories)],
      };
    });

  return rss({
    title: feed.title,
    description: feed.description,
    site: canonicalSurfaceUrl("main", "/"),
    items,
    customData: "<language>en-us</language>",
  });
}

export function hasBlogCategory(post: BlogPostModel, category: string) {
  return (
    post.entry.data.category === category ||
    post.entry.data.categories.includes(category)
  );
}
