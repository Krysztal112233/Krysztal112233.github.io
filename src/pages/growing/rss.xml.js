import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import { getConfig } from "../../config";
import { groupPlants } from "../../utils/growingLog";
import { getSummaryFromBody } from "../../utils/postSummary";

export async function GET(context) {
    const {
        site: { description, title, site },
    } = await getConfig();

    const entries = await getCollection("growing");
    const plants = groupPlants(entries);

    const items = plants.flatMap((plant) =>
        plant.logs.map((log) => ({
            title: `${plant.title} · ${log.dateSlug}`,
            pubDate: log.date,
            link: `${site}/growing/${plant.slug}/#${log.dateSlug}`,
            description: getSummaryFromBody(log.entry.body),
        })),
    );

    return rss({
        title: `${title} · 种植日志`,
        description: description,
        site: context.site,
        items,
    });
}
