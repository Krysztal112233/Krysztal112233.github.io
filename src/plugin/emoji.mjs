import { visit } from "unist-util-visit";

import emojis from "./emoji-data.mjs";

const RE = /(^|[^\w:]):([a-z0-9_+-]+):/g;

const SKIP_PARENTS = new Set(["code", "pre", "script", "style", "svg"]);

export function rehypeEmoji() {
    return (tree) => {
        visit(tree, "text", (node, index, parent) => {
            if (!parent || SKIP_PARENTS.has(parent.tagName)) return;

            RE.lastIndex = 0;
            if (!RE.test(node.value)) return;
            RE.lastIndex = 0;

            const parts = [];
            let last = 0;
            let m;

            while ((m = RE.exec(node.value)) !== null) {
                const emoji = emojis[m[2]];
                if (!emoji) continue; // 未知短代码，跳过（GitHub 行为）

                const [full, boundary] = m;
                if (m.index + boundary.length > last) {
                    parts.push({
                        type: "text",
                        value: node.value.slice(last, m.index + boundary.length),
                    });
                }

                parts.push(
                    typeof emoji === "string"
                        ? { type: "text", value: emoji }
                        : {
                            type: "element",
                            tagName: "img",
                            properties: {
                                src: emoji.src,
                                alt: `:${m[2]}:`,
                                className: ["emoji"],
                                loading: "lazy",
                                decoding: "async",
                            },
                            children: [],
                        },
                );

                last = m.index + full.length;
            }

            if (parts.length === 0) return; // 命中过但全是未知短代码

            if (last < node.value.length) {
                parts.push({ type: "text", value: node.value.slice(last) });
            }

            parent.children.splice(index, 1, ...parts);
            return index + parts.length; // 跳过新插入的节点，避免重复访问
        });
    };
}
