const isString = (v) => typeof v === "string";
const isNumber = (v) => typeof v === "number";
const isBoolean = (v) => typeof v === "boolean";
const isDate = (v) => v instanceof Date && !isNaN(v.valueOf());
const isObject = (v) => v && typeof v === "object";
const isFunction = (v) => typeof v === "function";
// function getDeep(obj, path) {
//     return path.split(".").reduce((result, curr) => (result == null ? result : result[curr]), obj);
// }
function setDeep(obj, path, value) {
    path.split(".").reduce((result, curr, index, paths) => {
        const newVal = index + 1 === paths.length ? value : {};
        return isObject(result[curr]) ? result[curr] : (result[curr] = newVal);
    }, obj);
}

export function parse(str, { header = true, escapeChar = "\\" } = {}) {
    const entries = [];
    let quote = false; // 'true' means we're inside a quoted field
    let newRow = false; // 'true' means we need to finish this line

    // Iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
        let cc = str[c]; // Current character
        let nc = str[c + 1]; // Next character
        entries[row] = entries[row] || []; // Create a new row if necessary
        entries[row][col] = entries[row][col] || ""; // Create a new column (start with empty string) if necessary

        // If it's an escaping, then just use the following character as data
        if (cc === escapeChar) {
            entries[row][col] += nc;
            ++c;
            continue;
        }

        // If it's just one quotation mark, begin/end quoted field
        if (cc === '"') {
            quote = !quote;
            continue;
        }

        if (!quote) {
            // If it's a comma, move on to the next column
            if (cc === ",") {
                ++col;
                entries[row][col] = ""; // If line ends with comma we need to add an empty column to the row.
                continue;
            }

            // If it's a lineTerminator (LF or CR),
            // move on to the next row and move to column 0 of that new row
            if (cc === "\n" || cc === "\r") {
                ++row;
                col = 0;
                newRow = false;

                // If it's a lineTerminator (CRLF), skip the next character
                // and move on to the next row and move to column 0 of that new row
                if (cc === "\r" && nc === "\n") {
                    ++c;
                }

                continue;
            }
        }

        // Otherwise, append the current character to the current column
        entries[row][col] += cc;
    }

    if (!header) return entries; // no data processing needed.

    const headerEntry = entries.shift();
    if (new Set(headerEntry).size !== headerEntry.length) {
        throw Error("Can't parse CSV as data. Some headers have same name.");
    }

    // Auto-construct the headers (JSON objects keys) from the top most line of the file.
    if (typeof header === "boolean") header = headerEntry.reduce((o, h) => ((o[h] = true), o), {});

    return entries.map((entry) => {
        const processedEntry = {};
        for (let col = 0; col < entry.length; col++) {
            const dataHeaderName = headerEntry[col];
            const dataHeader = header[dataHeaderName];
            if (!dataHeader) continue; // We don't want this column
            let value = entry[col];

            const parse = dataHeader.parse || dataHeader;
            if (isFunction(parse)) value = parse(value);

            let propName = dataHeader.jsonName || (isString(dataHeader) ? dataHeader : dataHeaderName);
            setDeep(processedEntry, propName, value);
        }
        return processedEntry;
    });
}

export function generate(rows, { header, lineTerminator = "\n", escapeChar = "\\" } = {}) {
    if (header) {
        if (isBoolean(header)) {
            header = Array.from(rows.reduce((all, row) => new Set([...all, ...Object.keys(row)]), new Set()));
        } else if (Array.isArray(header)) {
            if (!header.every(isString)) throw new Error("If header is array all items must be strings");
        } else if (isObject(header)) {
            header = Object.entries(header)
                .filter(([k, v]) => v)
                .map(([k]) => k);
        } else {
            throw new Error("Header must be either boolean, or array, or object");
        }

        header = header.map((h) => {
            h = h.replace(/"/g, escapeChar + '"');
            return h.includes(",") ? `"${h}"` : h;
        });
    }

    function valueToString(v) {
        if (v == null || v === "" || !((isNumber(v) && !isNaN(v)) || isString(v) || isDate(v) || isBoolean(v)))
            return ""; // ignore bad data

        v = isDate(v) ? v.toISOString() : String(v); // convert any kind of value to string
        v = v.replace(/"/g, escapeChar + '"'); // Escape quote character
        if (v.includes(",")) v = '"' + v + '"'; // Add quotes if value has commas
        return v;
    }

    const textHeader = header ? header.join() + lineTerminator : "";
    return (
        textHeader +
        rows
            .map((row, i) => {
                if (Array.isArray(row)) {
                    if (header && row.length !== header.length)
                        throw new Error(`Each row array must have exactly ${header.length} items`);
                    return row.map(valueToString).join();
                }
                if (isObject(row)) {
                    return header.map((h) => valueToString(row[h])).join();
                }
                throw new Error(`Row ${i} must be either array or object`);
            })
            .join(lineTerminator)
    );
}
