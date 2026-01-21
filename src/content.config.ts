import { defineCollection, z } from "astro:content";

const posts = defineCollection({
    type: "content",
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            date: z.date(),
            tags: z.array(z.string()).optional(),
            description: z.string().optional(),
            image: image().optional(),
            draft: z.boolean().optional().default(false),
            categories: z.array(z.string()).optional(),
        }),
});

export const collections = {
    posts,
};
