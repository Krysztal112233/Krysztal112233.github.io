import { visit } from "unist-util-visit";

const isWhitespace = (node) =>
    node.type === "text" && /^\s*$/.test(node.value);

const meaningful = (children = []) => children.filter((c) => !isWhitespace(c));

// 提取 li 中唯一的图片节点（允许图片被 p 包裹），否则返回 null
const soleImage = (li) => {
    const content = meaningful(li.children);
    if (content.length !== 1) return null;
    let el = content[0];
    if (el.tagName === "p") {
        const inner = meaningful(el.children);
        if (inner.length !== 1) return null;
        el = inner[0];
    }
    return el.tagName === "img" ? el : null;
};

/**
 * 将「每个列表项只含一张图片」的 ul 转换为宝丽来照片堆：
 * ul 加上 .photo-stack，每张图包进 figure，alt 文本作为 figcaption。
 */
export function rehypePhotoStack() {
    return (tree) => {
        visit(tree, "element", (node) => {
            if (node.tagName !== "ul" || !node.children) return;

            const items = meaningful(node.children);
            if (items.length < 2 || !items.every((c) => c.tagName === "li"))
                return;

            const images = items.map(soleImage);
            if (images.some((img) => img === null)) return;

            node.properties = {
                ...node.properties,
                className: ["photo-stack"],
            };

            items.forEach((li, i) => {
                const img = images[i];
                const alt = img.properties?.alt ?? "";
                li.children = [
                    {
                        type: "element",
                        tagName: "figure",
                        properties: {},
                        children: [
                            img,
                            ...(alt
                                ? [
                                      {
                                          type: "element",
                                          tagName: "figcaption",
                                          properties: {},
                                          children: [
                                              { type: "text", value: alt },
                                          ],
                                      },
                                  ]
                                : []),
                        ],
                    },
                ];
            });
        });
    };
}
