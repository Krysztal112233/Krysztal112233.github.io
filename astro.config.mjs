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

// remark
import remarkBlock from "remark-github-beta-blockquote-admonitions";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import { remarkReadingTime } from "./src/plugin/reading-time.mjs";

export default defineConfig({
    integrations: [
        expressiveCode({
            plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
            themes: ["everforest-light"],
        }),

        icon(),
    ],
    markdown: {
        remarkPlugins: [
            remarkBlock,
            [remarkMath, { singleDollarTextMath: false }],
            remarkReadingTime,
            [remarkToc, { heading: "contents" }],
        ],
        rehypePlugins: [
            rehypeMathjax,
            [rehypeAutolinkHeadings, { behavior: "append" }],
        ],
    },
    vite: { plugins: [tailwindcss()] },
});
