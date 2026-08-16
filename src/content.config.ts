import { fileURLToPath } from "node:url";
import { defineCollection } from "astro:content";
import { glob, type Loader } from "astro/loaders";
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

const MORE_MARKER_REGEX = /<!--\s*more\s*-->/i;

/**
 * Wraps the glob loader and splits every `<plant>/about.md` at the
 * `<!-- more -->` marker into two entries:
 * - `<plant>/about` — the part above the marker, always visible
 * - `<plant>/about__detail` — the part below, rendered collapsed
 */
function growingLoader(): Loader {
    const inner = glob({
        pattern: "**/*.md",
        base: "./src/content/growing",
    });

    return {
        name: "growing-loader",
        load: async (context) => {
            await inner.load(context);

            const { store, entryTypes, config, generateDigest } = context;
            const entryType = entryTypes.get(".md");
            const renderEntry = entryType?.getRenderFunction
                ? await entryType.getRenderFunction(config)
                : undefined;
            if (!renderEntry) {
                return;
            }

            for (const [id, entry] of [...store.entries()]) {
                if (!id.endsWith("/about")) {
                    continue;
                }

                const body = entry.body;
                const match = body?.match(MORE_MARKER_REGEX);
                if (!body || !match || match.index === undefined) {
                    continue;
                }

                // entry.filePath is stored relative to the project root,
                // while the render function expects an absolute path.
                const filePath = entry.filePath
                    ? fileURLToPath(new URL(entry.filePath, config.root))
                    : undefined;

                const fragments = [
                    {
                        id,
                        body: body.slice(0, match.index).trim(),
                    },
                    {
                        id: `${id}__detail`,
                        body: body.slice(match.index + match[0].length).trim(),
                    },
                ];

                for (const fragment of fragments) {
                    const digest = generateDigest(fragment.body);
                    const rendered = await renderEntry({
                        id: fragment.id,
                        data: entry.data,
                        body: fragment.body,
                        filePath,
                        digest,
                    });
                    store.set({
                        ...entry,
                        id: fragment.id,
                        body: fragment.body,
                        digest,
                        rendered,
                        assetImports: rendered?.metadata?.imagePaths,
                    });
                }
            }
        },
    };
}

const growing = defineCollection({
    loader: growingLoader(),
    schema: () =>
        z.object({
            title: z.string().optional(),
            date: z.date().optional(),
            weather: z.string().optional(),
            draft: z.boolean().optional().default(false),
        }),
});

export const collections = {
    posts,
    growing,
};
