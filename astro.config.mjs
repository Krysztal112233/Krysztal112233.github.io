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
import { rehypeEmoji } from "./src/plugin/emoji.mjs";
import { rehypePhotoStack } from "./src/plugin/photo-stack.mjs";
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
            themes: ["everforest-light", "everforest-dark"],
            // 与 global.css 的 --font-mono 保持一致：expressive-code 会
            // 内联自己的默认等宽字体栈，必须显式覆盖才能用上 Maple Mono
            styleOverrides: {
                codeFontFamily:
                    '"Maple Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
            useDarkModeMediaQuery: false,
            themeCssSelector: (theme) =>
                theme.type === "dark"
                    ? '[data-theme="dark"]'
                    : '[data-theme="retro"]',
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
            // emoji 须在 mathjax 之后：避免 :t: 这类 LaTeX 片段先被替换
            [rehypeAutolinkHeadings, { behavior: "append" }],
            rehypePhotoStack,
            rehypeEmoji,
        ],
    },
    vite: { plugins: [tailwindcss()] },
});
