import { generate, parse } from "../src/lil-csv";
const assert = require("assert");

describe("generate", () => {
    it("should generate objects", () => {
        const text = generate([
            { foo: 1, bar: "baz" },
            { foo: 2, bar: "too" },
        ]);
        assert.deepStrictEqual(
            text,
            `foo,bar
1,baz
2,too`
        );
    });

    it("should generate with header", () => {
        const text = generate(
            [
                ["here", " we go ", "false"],
                ["with,comma", 'with " escaped quotes', "123"],
                ["", "empty", ""],
            ],
            { header: [`Column`, `Second Column`, `else`] }
        );
        assert.deepStrictEqual(
            text,
            `Column,Second Column,else
here, we go ,false
"with,comma",with \\" escaped quotes,123
,empty,`
        );
    });

    it("should auto format some primitives", () => {
        const text = generate([[new Date("2020-12-12"), 123.123, false]], {
            header: [`Column`, `Second Column`, `else`],
        });
        assert.deepStrictEqual(
            text,
            `Column,Second Column,else
2020-12-12T00:00:00.000Z,123.123,false`
        );
    });

    it("should generate from deep objects", () => {
        const text = generate([{ foo: { deep: { deeper: 1 } }, bar: { deep: 2, deep2: { more: 3 } } }]);
        assert.deepStrictEqual(
            text,
            `foo.deep.deeper,bar.deep,bar.deep2.more
1,2,3`
        );
    });

    it("should generate from deep objects and rename headers", () => {
        const rows = [
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
        ];
        const text = generate(rows, {
            header: {
                Column: true,
                "deep.Column2": "Second Column",
                "deep.veryDeep.Column3": "else",
            },
        });
        assert.deepStrictEqual(
            text,
            `Column,Second Column,else
here, we go ,false
"with,comma",with \\" escaped quotes,123
,empty,`
        );
    });

    it("should ignore bad data", () => {
        const text = generate([[null, undefined, {}, [], () => {}, NaN, "", new Map(), new Set()]], { header: false });
        assert.deepStrictEqual(text, `,,,,,,,,`);
    });

    it("should throw when can't auto detect header", () => {
        assert.throws(
            () => generate([null]),
            (err) => err.message === "Can't auto detect header from rows"
        );
    });

    it("should throw if rows are unprocessable", () => {
        assert.throws(
            () => generate([{}]),
            (err) => err.message === "Bad header and rows"
        );
    });

    it("should use '*' column header as 'default' stringify function", () => {
        const rows = [
            { firstName: "John", lastName: "Smith", dob: "1999-01-15T00:00:00.000Z", price: 123.0, completed: true },
            { firstName: "Alice", lastName: "Dwarf", dob: "1991-11-24T00:00:00.000Z", price: 123.0, completed: false },
        ];
        const text = generate(rows, {
            header: {
                "*": String,
                dob: (v) => (v ? new Date(v).toISOString().substr(0, 10) : ""),
                price: (v) => (isNaN(v) ? "" : Number(v).toFixed(2)),
                completed: (v) => (v ? "Y" : "N"),
            },
        });
        assert.deepStrictEqual(
            text,
            `firstName,lastName,dob,price,completed
John,Smith,1999-01-15,123.00,Y
Alice,Dwarf,1991-11-24,123.00,N`
        );
    });
});
