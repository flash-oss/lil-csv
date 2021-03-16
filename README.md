# lil-csv

Mini 1k module for CSV file manipulations

## Usage

```shell
npm i lil-csv
```

### Parse CSV

Every row and column as text:

```js
import { parse } from "lil-csv";

const text = `Column 1,"Some,other",Boolean
text data,"data, with, commas",false`;

const rows = parse(text);

console.log(rows);
// [
//     [ 'Column 1', 'Some,other', 'Boolean' ],
//     [ 'text data', 'data, with, commas', 'false' ]
// ]
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
