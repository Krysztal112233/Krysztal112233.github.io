import fs from "node:fs";
import path from "node:path";

import { command, option, positional, run } from "cmd-ts";
import { format } from "date-fns";
import { Templates } from "./utils/templates.ts";

const newCommand = command({
    name: "new",
    description: "Create new post",
    args: {
        title: positional({
            displayName: "title",
            description: "Post title",
        }),
        template: option({
            long: "template",
            short: "t",
            description: "Which template you wanna use",
            defaultValue: () => "default",
        }),
    },
    handler: ({ title, template }) => {
        const templates = new Templates("./templates");
        const content = templates.createFromTemplate(template, {
            title,
            date: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        });

        const articleDir = path.join("./src/content/posts", title);
        const filePath = path.join(articleDir, "index.md");

        if (!fs.existsSync(articleDir)) {
            fs.mkdirSync(articleDir, { recursive: true });
        }

        fs.writeFileSync(filePath, content, "utf-8");
        console.log(`✓ Created posts ${filePath} using ${template}`);
    },
});

run(newCommand, process.argv.slice(2));
