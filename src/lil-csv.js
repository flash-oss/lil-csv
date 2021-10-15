let isArray = Array.isArray;
let isString = (v) => typeof v === "string";
let isNumber = (v) => typeof v === "number";
let isBoolean = (v) => typeof v === "boolean";
let isDate = (v) => v instanceof Date && !isNaN(v.valueOf());
let isObject = (v) => v && typeof v === "object" && !isArray(v);
const isPlainObject = (value) => value && typeof value == "object" && value.__proto__ == Object.prototype;
let isFunction = (v) => typeof v === "function";

function getDeep(obj, path) {
    return path.split(".").reduce((result, curr) => (result == null ? result : result[curr]), obj);
}

function setDeep(obj, path, value) {
    path.split(".").reduce((result, curr, index, paths) => {
        let newVal = index + 1 === paths.length ? value : {};
        return isPlainObject(result[curr]) ? result[curr] : (result[curr] = newVal);
    }, obj);
}

function keysDeep(obj, prefix) {
    return Object.entries(obj).reduce((keys, [k, v]) => {
        let newKey = prefix ? prefix + "." + k : k;
        return keys.concat(isPlainObject(v) ? keysDeep(v, newKey) : newKey);
    }, []);
}

/**
 * @param str {String} The CSV file contents.
 * @param [header=true] {Boolean | String[] | Object.<string,String> | Object.<string,Function> | Object.<string,{[parse]:Function,[newName]:String}>}
 * @param [delimiter=","] {String} specifies the character sequence which should separate fields (aka columns). Default = `","`. Examples: `"\t"` or `"|"`.
 * @param [quoteChar='"'] {String} specifies a one-character string to use as the quoting character. Default = `\"`
 * @param [escapeChar="\\"] {String} specifies a one-character string to use for escaping, mutually exclusive with `quoteChar`. Default: `"\\"`
 * @return {Object[] | String[] | *[]} The parsed strings, objects, values of all kind(s).
 */
export function parse(str, { header = true, delimiter = ",", quoteChar = '"', escapeChar = "\\" } = {}) {
    let entries = [];
    let quote = false; // 'true' means we're inside a quoted field

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
        if (cc === quoteChar) {
            quote = !quote;
            continue;
        }

        if (!quote) {
            // If it's a comma, move on to the next column
            if (cc === delimiter) {
                ++col;
                entries[row][col] = ""; // If line ends with comma we need to add an empty column to the row.
                continue;
            }

            // If it's a lineTerminator (LF or CR),
            // move on to the next row and move to column 0 of that new row
            if (cc === "\n" || cc === "\r") {
                ++row;
                col = 0;

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

    let headerEntry = entries.shift();
    if (new Set(headerEntry).size !== headerEntry.length) {
        throw Error("Can't parse CSV as data. Some headers have same name.");
    }

    // Auto-construct the headers (JSON objects keys) from the top most line of the file.
    if (isBoolean(header)) header = headerEntry.reduce((o, h) => ((o[h] = true), o), {});
    let defaultDataHeader = header["*"];

    return entries.map((entry) => {
        let processedEntry = {};
        for (let col = 0; col < entry.length; col++) {
            let dataHeaderName = headerEntry[col];
            let dataHeader = isArray(header) ? header[col] : header[dataHeaderName] || defaultDataHeader;
            if (!dataHeader) continue; // We don't want this column
            let value = entry[col];

            let parse = dataHeader.parse || dataHeader;
            if (isFunction(parse)) value = parse(value, entry);

            if (value !== undefined) {
                let propName = dataHeader.newName || (isString(dataHeader) ? dataHeader : dataHeaderName);
                setDeep(processedEntry, propName, value);
            }
        }
        return processedEntry;
    });
}

let valueToString = (v) => {
    if (v == null || v === "" || !((isNumber(v) && !isNaN(v)) || isString(v) || isDate(v) || isBoolean(v))) return ""; // ignore bad data

    v = isDate(v) ? v.toISOString() : String(v); // convert any kind of value to string
    return v;
};

/**
 * Generate CSV from your data (arrays or objects) to a string.
 * The options are named using this standard: https://specs.frictionlessdata.io//csv-dialect/#specification
 * @param rows {Object[] | String[]}
 * @param [header=true] {Boolean | String[] | Object.<string,Boolean> | Object.<string,String> | Object.<string,Function> | Object.<string,{[stringify]:Function,[newName]:String}>}
 * @param [delimiter=","] {String} specifies the character sequence which should separate fields (aka columns). Default = `","`. Examples: `"\t"` or `"|"`.
 * @param [quoteChar='"'] {String} specifies a one-character string to use as the quoting character. Default = `\"`
 * @param [escapeChar="\\"] {String} specifies a one-character string to use for escaping, mutually exclusive with `quoteChar`. Default: `"\\"`
 * @param [wrapStrings=false] {Boolean} specifies if all string cells must be wrapped with the `quoteChar`
 * @param [lineTerminator="\n"] {String} specifies the character sequence which should terminate rows. Default = `"\n"`
 * @return {String} The CSV file contents.
 */
export function generate(
    rows,
    {
        header = true,
        delimiter = ",",
        lineTerminator = "\n",
        quoteChar = '"',
        escapeChar = "\\",
        wrapStrings = false,
    } = {}
) {
    let serialiseString = (v) => {
        v = v.replace(new RegExp(quoteChar, "g"), escapeChar + quoteChar); // Escape quote character
        return wrapStrings || v.includes(delimiter) ? quoteChar + v + quoteChar : v; // Add quotes if value has commas
    };

    /**
     * @type {String[]|null}
     */
    let detectedHeaders = null;
    if (header) {
        if (isArray(header)) {
            if (!header.length || !header.every(isString))
                throw new Error("If header is array all items must be strings");
            detectedHeaders = header;
        } else {
            // Here we know that `header` is either `true` or an object.
            if (isObject(rows[0])) {
                detectedHeaders = keysDeep(rows[0]);
                if (detectedHeaders.length === 0) throw new Error("Bad header and rows");
            } else {
                if (!isArray(rows[0])) throw new Error("Can't auto detect header from rows");
            }

            if (isPlainObject(header)) {
                // If there is "star" header then the column order would be taken from the data rows;
                // but if no "*" was given then let's user the `header` object order.
                let detectedHeadersSet = new Set(header["*"] ? detectedHeaders : Object.keys(header));
                for (let [key, value] of Object.entries(header)) {
                    if (!value) {
                        detectedHeadersSet.delete(key);
                    } else {
                        detectedHeadersSet.add(key);
                    }
                }
                detectedHeadersSet.delete("*");
                detectedHeaders = Array.from(detectedHeadersSet);
            } else {
                if (!isBoolean(header)) throw new Error("Header must be either boolean, or array, or object");
            }
        }
    }

    let textHeader = detectedHeaders
        ? detectedHeaders
              .map((h) => {
                  let dataHeader = header[h] || header["*"] || h;
                  let newHeader = dataHeader.newName || (isString(dataHeader) ? dataHeader : h);
                  return serialiseString(newHeader);
              })
              .join(delimiter) + lineTerminator
        : "";
    return (
        textHeader +
        rows
            .map((row, i) => {
                if (isArray(row)) {
                    if (detectedHeaders && row.length !== detectedHeaders.length)
                        throw new Error(`Each row array must have exactly ${detectedHeaders.length} items`);
                    return row.map((v) => serialiseString(valueToString(v))).join(delimiter);
                }
                if (isObject(row)) {
                    if (!detectedHeaders) throw new Error("Unexpected row object");

                    return detectedHeaders
                        .map((h) => {
                            let dataHeader = header[h] || header["*"] || h;
                            let stringify = dataHeader.stringify || dataHeader;
                            if (!isFunction(stringify)) stringify = valueToString;
                            return serialiseString(valueToString(stringify(getDeep(row, h), row)));
                        })
                        .join(delimiter);
                }
                throw new Error(`Row ${i} must be either array or object`);
            })
            .join(lineTerminator)
    );
}
