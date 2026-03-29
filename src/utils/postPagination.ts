import type { CollectionEntry } from "astro:content";

export const POSTS_PER_PAGE = 25;

export function sortPosts(posts: CollectionEntry<"posts">[]) {
    return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function getPaginatedPosts(
    posts: CollectionEntry<"posts">[],
    currentPage: number,
    postsPerPage = POSTS_PER_PAGE
) {
    const totalPages = Math.max(1, Math.ceil(posts.length / postsPerPage));
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safePage - 1) * postsPerPage;

    return {
        currentPage: safePage,
        totalPages,
        posts: posts.slice(start, start + postsPerPage),
    };
}
