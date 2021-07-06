import { parse } from "../src/lil-csv";
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

    it("should parse objects when header is array of strings", () => {
        const text = `Column,Second Column,else\rhere, we go ,false\r\n"with,comma","with \\" escaped quotes",123\n"",empty,
`;
        const rows = parse(text, {
            header: ["col1", "col2", "else0"],
        });
        assert.deepStrictEqual(rows, [
            { col1: "here", col2: " we go ", else0: "false" },
            { col1: "with,comma", col2: 'with " escaped quotes', else0: "123" },
            { col1: "", col2: "empty", else0: "" },
        ]);
    });

    it("should parse objects and rename headers", () => {
        const text = `Column,Second Column,else\rhere, we go ,false\r\n"with,comma","with \\" escaped quotes",123\n"",empty,
`;
        const rows = parse(text, {
            header: { Column: true, "Second Column": { newName: "Column2" }, else: "Column3" },
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
                "Second Column": { newName: "deep.Column2" },
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
        const text = `missing data,skip me,asIs,stringColumn,boolean column, number column \r\n,skipping this data,"as is",bla bla,false,123.123
`;
        const rows = parse(text, {
            header: {
                asIs: true,
                stringColumn: String,
                "boolean column": { parse: (v) => Boolean(v && v !== "false"), newName: "booleanColumn" },
                " number column ": (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : ""),
                "missing data": (v) => v || undefined,
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

    it("should use '*' column header as 'default' parsing function", () => {
        const text = `asIs,stringColumn,boolean column, number column \r\n"as is",bla bla,false,123.123
`;
        const rows = parse(text, {
            header: {
                "*": String,
                "boolean column": (v) => v !== "false",
            },
        });
        assert.deepStrictEqual(rows, [
            { asIs: "as is", stringColumn: "bla bla", "boolean column": false, " number column ": "123.123" },
        ]);
    });
});
