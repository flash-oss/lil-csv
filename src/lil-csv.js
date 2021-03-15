export function parse(str, { headers = false } = {}) {
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
        if (cc === "\\") {
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

    if (!headers) return entries; // no data processing needed.

    const headerEntry = entries.shift();
    if (new Set(headerEntry).size !== headerEntry.length) {
        throw Error("Can't parse CSV as data. Some headers have same name.");
    }

    return entries.map((entry) => {
        const processedEntry = {};
        for (let col = 0; col < entry.length; col++) {
            const dataHeaderName = headerEntry[col];
            if (!headers[dataHeaderName]) continue; // We don't want this column
            let value = entry[col];

            const parse = headers[dataHeaderName].parse || headers[dataHeaderName];
            if (typeof parse === "function") value = parse(value);

            processedEntry[headers[dataHeaderName].jsonName || dataHeaderName] = value;
        }
        return processedEntry;
    });
}

