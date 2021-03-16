export const isString = (f) => typeof f === "string";
export const isNumber = (f) => typeof f === "number";
export const isBoolean = (f) => typeof f === "boolean";
export const isDate = (o) => o instanceof Date && !isNaN(o.valueOf());

export const isFunction = (f) => typeof f === "function";

export function parse(str, { header = false, escapeChar = "\\" } = {}) {
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

            // If it's a newline (LF or CR),
            // move on to the next row and move to column 0 of that new row
            if (cc === "\n" || cc === "\r") {
                ++row;
                col = 0;
                newRow = false;

                // If it's a newline (CRLF), skip the next character
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
    if (typeof header === "boolean") header = Object.fromEntries(headerEntry.map((h) => [h, true]));

    return entries.map((entry) => {
        const processedEntry = {};
        for (let col = 0; col < entry.length; col++) {
            const dataHeaderName = headerEntry[col];
            if (!header[dataHeaderName]) continue; // We don't want this column
            let value = entry[col];

            const parse = header[dataHeaderName].parse || header[dataHeaderName];
            if (isFunction(parse)) value = parse(value);

            processedEntry[header[dataHeaderName].jsonName || dataHeaderName] = value;
        }
        return processedEntry;
    });
}

export function generate({ header, rows, newLine: lineTerminator = "\n", escapeChar = "\\" }) {
    if (!header) header = "";
    else {
        if (Array.isArray(header)) header = header.map((h) => (isString(h) && h.includes(",") ? `"${h}"` : h)).join();
        if (!isString(header)) throw new Error("Header must be either string or array of strings");
        header = header + lineTerminator;
    }

    return (
        header +
        rows
            .map((row) =>
                row
                    .map((v) => {
                        if (
                            v == null ||
                            v === "" ||
                            !((isNumber(v) && !isNaN(v)) || isString(v) || isDate(v) || isBoolean(v))
                        )
                            return ""; // ignore bad data
                        v = isDate(v) ? v.toISOString() : String(v); // convert any kind of value to string
                        v = v.replace(/"/g, escapeChar + '"'); // Escape quote character
                        if (v.includes(",")) v = '"' + v + '"'; // Add quotes if value has commas
                        return v;
                    })
                    .join()
            )
            .join(lineTerminator)
    );
}
