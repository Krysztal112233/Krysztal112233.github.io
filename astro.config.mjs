import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
// expressive-code
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
// rehype
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeMathjax from "rehype-mathjax";
import rehypeSlug from "rehype-slug";
// remark
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import remarkToc from "remark-toc";
import { remarkDescription } from "./src/plugin/description.mts";
import { remarkReadingTime } from "./src/plugin/reading-time.mjs";

export default defineConfig({
    integrations: [
        expressiveCode({
            plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
        }),

        icon(),
    ],
    markdown: {
        remarkPlugins: [
            remarkRehype,
            [remarkMath, { singleDollarTextMath: false }],
            remarkReadingTime,
            remarkDescription,
            [remarkToc, { heading: "contents" }],
        ],
        rehypePlugins: [
            rehypeMathjax,
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "append" }],
        ],
    },
    vite: { plugins: [tailwindcss()] },
    experimental: {
        svgo: true,
    },
});
