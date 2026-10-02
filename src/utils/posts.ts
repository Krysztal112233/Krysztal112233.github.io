import { type CollectionEntry, getCollection } from "astro:content";

/**
 * All posts with drafts excluded.
 * Always use this instead of raw `getCollection("posts")` so draft posts
 * never leak into pages, listings, tags, or RSS.
 */
export function getPublishedPosts(): Promise<CollectionEntry<"posts">[]> {
    return getCollection("posts", ({ data }) => !data.draft);
}
