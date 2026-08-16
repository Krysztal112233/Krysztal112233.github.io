import type { CollectionEntry } from "astro:content";

export type GrowingEntry = CollectionEntry<"growing">;

export interface GrowingLog {
    entry: GrowingEntry;
    date: Date;
    /** yyyy-MM-dd, used as section anchor id and RSS fragment */
    dateSlug: string;
}

export interface Plant {
    /** First path segment of the entry id, used as URL slug */
    slug: string;
    /** From about.md frontmatter title, falls back to slug */
    title: string;
    about?: GrowingEntry;
    /** The part of about.md below `<!-- more -->`, rendered collapsed */
    aboutDetail?: GrowingEntry;
    /** Sorted ascending by date */
    logs: GrowingLog[];
    startDate?: Date;
    lastLogDate?: Date;
}

const ABOUT_DETAIL_SUFFIX = "/about__detail";

export function isAboutEntry(entry: GrowingEntry): boolean {
    return entry.id.endsWith("/about");
}

export function isAboutDetailEntry(entry: GrowingEntry): boolean {
    return entry.id.endsWith(ABOUT_DETAIL_SUFFIX);
}

function plantSlugOf(entry: GrowingEntry): string {
    return entry.id.split("/")[0];
}

const DATE_FOLDER_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

export function formatDateSlug(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Groups growing-log entries by plant folder. Draft entries are excluded.
 * Plants are sorted by latest log date descending (plants without logs last).
 */
export function groupPlants(entries: GrowingEntry[]): Plant[] {
    const plants = new Map<string, Plant>();

    for (const entry of entries) {
        if (entry.data.draft) {
            continue;
        }

        const slug = plantSlugOf(entry);
        let plant = plants.get(slug);
        if (!plant) {
            plant = { slug, title: slug, logs: [] };
            plants.set(slug, plant);
        }

        if (isAboutEntry(entry)) {
            plant.about = entry;
            plant.title = entry.data.title ?? slug;
            plant.startDate = entry.data.date;
            continue;
        }

        if (isAboutDetailEntry(entry)) {
            plant.aboutDetail = entry;
            continue;
        }

        const folderSegment = entry.id.split("/")[1] ?? "";
        const folderDate = DATE_FOLDER_REGEX.test(folderSegment)
            ? folderSegment
            : undefined;
        const date =
            entry.data.date ??
            (folderDate ? new Date(`${folderDate}T00:00:00`) : undefined);
        if (!date) {
            continue;
        }

        plant.logs.push({
            entry,
            date,
            dateSlug: folderDate ?? formatDateSlug(date),
        });
    }

    const result = [...plants.values()];
    for (const plant of result) {
        plant.logs.sort((a, b) => a.date.getTime() - b.date.getTime());
        plant.lastLogDate = plant.logs.at(-1)?.date;
    }
    result.sort(
        (a, b) =>
            (b.lastLogDate?.getTime() ?? 0) - (a.lastLogDate?.getTime() ?? 0),
    );
    return result;
}
