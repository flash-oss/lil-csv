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
                    jsonName: "dob",
                    parse: (v) => (isNaN(new Date(v).valueOf()) ? null : v),
                },
                "address.street": String,
                "address.country": {
                    jsonName: "country",
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
                    jsonName: "date of birth",
                    stringify: (v) => (!v || isNaN(new Date(v).valueOf()) ? "N/A" : v),
                },
                "address.street": String,
                country: {
                    jsonName: "address.country",
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
});
