import fs from "node:fs";
import path from "node:path";

import Handlebars from "handlebars";

export class Templates {
    templates: Map<string, string> = new Map();

    constructor(searchPath: string) {
        const files = fs
            .readdirSync(searchPath)
            .filter((it) => it.endsWith(".md"));

        files.forEach((templatePath) => {
            const fullPath = path.join(searchPath, templatePath);
            const templateContent = fs.readFileSync(fullPath);
            const templateName = path.basename(templatePath, ".md");

            this.templates.set(templateName, templateContent.toString());
        });
    }

    // biome-ignore lint/suspicious/noExplicitAny: true
    createFromTemplate(name?: string, inject?: { [key: string]: any }): string {
        const templateName = name ?? "default";
        const templateContent = this.templates.get(templateName);

        if (templateContent === undefined) {
            throw new Error(`Cannot find template ${templateName}`);
        }

        if (inject !== undefined) {
            const compiled = Handlebars.compile(templateContent);
            return compiled(inject);
        }

        return templateContent;
    }
}
