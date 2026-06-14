import sitemap from "@astrojs/sitemap";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
// expressive-code
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import { pluginLanguageBadge } from "expressive-code-language-badge";
// rehype
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeMathjax from "rehype-mathjax";
// remark
import remarkBlock from "remark-github-beta-blockquote-admonitions";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import { getConfig } from "./src/config";
import { remarkReadingTime } from "./src/plugin/reading-time.mjs";

const {
    site: { site },
} = await getConfig();

export default defineConfig({
    devToolbar: {
        enabled: false,
    },
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
        sitemap(),
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
