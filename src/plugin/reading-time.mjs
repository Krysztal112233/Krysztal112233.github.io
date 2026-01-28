import MDAST from "mdast-util-to-string";

import getReadingTime from "reading-time";

export function remarkReadingTime() {
    return (tree, { data }) => {
        const textOnPage = MDAST.toString(tree);
        const readingTime = getReadingTime(textOnPage);

        data.astro.frontmatter.minutesRead = readingTime.text;
    };
}
