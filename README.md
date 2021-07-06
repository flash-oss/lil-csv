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
```

#### Customise data parsing

Parse each column differently:

```js
const text = `name,isCompany,createdAt,balance
John Noa,false,2021-03-18T03:38:12.641Z,9000.12
Acme Inc,true,2021-11-22,1000150.10`;

const rows = parse(text, {
  header: {
    "*": String, // Do not skip unknown headers, instead parse them as String
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
```

#### Customise data serialisation

Stringify each column differently:

```js
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
    createdAt: (v, entry) =>
      new Date(v).toISOString().substr(0, entry.isCompany ? 10 : 100),
    balance: (v) => v.toFixed(2),
  },
});

assert.deepStrictEqual(
  text,
  `name,isCompany,createdAt,balance
John Noa,false,2021-03-18T03:38:12.641Z,9000.12
Acme Inc,true,2021-11-22,1000150.10`
);
```

## API

### `parse(text, [options = { header: true, escapeChar: "\\" }])`

- `text` - String, the string to parse.
- `options` - Object, optional parsing settings.
  - `options.escapeChar` - String character, the escape character used within that CSV.
  - `options.header` - Boolean, or Array of string, or Object. Default is `true`.
    - Boolean
      - `true` - create JSON objects from CSV rows. Assume first row of the text is a header, would be used as object keys.
      - `false` - create string arrays from CSV rows.
    - Array - create JSON objects from CSV rows. The array would be used as object keys.
    - Object - create JSON objects from CSV rows.
      - Object keys - CSV header name, Object values - either string, of function, or Object.
      - value is String - rename CSV header. E.g. `"User First Name": "user.firstName"`
      - value is Function - use this function to deserialize a CSV cell to a value. E.g. convert "2020-12-12" string to a Date.
      - value is Object - setting for each column name.
        - `header[].parse` - use this function to deserialize a CSV cell to a value. E.g. convert "2020-12-12" string to a Date.
        - `header[].newName` - rename CSV header. E.g. `"User First Name": "user.firstName"`
      - key is `"*"`, value is used as a default column parser for unknown columns.

### `generate(rows, [options = { header: true, escapeChar: "\\", lineTerminator: "\n" }])`

- `rows` - array of arrays. The data to generate the CSV from. Each row must be euther array of object.
- `options` - Object, optional settings.
  - `options.escapeChar` - String character, the escape character used within that CSV.
  - `options.lineTerminator` - String character, the new line character used within that CSV.
  - `options.header` - Boolean, or Array of string, or Object. Default is `true`.
    - Boolean
      - `true` - autodetect column names (header) from the `rows`. If `rows` data are objects, then keys would be the column names. If `rows` are arrays, then the first row is assumed to be the header.
      - `false` - generate CSV from `rows` without any column names (header).
    - Array - array of strings to override all column names. If `rows` are objects, then each column name must match object keys.
    - Object - generate CSV from these columns **ONLY**.
      - Object keys - the only column names to be saved in the CSV file, Object values - either string, of function, or Object.
      - value is String - rename CSV header. E.g. `"user.firstName": "User First Name"`
      - value is Function - use this function to deserialise a CSV cell to a value. E.g. convert "2020-12-12" string to a Date.
      - value is Object - setting for each column name.
        - `header[].stringify` - use this function to stringify a CSV cell. E.g. convert Date to "2020-12-12" string.
        - `header[].newName` - rename CSV header. E.g. `"user.firstName": "User First Name"`
