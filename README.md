# lil-csv

Mini module for CSV file manipulations

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

const text = `Skip this column,As is,Definitelly a string,rename me,a Boolean,And a Number
skipping this cell,as is data,"data, with, commas",renamed column data,false,123.123`;

const rows = parse(text, {
  headers: {
    "As is": true,
    "Definitelly a string": String,
    "rename me": { jsonName: "newName" },
    "a Boolean": { parse: (v) => Boolean(v && v !== "false") },
    "And a Number": {
      parse: (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined),
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
//         'And a Number': 123.123
//     }
// ]
```
