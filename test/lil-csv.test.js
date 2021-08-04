import { parse, generate } from "../src/lil-csv";
const assert = require("assert");

describe("generate + parse", () => {
    it("should generate and parse back arrays", () => {
        const rows = parse(
            generate([
                [`Column`, `Second Column`, `else`],
                ["here", " we go ", "false"],
                ["with,comma", 'with " escaped quotes', "123"],
                ["", "empty", ""],
            ]),
            { header: false }
        );
        assert.deepStrictEqual(rows, [
            [`Column`, `Second Column`, `else`],
            ["here", " we go ", "false"],
            ["with,comma", 'with " escaped quotes', "123"],
            ["", "empty", ""],
        ]);
    });

    it("should generate and parse back objects", () => {
        const rows = [
            { a: { deep: "X" }, b: "1" },
            { a: { deep: "Y" }, b: "2" },
        ];
        const rows2 = parse(generate(rows));
        assert.deepStrictEqual(rows2, rows);
    });

    it("should wrap strings", () => {
        const rows = [{ a: { deep: "X" }, b: `1,"bla",2` }];
        const text = generate(rows, { wrapStrings: true });
        assert.deepStrictEqual(
            text,
            `"a.deep","b"
"X","1,\\"bla\\",2"`
        );
        const rows2 = parse(generate(rows));
        assert.deepStrictEqual(rows2, rows);
    });

    it("should work on fully customised options", () => {
        const text = generate(
            [
                ["my ' \\' str", -123.123, false, new Date("2020-12-12"), "1999-09-09", {}, "whatever", ""],
                [-1, "not number", "False", new Date("invalid date"), "bad DOB", [], "whatever", ""],
            ],
            {
                delimiter: "\t",
                quoteChar: "'",
                escapeChar: "/",
                lineTerminator: "\r\n",
                header: [`A string`, `num`, `bool`, `date`, `date of birth`, `bad data`, `skip this`, `skip this too`],
            }
        );
        assert.strictEqual(
            text,
            `A string\tnum\tbool\tdate\tdate of birth\tbad data\tskip this\tskip this too\r\n` +
                `my /' \\/' str\t-123.123\tfalse\t2020-12-12T00:00:00.000Z\t1999-09-09\t\twhatever\t\r\n` +
                `-1\tnot number\tFalse\t\tbad DOB\t\twhatever\t`
        );

        const data = parse(text, {
            delimiter: "\t",
            quoteChar: "'",
            escapeChar: "/",
            header: {
                "A string": "stringX",
                num: { newName: "numberX", parse: (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : "") },
                bool: { newName: "booleanX", parse: (v) => Boolean(v && v !== "false") },
                date: { newName: "dateX", parse: (v) => (isNaN(new Date(v).valueOf()) ? "" : new Date(v)) },
                "date of birth": {
                    newName: "DOB",
                    parse: (v) => (isNaN(new Date(v).valueOf()) ? "" : new Date(v).toISOString().substr(0, 10)),
                },
                "bad data": { newName: "badData" },
                "skip this": false,
            },
        });
        assert.deepStrictEqual(data, [
            {
                stringX: "my ' \\' str",
                numberX: -123.123,
                booleanX: false,
                dateX: new Date("2020-12-12T00:00:00.000Z"),
                DOB: "1999-09-09",
                badData: "",
            },
            {
                stringX: "-1",
                numberX: "",
                booleanX: true,
                dateX: "",
                DOB: "",
                badData: "",
            },
        ]);
    });
});
