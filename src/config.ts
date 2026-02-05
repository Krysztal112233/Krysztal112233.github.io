import TOML from "smol-toml";

import fs from "node:fs/promises";

export interface SiteConfig {
    site: string;
    title: string;
    description: string;
    slogan: string;
    author?: string;
}

export interface LinkConfig {
    image: string;
    intro: string;
    link: string;
    title: string;
}

export interface NaviConfig {
    icon: string;
    href: string;
    label?: string;
}

export interface Config {
    site: SiteConfig;
    links: LinkConfig[];
    navi: NaviConfig[];
}

export async function getConfig(): Promise<Config> {
    const data = await fs.readFile("./src/config.toml");

    const config = data.toString();

    return TOML.parse(config) as object as Config;
}
