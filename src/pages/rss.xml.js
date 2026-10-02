import rss from "@astrojs/rss";
import { getConfig } from "../config";
import { getPostSummary } from "../utils/postSummary";
import { getPublishedPosts } from "../utils/posts";

export async function GET(context) {
    const {
        site: { description, title, site },
    } = await getConfig();

    const posts = await getPublishedPosts();

    return rss({
        title: title,
        description: description,
        site: context.site,
        items: posts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.date,
            link: `${site}/${post.collection}/${post.id}`,
            description: getPostSummary(post),
        })),
    });
}
