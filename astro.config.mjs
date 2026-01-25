import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import icon from "astro-icon";

// expressive-code
import expressiveCode from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

// remark
import { remarkReadingTime } from "./src/plugin/reading-time.mjs";
import remarkToc from "remark-toc";

// rehype
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";

export default defineConfig({
    integrations: [
        expressiveCode({
            plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
        }),

        mdx(),
        icon(),
    ],
    markdown: {
        remarkPlugins: [
            remarkReadingTime,
            [remarkToc, { heading: "contents" }],
        ],
        remarkPlugins: [
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "append" }],
        ],
    },
    vite: { plugins: [tailwindcss()] },
    experimental: {
        svgo: true,
    },
});
