import { defineConfig } from "astro/config";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

// expressive-code
import expressiveCode from "astro-expressive-code";
import { pluginLanguageBadge } from "expressive-code-language-badge";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";

// rehype
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeMathjax from "rehype-mathjax";

// remark
import remarkBlock from "remark-github-beta-blockquote-admonitions";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import { remarkReadingTime } from "./src/plugin/reading-time.mjs";
import { getConfig } from "./src/config";

const {
    site: { site },
} = await getConfig();

export default defineConfig({
    site: site,
    integrations: [
        expressiveCode({
            plugins: [
                pluginCollapsibleSections(),
                pluginLanguageBadge(),
                pluginLineNumbers(),
            ],
            themes: ["everforest-light"],
        }),

        icon(),
    ],
    markdown: {
        remarkPlugins: [
            remarkBlock,
            [remarkMath, { singleDollarTextMath: true }],
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
