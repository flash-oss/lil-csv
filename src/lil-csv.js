const isArray = Array.isArray;
const isString = (v) => typeof v === "string";
const isNumber = (v) => typeof v === "number";
const isBoolean = (v) => typeof v === "boolean";
const isDate = (v) => v instanceof Date && !isNaN(v.valueOf());
const isObject = (v) => v && typeof v === "object" && !isArray(v);
const isFunction = (v) => typeof v === "function";

function getDeep(obj, path) {
    return path.split(".").reduce((result, curr) => (result == null ? result : result[curr]), obj);
}

function setDeep(obj, path, value) {
    path.split(".").reduce((result, curr, index, paths) => {
        const newVal = index + 1 === paths.length ? value : {};
        return isObject(result[curr]) ? result[curr] : (result[curr] = newVal);
    }, obj);
}

function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const [key, value] of Object.entries(source)) {
            if (isObject(value)) {
                mergeDeep((target[key] = target[key] || {}), value);
            } else {
                target[key] = value;
            }
        }
    }

    return mergeDeep(target, ...sources);
}

function keysDeep(obj, prefix) {
    return Object.entries(obj).reduce((keys, [k, v]) => {
        const newKey = prefix ? prefix + "." + k : k;
        return keys.concat(isObject(v) ? keysDeep(v, newKey) : newKey);
    }, []);
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
    if (isBoolean(header)) header = headerEntry.reduce((o, h) => ((o[h] = true), o), {});

    return entries.map((entry) => {
        const processedEntry = {};
        for (let col = 0; col < entry.length; col++) {
            const dataHeaderName = headerEntry[col];
            const dataHeader = header[dataHeaderName];
            if (!dataHeader) continue; // We don't want this column
            let value = entry[col];

            const parse = dataHeader.parse || dataHeader;
            if (isFunction(parse)) value = parse(value, entry);

            let propName = dataHeader.newName || (isString(dataHeader) ? dataHeader : dataHeaderName);
            setDeep(processedEntry, propName, value);
        }
        return processedEntry;
    });
}

export function generate(rows, { header = true, lineTerminator = "\n", escapeChar = "\\" } = {}) {
    function serialiseString(v) {
        v = v.replace(/"/g, escapeChar + '"'); // Escape quote character
        return v.includes(",") ? '"' + v + '"' : v; // Add quotes if value has commas
    }

    function valueToString(v) {
        if (v == null || v === "" || !((isNumber(v) && !isNaN(v)) || isString(v) || isDate(v) || isBoolean(v)))
            return ""; // ignore bad data

        v = isDate(v) ? v.toISOString() : String(v); // convert any kind of value to string
        return v;
    }

    let detectedHeaders = null;
    if (header) {
        if (isBoolean(header)) {
            if (isObject(rows[0])) {
                detectedHeaders = keysDeep(mergeDeep({}, ...rows.filter(isObject)));
                if (detectedHeaders.length === 0) throw new Error("Bad header and rows");
            } else {
                if (!isArray(rows[0])) throw new Error("Can't auto detect header from rows");
            }
        } else if (isArray(header)) {
            if (!header.length || !header.every(isString))
                throw new Error("If header is array all items must be strings");
            detectedHeaders = header;
        } else if (isObject(header)) {
            detectedHeaders = Object.entries(header)
                .filter(([k, v]) => v)
                .map(([k]) => k);
        } else {
            throw new Error("Header must be either boolean, or array, or object");
        }
    }

    const textHeader = detectedHeaders
        ? detectedHeaders
              .map((h) => {
                  const dataHeader = header[h] || h;
                  const newHeader = dataHeader.newName || (isString(dataHeader) ? dataHeader : h);
                  return serialiseString(newHeader);
              })
              .join() + lineTerminator
        : "";
    return (
        textHeader +
        rows
            .map((row, i) => {
                if (isArray(row)) {
                    if (detectedHeaders && row.length !== detectedHeaders.length)
                        throw new Error(`Each row array must have exactly ${detectedHeaders.length} items`);
                    return row.map((v) => serialiseString(valueToString(v))).join();
                }
                if (isObject(row)) {
                    if (!detectedHeaders) throw new Error("Unexpected row object");

                    return detectedHeaders
                        .map((h) => {
                            const dataHeader = header[h] || h;
                            let stringify = dataHeader.stringify || dataHeader;
                            if (!isFunction(stringify)) stringify = valueToString;
                            return serialiseString(valueToString(stringify(getDeep(row, h), row)));
                        })
                        .join();
                }
                throw new Error(`Row ${i} must be either array or object`);
            })
            .join(lineTerminator)
    );
}
