const assert = require("assert");

import { parse, generate } from "../src/lil-csv";

describe("examples", () => {
    it("Parse to objects", () => {
        const text = `name,address.street,address.country
John Noa,"7 Blue Bay, Berala",AU`;

        const rows = parse(text);

        assert.deepStrictEqual(rows, [
            {
                name: "John Noa",
                address: {
                    street: "7 Blue Bay, Berala",
                    country: "AU",
                },
            },
        ]);
    });

    it("Generate from objects", () => {
        const rows = [
            {
                name: "John Noa",
                address: {
                    street: "7 Blue Bay, Berala",
                    country: "AU",
                },
            },
        ];

        const text = generate(rows);

        assert.deepStrictEqual(
            text,
            `name,address.street,address.country
John Noa,"7 Blue Bay, Berala",AU`
        );
    });

    it("Parse to arrays", () => {
        const text = `name,address.street,address.country
John Noa,"7 Blue Bay, Berala",AU`;

        const rows = parse(text, { header: false });

        assert.deepStrictEqual(rows, [
            ["name", "address.street", "address.country"],
            ["John Noa", "7 Blue Bay, Berala", "AU"],
        ]);
    });

    it("Generate from arrays", () => {
        const rows = [
            ["name", "address.street", "address.country"],
            ["John Noa", "7 Blue Bay, Berala", "AU"],
        ];

        const text = generate(rows, { header: false });

        assert.deepStrictEqual(
            text,
            `name,address.street,address.country
John Noa,"7 Blue Bay, Berala",AU`
        );
    });

    it("Parse to custom objects", () => {
        const countryLookup = { PH: "Philippines", AU: "Australia" };

        const text = `name,date of birth,address.street,address.country,address.postcode
John Noa,N/A,"7 Blue Bay, Berala",AU,N/A
Lily Noa,1992-12-26,"7 Blue Bay, Berala",AU,2222`;

        const rows = parse(text, {
            header: {
                name: "fullName",
                "date of birth": {
                    newName: "dob",
                    parse: (v) => (isNaN(new Date(v).valueOf()) ? null : v),
                },
                "address.street": String,
                "address.country": {
                    newName: "country",
                    parse: (v) => countryLookup[v.toUpperCase()] || null,
                },
                "address.postcode": (v) => (v && v.match && v.match(/^\d{4}$/) ? v : null),
            },
        });

        assert.deepStrictEqual(rows, [
            {
                fullName: "John Noa",
                dob: null,
                address: {
                    street: "7 Blue Bay, Berala",
                    postcode: null,
                },
                country: "Australia",
            },
            {
                fullName: "Lily Noa",
                dob: "1992-12-26",
                address: {
                    street: "7 Blue Bay, Berala",
                    postcode: "2222",
                },
                country: "Australia",
            },
        ]);
    });

    it("Generate from custom objects", () => {
        const countryReverseLookup = { PHILIPPINES: "PH", AUSTRALIA: "AU" };

        const rows = [
            {
                fullName: "John Noa",
                dob: null,
                address: {
                    street: "7 Blue Bay, Berala",
                    postcode: null,
                },
                country: "Australia",
            },
            {
                fullName: "Lily Noa",
                dob: "1992-12-26",
                address: {
                    street: "7 Blue Bay, Berala",
                    postcode: "2222",
                },
                country: "Australia",
            },
        ];

        const text = generate(rows, {
            header: {
                fullName: "name",
                dob: {
                    newName: "date of birth",
                    stringify: (v) => (!v || isNaN(new Date(v).valueOf()) ? "N/A" : v),
                },
                "address.street": String,
                country: {
                    newName: "address.country",
                    stringify: (v) => countryReverseLookup[v.toUpperCase()] || "N/A",
                },
                "address.postcode": (v) => (v && v.match && v.match(/^\d{4}$/) ? v : "N/A"),
            },
        });

        assert.deepStrictEqual(
            text,
            `name,date of birth,address.street,address.country,address.postcode
John Noa,N/A,"7 Blue Bay, Berala",AU,N/A
Lily Noa,1992-12-26,"7 Blue Bay, Berala",AU,2222`
        );
    });

    it("Parse with data type conversion", () => {
        const text = `name,isCompany,createdAt,balance
John Noa,false,2021-03-18T03:38:12.641Z,9000.12
Acme Inc,true,2021-11-22,1000150.10`;

        const rows = parse(text, {
            header: {
                name: String,
                isCompany: (v) => v !== "false",
                createdAt: (v) => new Date(v),
                balance: Number,
            },
        });

        assert.deepStrictEqual(rows, [
            {
                name: "John Noa",
                isCompany: false,
                createdAt: new Date("2021-03-18T03:38:12.641Z"),
                balance: 9000.12,
            },
            {
                name: "Acme Inc",
                isCompany: true,
                createdAt: new Date("2021-11-22"),
                balance: 1000150.1,
            },
        ]);
    });

    it("Generate with data type conversion", () => {
        const rows = [
            {
                name: "John Noa",
                isCompany: false,
                createdAt: new Date("2021-03-18T03:38:12.641Z"),
                balance: 9000.12,
            },
            {
                name: "Acme Inc",
                isCompany: true,
                createdAt: new Date("2021-11-22"),
                balance: 1000150.1,
            },
        ];

        const text = generate(rows, {
            header: {
                name: String,
                isCompany: String,
                createdAt: (v, entry) => new Date(v).toISOString().substr(0, entry.isCompany ? 10 : 100),
                balance: (v) => v.toFixed(2),
            },
        });

        assert.deepStrictEqual(
            text,
            `name,isCompany,createdAt,balance
John Noa,false,2021-03-18T03:38:12.641Z,9000.12
Acme Inc,true,2021-11-22,1000150.10`
        );
    });
});
