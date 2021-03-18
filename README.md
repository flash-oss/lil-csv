# lil-csv

Mini 1k module for CSV file manipulations

- Parse CSV text to deep JSON objects.
- Customise each column parsing with your code.
- Serialise deep JSON objects to CSV.
- Rename CSV headers and object keys on the fly.
- Simply generate CSV from arrays of strings.
- Parse CSV to simple arrays of strings.

## Usage

```shell
npm i lil-csv
```

Import

```js
import { parse, generate } from "lil-csv";
// or
const { parse, generate } = require("lil-csv");
```

### Examples

#### Objects

Parse to object

```js
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
```

Generate CSV from objects

```js
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
```

#### Arrays

Parse to arrays

```js
const text = `name,address.street,address.country
John Noa,"7 Blue Bay, Berala",AU`;

const rows = parse(text, { header: false });

assert.deepStrictEqual(rows, [
  ["name", "address.street", "address.country"],
  ["John Noa", "7 Blue Bay, Berala", "AU"],
]);
```

Generate CSV from arrays

```js
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
```

#### Customise parsed objects

Rename columns, custom parse data:

```js
const countryLookup = { PH: "Philippines", AU: "Australia" };

const text = `name,date of birth,address.street,address.country,address.postcode
John Noa,N/A,"7 Blue Bay, Berala",AU,XXXX
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
```

#### Customise CSV generation

Rename columns, custom stringify data:

```js
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
```

Process rows to JSON objects:

```js
import { parse } from "lil-csv";

const text = `Implicit skip,Explicit skip,As is,Definitelly a string,rename me,a Boolean,a date,dob,And a Number
skipping this cell,skipping this one as well,as is data,"data, with, commas",renamed column data,false,2020-12-12T23:59:59Z,1999-09-09,123.123`;

const rows = parse(text, {
  headers: {
    "Explicit skip": false,
    "As is": true,
    "Definitelly a string": String,
    "rename me": { jsonName: "newName" },
    "a Boolean": { parse: (v) => Boolean(v && v !== "false") },
    "a date": {
      parse: (v) => (isNaN(new Date(v).valueOf()) ? "" : new Date(v)),
      jsonName: "date",
    },
    dob: {
      parse: (v) =>
        isNaN(new Date(v).valueOf())
          ? ""
          : new Date(v).toISOString().substr(0, 10),
    },
    "And a Number": {
      parse: (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : ""),
    },
  },
});

console.log(rows);
// [
//     {
//         'As is': 'as is data',
//         'Definitelly a string': 'data, with, commas',
//         newName: 'renamed column data',
//         'a Boolean': false,
//         date: [Date: 2020-12-12T23:59:59.000Z],
//         dob: "1999-09-09",
//         'And a Number': 123.123
//     }
// ]
```

### Generate CSV

Simple string without a header:

```js
import { generate } from "lil-csv";

const data = [
  ["Column 1", "Some,other", "Boolean"],
  ["text data", "data, with, commas", "false"],
];
const text = generate({ rows: data });
console.log(text);
// Column 1,"Some,other",Boolean
// text data,"data, with, commas",false
```

Complex data with a header:

```js
import { generate } from "lil-csv";

const text = generate({
  header: [`A string`, `num`, `bool`, `date`, `date of birth`, `bad data`],
  rows: [
    ["my str", 123.123, false, new Date("2020-12-12"), "1999-09-09", {}],
    [-1, "not number", "False", new Date("invalid date"), "bad DOB", []],
  ],
});

console.log(text);
// A string,num,bool,date,date of birth,bad data
// my str,123.123,false,2020-12-12T00:00:00.000Z,1999-09-09,
// -1,not number,False,,bad DOB,
```

## API

### `parse(text, [options = { header: true, escapeChar: "\\" }])`

- `text` - String, the string to parse.
- `options` - Object, optional parsing options.
  - `options.escapeChar` - String character, the escape character used within that CSV.
  - `options.header` - Boolean, or Array of string, or Object. Default is `true`.
    - Boolean
      - `true` - create JSON objects from CSV rows. Assume first row of the text is a header, would be used as object keys.
      - `false` - create string arrays from CSV rows.
    - Array - create JSON objects from CSV rows. The array would be used as object keys.
    - Object - create JSON objects from CSV rows. Object keys - CSV header name, Object values - either string or Object.
      - value is String - rename CSV header. E.g. `"User First Name": "user.firstName"`
      - `header[].parse` - use this function to deserialize a CSV cell to a value. E.g. convert "2020-12-12" string to a Date.
      - `header[].jsonName` - rename CSV header. E.g. `jsonName: "user.firstName"`
