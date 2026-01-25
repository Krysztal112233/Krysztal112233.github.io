import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
// expressive-code
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";

// rehype
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeDocument from "rehype-document";
import rehypeInferDescriptionMeta from "rehype-infer-description-meta";
import rehypeMathjax from "rehype-mathjax";
import rehypeMeta from "rehype-meta";
import rehypeSlug from "rehype-slug";

// remark
import remarkDirective from "remark-directive";
import remarkBlock from "remark-github-beta-blockquote-admonitions";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import remarkToc from "remark-toc";
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
            remarkBlock,
            remarkRehype,
            [remarkMath, { singleDollarTextMath: false }],
            remarkReadingTime,
            remarkDirective,
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
