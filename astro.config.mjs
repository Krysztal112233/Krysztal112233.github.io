import { createRequire } from "node:module";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

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

// 自定义 Expressive Code 插件：把代码块 meta 中的裸 `fold` 关键字翻译成
// collapsible-sections 插件的整段折叠 `collapse={1-N}`。EC 本身不认识
// `fold`（只会解析成无人消费的无 key meta 选项），必须在这里显式转换。
// 注意：必须注册在 pluginCollapsibleSections() 之前，后者在
// preprocessMetadata 阶段读取 collapse 范围。
function pluginFold() {
    return {
        name: "Fold",
        hooks: {
            preprocessMetadata: ({ codeBlock }) => {
                if (!codeBlock.metaOptions.getBoolean("fold")) return;
                const lineCount = codeBlock.getLines().length;
                codeBlock.meta = `${codeBlock.meta} collapse={1-${lineCount}}`;
            },
        },
    };
}

const {
    site: { site },
} = await getConfig();

// Astro's glob loader turns each content path segment into an entry id via
// github-slugger (astro/dist/content/utils.js). Resolve that exact function
// through astro's own dependencies so our post-id mapping matches the URLs
// Astro actually generates. If resolution ever fails, fall back to raw
// directory names rather than breaking the daily-cron deploy.
let githubSlug = (name) => name;
try {
    const requireFromAstro = createRequire(import.meta.resolve("astro"));
    const sluggerUrl = pathToFileURL(requireFromAstro.resolve("github-slugger"));
    ({ slug: githubSlug } = await import(sluggerUrl.href));
} catch {
    console.warn(
        "[sitemap-lastmod] github-slugger not resolvable via astro; " +
            "falling back to raw directory names for post id mapping.",
    );
}

// Post entry id → frontmatter date, used to emit <lastmod> in the sitemap.
// Posts with missing/unparsable dates simply get no lastmod.
async function getPostLastmodMap() {
    const map = new Map();

    async function walk(dirUrl, segments) {
        for (const dirent of await fs.readdir(dirUrl, {
            withFileTypes: true,
        })) {
            if (dirent.isDirectory()) {
                await walk(new URL(`${dirent.name}/`, dirUrl), [
                    ...segments,
                    dirent.name,
                ]);
                continue;
            }
            if (dirent.name !== "index.md") {
                continue;
            }
            try {
                const text = await fs.readFile(
                    new URL("index.md", dirUrl),
                    "utf8",
                );
                const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
                const dateText = frontmatter?.[1].match(
                    /^date:\s*["']?(.+?)["']?\s*$/m,
                )?.[1];
                const date = dateText ? new Date(dateText) : undefined;
                if (date && !Number.isNaN(date.getTime())) {
                    const id = segments.map((s) => githubSlug(s)).join("/");
                    map.set(id, date.toISOString());
                }
            } catch {
                // unreadable file — skip its lastmod
            }
        }
    }

    await walk(new URL("./src/content/posts/", import.meta.url), []);
    return map;
}

const postLastmod = await getPostLastmodMap();

export default defineConfig({
    devToolbar: {
        enabled: false,
    },
    site: site,
    integrations: [
        expressiveCode({
            plugins: [
                pluginFold(),
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
                // 与终端字号一致（Alacritty 12pt Maple Mono NF CN）；12pt = 16px
                codeFontSize: "12pt",
            },
            useDarkModeMediaQuery: false,
            themeCssSelector: (theme) =>
                theme.type === "dark"
                    ? '[data-theme="dark"]'
                    : '[data-theme="retro"]',
        }),
        icon(),
        sitemap({
            // Attach <lastmod> from each post's frontmatter date so Google
            // can prioritize recrawls; non-post pages omit lastmod.
            serialize(item) {
                const pathname = decodeURIComponent(
                    new URL(item.url).pathname,
                );
                const postId = pathname.match(/^\/posts\/(.+?)\/?$/)?.[1];
                const lastmod = postId ? postLastmod.get(postId) : undefined;
                if (lastmod) {
                    item.lastmod = lastmod;
                }
                return item;
            },
        }),
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
