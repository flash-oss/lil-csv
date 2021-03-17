import { parse, generate } from "../src/lil-csv";

const assert = require("assert");

describe("parse", () => {
    it("should parse objects", () => {
        const text = `Column,Second Column,else\rhere, we go ,false\r\n"with,comma","with \\" escaped quotes",123\n"",empty,
`;
        const rows = parse(text);
        assert.deepStrictEqual(rows, [
            { Column: "here", "Second Column": " we go ", else: "false" },
            { Column: "with,comma", "Second Column": 'with " escaped quotes', else: "123" },
            { Column: "", "Second Column": "empty", else: "" },
        ]);
    });

    it("should parse objects and rename headers", () => {
        const text = `Column,Second Column,else\rhere, we go ,false\r\n"with,comma","with \\" escaped quotes",123\n"",empty,
`;
        const rows = parse(text, {
            header: { Column: true, "Second Column": { jsonName: "Column2" }, else: "Column3" },
        });
        assert.deepStrictEqual(rows, [
            { Column: "here", Column2: " we go ", Column3: "false" },
            { Column: "with,comma", Column2: 'with " escaped quotes', Column3: "123" },
            { Column: "", Column2: "empty", Column3: "" },
        ]);
    });

    it("should parse objects and rename headers deeply", () => {
        const text = `Column,Second Column,else\rhere, we go ,false\r\n"with,comma","with \\" escaped quotes",123\n"",empty,
`;
        const rows = parse(text, {
            header: {
                Column: true,
                "Second Column": { jsonName: "deep.Column2" },
                else: "deep.veryDeep.Column3",
            },
        });
        assert.deepStrictEqual(rows, [
            {
                Column: "here",
                deep: {
                    Column2: " we go ",
                    veryDeep: {
                        Column3: "false",
                    },
                },
            },
            {
                Column: "with,comma",
                deep: {
                    Column2: 'with " escaped quotes',
                    veryDeep: {
                        Column3: "123",
                    },
                },
            },
            {
                Column: "",
                deep: {
                    Column2: "empty",
                    veryDeep: {
                        Column3: "",
                    },
                },
            },
        ]);
    });

    it("should parse without header", () => {
        const text = `Column,Second Column,else\rhere, we go ,false\r\n"with,comma","with \\" escaped quotes",123\n"",empty,
`;
        const rows = parse(text, { header: false });
        assert.deepStrictEqual(rows, [
            ["Column", "Second Column", "else"],
            ["here", " we go ", "false"],
            ["with,comma", 'with " escaped quotes', "123"],
            ["", "empty", ""],
        ]);
    });

    it("should parse funky data", () => {
        const text = `"Column","Second" Column,Third "Column",Middle "quotes" column`;
        const rows = parse(text, { header: false });
        assert.deepStrictEqual(rows, [["Column", "Second Column", `Third Column`, `Middle quotes column`]]);
    });

    it("should parse headers", () => {
        const text = `skip me,asIs,stringColumn,boolean column, number column \r\nskipping this data,"as is",bla bla,false,123.123
`;
        const rows = parse(text, {
            header: {
                asIs: true,
                stringColumn: String,
                "boolean column": { parse: (v) => Boolean(v && v !== "false"), jsonName: "booleanColumn" },
                " number column ": { parse: (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : "") },
            },
        });
        assert.deepStrictEqual(rows, [
            { asIs: "as is", stringColumn: "bla bla", booleanColumn: false, " number column ": 123.123 },
        ]);
    });

    it("should parse auto headers", () => {
        const text = `asIs,stringColumn,boolean column, number column \r\n"as is",bla bla,false,123.123
`;
        const rows = parse(text, {
            header: true,
        });
        assert.deepStrictEqual(rows, [
            { asIs: "as is", stringColumn: "bla bla", "boolean column": "false", " number column ": "123.123" },
        ]);
    });

    it("should throw if data has same headers", () => {
        const text = `col1,col2,col1\r\nbla bla,false,123.123
`;
        assert.throws(
            () => parse(text, { header: true }),
            (err) => err.message === "Can't parse CSV as data. Some headers have same name."
        );
    });
});

describe("generate", () => {
    it("should generate and parse back", () => {
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

    it("should generate with header", () => {
        const rows = generate(
            [
                ["here", " we go ", "false"],
                ["with,comma", 'with " escaped quotes', "123"],
                ["", "empty", ""],
            ],
            { header: [`Column`, `Second Column`, `else`] }
        );
        assert.deepStrictEqual(
            rows,
            `Column,Second Column,else
here, we go ,false
"with,comma",with \\" escaped quotes,123
,empty,`
        );
    });

    it("should auto format some primitives", () => {
        const rows = generate([[new Date("2020-12-12"), 123.123, false]], {
            header: [`Column`, `Second Column`, `else`],
        });
        assert.deepStrictEqual(
            rows,
            `Column,Second Column,else
2020-12-12T00:00:00.000Z,123.123,false`
        );
    });

    it("should ignore bad data", () => {
        const rows = generate([[null, undefined, {}, [], () => {}, NaN, "", new Map(), new Set()]]);
        assert.deepStrictEqual(rows, `,,,,,,,,`);
    });
});

describe("generate + parse", () => {
    it("should work on fully customised options", () => {
        const text = generate(
            [
                ["my str", -123.123, false, new Date("2020-12-12"), "1999-09-09", {}, "whatever", ""],
                [-1, "not number", "False", new Date("invalid date"), "bad DOB", [], "whatever", ""],
            ],
            {
                header: [`A string`, `num`, `bool`, `date`, `date of birth`, `bad data`, `skip this`, `skip this too`],
            }
        );
        const data = parse(text, {
            header: {
                "A string": { jsonName: "stringX" },
                num: { jsonName: "numberX", parse: (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : "") },
                bool: { jsonName: "booleanX", parse: (v) => Boolean(v && v !== "false") },
                date: { jsonName: "dateX", parse: (v) => (isNaN(new Date(v).valueOf()) ? "" : new Date(v)) },
                "date of birth": {
                    jsonName: "DOB",
                    parse: (v) => (isNaN(new Date(v).valueOf()) ? "" : new Date(v).toISOString().substr(0, 10)),
                },
                "bad data": { jsonName: "badData" },
                "skip this": false,
            },
        });
        assert.deepStrictEqual(data, [
            {
                stringX: "my str",
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
