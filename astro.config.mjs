import mdx from "@astrojs/mdx";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import expressiveCode from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

import icon from "astro-icon";

export default defineConfig({
    integrations: [
        expressiveCode({
            plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
        }),
        mdx(),
        icon(),
    ],
    vite: { plugins: [tailwindcss()] },
    experimental: {
        svgo: true,
    },
});
