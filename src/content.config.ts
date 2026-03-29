import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
    loader: glob({
        pattern: "**/index.md",
        base: "./src/content/posts",
    }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            date: z.date(),
            tags: z.array(z.string()).optional(),
            image: image().optional(),
            draft: z.boolean().optional().default(false),
            categories: z.array(z.string()).optional(),
        }),
});

export const collections = {
    posts,
};
