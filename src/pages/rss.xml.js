import rss from "@astrojs/rss";
import { getConfig } from "../config";
import { getCollection } from "astro:content";

export async function GET(context) {
    const {
        site: { description, title, site },
    } = await getConfig();

    const posts = await getCollection("posts");

    return rss({
        title: title,
        description: description,
        site: context.site,
        items: posts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.date,
            link: `${site}/${post.collection}/${post.slug}`,
        })),
    });
}
