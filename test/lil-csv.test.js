const assert = require("assert");

const lilCsv = require("../src/lil-csv");

describe("parse", () => {
    it("should parse", () => {
        const text = `Column,Second Column,else\rhere, we go ,false\r\n"with,comma","with \\" escaped quotes",123\n"",empty,
`;
        const result = lilCsv.parse(text);
        assert.deepStrictEqual(result, [
            ["Column", "Second Column", "else"],
            ["here", " we go ", "false"],
            ["with,comma", 'with " escaped quotes', "123"],
            ["", "empty", ""],
        ]);
    });

    it("should parse funky data", () => {
        const text = `"Column","Second" Column,Third "Column",Middle "quotes" column`;
        const result = lilCsv.parse(text);
        assert.deepStrictEqual(result, [["Column", "Second Column", `Third Column`, `Middle quotes column`]]);
    });

    it("should parse headers", () => {
        const text = `skip me,asIs,stringColumn,boolean column, number column \r\nskipping this data,"as is",bla bla,false,123.123
`;
        const rows = lilCsv.parse(text, {
            headers: {
                asIs: true,
                stringColumn: String,
                "boolean column": { parse: (v) => Boolean(v && v !== "false"), jsonName: "booleanColumn" },
                " number column ": { parse: (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined) },
            },
        });
        assert.deepStrictEqual(rows, [
            { asIs: "as is", stringColumn: "bla bla", booleanColumn: false, " number column ": 123.123 },
        ]);
    });

    it("should throw if data has same headers", () => {
        const text = `col1,col2,col1\r\nbla bla,false,123.123
`;
        assert.throws(
            () => lilCsv.parse(text, { headers: true }),
            (err) => err.message === "Can't parse CSV as data. Some headers have same name."
        );
    });
});
