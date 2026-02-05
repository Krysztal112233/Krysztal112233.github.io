import Matter from "gray-matter";

export class Document {
    content: string;
    // biome-ignore lint/suspicious/noExplicitAny: true
    private _data: { [key: string]: any };

    public set data(value: { [key: string]: any }) {
        this._data = value;
    }

    public get data(): { [key: string]: any } {
        return this._data;
    }

    constructor(documentPath: string) {
        const { content, data } = Matter.read(documentPath);

        this.content = content;
        this._data = data;
    }

    toMarkdown(): string {
        return Matter.stringify({ content: this.content }, this.data);
    }
}
