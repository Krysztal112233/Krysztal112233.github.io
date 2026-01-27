import TOML from "smol-toml";

import fs from "node:fs/promises";

export interface SiteConfig {
    title: string;
    description: string;
    slogan: string;
}

export interface LinkConfig {
    image: string;
    intro: string;
    link: string;
    title: string;
}

export interface Config {
    site: SiteConfig;
    links: LinkConfig[];
}

export async function getConfig(): Promise<Config> {
    const data = await fs.readFile("./src/config.toml");

    const config = data.toString();

    return TOML.parse(config) as any as Config;
}
