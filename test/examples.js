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

describe("real world data", () => {
    it("should parse and generate back and forth", () => {
        const parseNumber = (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
        const parseDate = (v) => (isNaN(new Date(v).valueOf()) ? undefined : new Date(v).toISOString().substr(0, 10));
        // const parseDateTime = (v) => (isNaN(new Date(v).valueOf()) ? "" : new Date(v));
        const parseBoolean = (v) => Boolean(v && v !== "false");
        const stringifyMoney = (v) => v && v.toFixed && v.toFixed(2);

        const header = [
            { text: "Amount", value: "amount", parse: parseNumber, stringify: stringifyMoney },
            { text: "Ext. ID", value: "externalId" },
            { text: "Ext. Ref.", value: "externalReference" },

            { text: "Sender is company", value: "sender.isCompany", parse: parseBoolean },
            { text: "Sender First name", value: "sender.firstName" },
            { text: "Sender Middle name", value: "sender.middleName" },
            { text: "Sender Last name", value: "sender.lastName" },
            { text: "Sender Company name", value: "sender.companyName" },
            { text: "Sender DOB", value: "sender.dob", parse: parseDate },
            { text: "Sender Email", value: "sender.email" },
            { text: "Sender Mobile", value: "sender.mobile" },

            { text: "Sender Country", value: "sender.address.country" },
            { text: "Sender Building", value: "sender.address.building" },
            { text: "Sender Street", value: "sender.address.street" },
            { text: "Sender Suburb", value: "sender.address.suburb" },
            { text: "Sender State", value: "sender.address.state" },
            { text: "Sender Post code", value: "sender.address.postcode" },

            { text: "Recipient Acc#", value: "recipient.accountNo" },
            { text: "Recipient BSB", value: "recipient.bsb" },
            { text: "Recipient is company", value: "recipient.isCompany", parse: parseBoolean },
            { text: "Recipient First name", value: "recipient.firstName" },
            { text: "Recipient Middle name", value: "recipient.middleName" },
            { text: "Recipient Last name", value: "recipient.lastName" },
            { text: "Recipient Company name", value: "recipient.companyName" },
            { text: "Recipient Email", value: "recipient.email" },
            { text: "Recipient Mobile", value: "recipient.mobile" },

            { text: "Recipient Country", value: "recipient.address.country" },
            { text: "Recipient Building", value: "recipient.address.building" },
            { text: "Recipient Street", value: "recipient.address.street" },
            { text: "Recipient Suburb", value: "recipient.address.suburb" },
            { text: "Recipient State", value: "recipient.address.state" },
            { text: "Recipient Post code", value: "recipient.address.postcode" },
        ];

        const exampleRows = [
            {
                amount: 1,
                externalId: "abc_222",
                externalReference: "INV #000123",
                sender: {
                    address: {
                        country: "UK",
                        street: "10 Downing St",
                        suburb: "LONDON",
                        postcode: "SW1A 2AA",
                    },
                    isCompany: true,
                    companyName: "ACME UK LTD",
                    email: "andysender@example.com",
                    mobile: "+44 7911123456",
                },
                recipient: {
                    address: {
                        country: "AU",
                        building: "",
                        street: "Apt 11/20 Bligh St",
                        suburb: "Sydney",
                        state: "NSW",
                        postcode: "2000",
                    },
                    bsb: "032085",
                    accountNo: "505273",
                    isCompany: true,
                    companyName: "Acme Pty Ltd",
                    mobile: "+61 422334455",
                    email: "nicrecipient@example.com",
                },
            },
            {
                amount: 1.51,
                sender: {
                    address: {
                        country: "AU",
                        building: "",
                        street: "47 Wesley St",
                        suburb: "Eleanora Heights",
                        state: "NSW",
                        postcode: "2101",
                    },
                    isCompany: false,
                    firstName: "Mick",
                    lastName: "Dundee",
                    dob: "1999-12-12",
                    email: "bobsender@example.com",
                },
                recipient: {
                    address: {
                        country: "AU",
                        street: "Apt 12/33 Ultimo St",
                        suburb: "Sydney",
                        state: "NSW",
                        postcode: "2000",
                    },
                    bsb: "083092",
                    accountNo: "188101982",
                    isCompany: false,
                    firstName: "Helen",
                    middleName: "Andrew",
                    lastName: "Johnson",
                    mobile: "+61 400334400",
                    email: "helenrecipient@example.com",
                },
            },
        ];

        const generatingHeader = header.reduce(
            (result, { text, value, stringify }) => Object.assign(result, { [value]: { newName: text, stringify } }),
            {}
        );
        const generated = generate(exampleRows, { header: generatingHeader });

        const parsingHeader = header.reduce(
            (result, { text, value, parse }) => Object.assign(result, { [text]: { newName: value, parse } }),
            {}
        );
        const parsed = parse(generated, { header: parsingHeader });

        const generated2 = generate(parsed, { header: generatingHeader });

        assert.strictEqual(generated2, generated);
    });
});
