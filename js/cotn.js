const BACKSLASH = 92;
const DQUO = 34;
const COMMENT_OPEN = "<<";
const COMMENT_CLOSE = ">>";

export { parseFile as "parse" };

/**
 * @param {string} cotn
 * @returns {object}
 */
function parseFile(cotn) {
    const out = Object.seal({
        version: undefined,
        value: undefined,
    });

    for (let i = 0; i < cotn.length; i++) {
        if (out.version === undefined) {
            if (cotn[i] === "v" && isNumeric(cotn.charCodeAt(i + 1))) {
                const verend = readVersion(cotn, i + 1);
                out.version = cotn.slice(i + 1, verend);
                i += verend;
            }
        }

        if (isCommentStart(cotn, i)) {
            i = findCommentClose(cotn, i);
            continue;
        }

        if (isValStart(cotn.charCodeAt(i))) {
            const [value] = parseValue(cotn, i);
            out.value = value;
            return out;
        }
    }
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @param {object} [keysets={}]
 * @param {string} [setname]
 * @returns {[any,number]}
 */
function parseValue(cotn, i = 0, keysets = {}, setname) {
    let keysetstart;
    let value = null;
    for (; i < cotn.length; i++) {
        const char = cotn.charCodeAt(i);

        // ignore control characters and spaces
        if (char < 33 || char === 127) {
            continue;
        }

        if (isCommentStart(cotn, i)) {
            i = findCommentClose(cotn, i);
            continue;
        }

        // open object {
        if (cotn[i] === "{") {
            if (keysetstart) {
                setname = cotn.slice(keysetstart, i);
                keysetstart = undefined;
            }
            [value, i] = readObject(cotn, ++i, keysets, setname);
            break;
        }

        // open array [
        if (cotn[i] === "[") {
            if (keysetstart) {
                setname = cotn.slice(keysetstart, i);
                keysetstart = undefined;
            }
            [value, i] = readArray(cotn, ++i, keysets, setname);
            break;
        }

        // keyset identifier
        // This implementation allows for "scoped" keysets which are not currently part of the spec, but may be added at a future date.
        if (keysetstart === undefined) {
            if (isAsciiLetter(char)) {
                keysetstart = i;
                continue;
            }
        } else {
            if (cotn[i] === "(") {
                const newset = cotn.slice(keysetstart, i);
                // find closing paren
                const start = ++i;
                for (; i < cotn.length; i++) {
                    if (cotn[i] === ")") {
                        const keys = cotn
                            .slice(start, i)
                            .split(",")
                            .filter(Boolean);
                        keysets[newset] = keys;
                        break;
                    }
                }
                keysetstart = undefined;
                continue;
            } else if (!isAsciiLetter(char)) {
                // unexpected symbol, stop looking and move on
                keysetstart = undefined;
            }
        }

        if (cotn[i] === "+") {
            value = true;
            break;
        }

        if (cotn[i] === "-") {
            value = false;
            break;
        }

        if (cotn[i] === "!") {
            value = null;
            break;
        }

        if (isNumeric(char)) {
            [value, i] = readNumber(cotn, i);
            break;
        }

        if (cotn[i] === '"') {
            [value, i] = readString(cotn, ++i);
            break;
        }
    }
    return [value, i + 1];
}

/**
 * @param {number} char
 * @returns {boolean}
 */
function isValStart(char) {
    // number, dot, letter, +, -, !, or opening (, [, {, "
    return (
        isNumeric(char) ||
        isAsciiLetter(char) ||
        [43, 45, 33, 40, 91, 123, 34].includes(char)
    );
}

/**
 * @param {number} char
 * @returns {boolean} true if char is [a-zA-Z]
 */
function isAsciiLetter(char) {
    return (char > 65 && char < 123) || (char > 90 && char < 97);
}

/**
 * @param {number} char
 * @returns {boolean} true if char is [0-9]
 */
function isNumber(char) {
    return char > 47 && char < 58;
}

/**
 * @param {number} char
 * @returns {boolean} true if char is [0-9\.]
 */
function isNumeric(char) {
    return char === 46 || isNumber(char);
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @returns {number}
 */
function readVersion(cotn, i = 0) {
    for (; i < cotn.length; i++) {
        const char = cotn.charCodeAt(i);
        if (!isNumeric(char)) {
            return i;
        }
    }
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @returns {[any,number]} The parsed number and the index of the final character to continue parsing from.
 */
function readNumber(cotn, i = 0) {
    const start = i;
    let dotseen = false;
    let eseen = false;
    for (; i < cotn.length; i++) {
        if (cotn[i] === ".") {
            if (dotseen) {
                break;
            } else {
                dotseen = true;
            }
        } else if (cotn[i] === "e" && i !== start) {
            // "e" must have a number both before and after
            const prev = cotn.charCodeAt(i - 1);
            const next = cotn.charCodeAt(i + 1);
            if (eseen || !isNumber(prev) || !isNumber(next)) {
                break;
            } else {
                eseen = true;
            }
        } else if (!isNumber(cotn.charCodeAt(i))) {
            break;
        }
    }
    return [Number(cotn.slice(start, i)), i];
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @returns {[any,number]} The parsed string and the index of the closing string symbol to continue parsing from.
 */
function readString(cotn, i = 0) {
    const start = i;
    const backslashes = [];
    for (; i < cotn.length; i++) {
        const char = cotn.charCodeAt(i);
        if (char === BACKSLASH) {
            const next = cotn.charCodeAt(i + 1);
            if (next === BACKSLASH || next === DQUO) {
                backslashes.push(i - start);
            }
            i++;
        } else if (char === DQUO) {
            let value = cotn.slice(start, i);
            for (let n = 0; n < backslashes.length; n++) {
                const pos = backslashes[n] - n;
                value =
                    value.slice(0, pos) + value.slice(pos + 1, value.length);
            }
            return [value, i];
        }
    }
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @param {object} [keysets={}]
 * @param {string} [setname]
 * @returns {[any,number]} The parsed object and the index of the close object symbol to continue parsing from.
 */
function readObject(cotn, i = 0, keysets = {}, setname) {
    const object = {};
    if (setname) {
        // value list
        const keyset = keysets[setname];
        for (const key of keyset) {
            for (; i < cotn.length; i++) {
                if (isCommentStart(cotn, i)) {
                    i = findCommentClose(cotn, i);
                } else if (cotn[i] === ",") {
                    break;
                } else if (cotn[i] === "}") {
                    object[key] = null;
                    return [object, i];
                } else if (isValStart(cotn.charCodeAt(i))) {
                    const [value, end] = parseValue(cotn, i, keysets);
                    object[key] = value;
                    i = end - 1;
                    break;
                }
            }
            if (object[key] === undefined) {
                i++;
                object[key] = null;
            } else {
                for (; i < cotn.length; i++) {
                    if (isCommentStart(cotn, i)) {
                        i = findCommentClose(cotn, i);
                    } else if (cotn[i] === ",") {
                        i++;
                        break;
                    } else if (cotn[i] === "}") {
                        return [object, i];
                    }
                }
            }
        }

        for (; i < cotn.length; i++) {
            if (cotn[i] === "}") {
                break;
            }
        }
    } else {
        // key-value pairs
        let key = "";
        for (; i < cotn.length; i++) {
            const char = cotn.charCodeAt(i);
            const escaped = cotn.charCodeAt(i - 1) === BACKSLASH;
            if (isCommentStart(cotn, i) && !escaped) {
                i = findCommentClose(cotn, i);
            } else if (cotn[i] === "," && !escaped) {
                key = "";
            } else if (cotn[i] === "}" && !escaped) {
                break;
            } else if (cotn[i] === ":" && !escaped) {
                const [value, end] = parseValue(cotn, i + 1, keysets);
                object[key] = value;
                i = end - 1;
                key = "";
            } else if (char > 32 && char !== 127) {
                // ignore control characters and spaces
                key += cotn[i];
            }
        }
    }
    return [object, i];
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @param {object} [keysets={}]
 * @param {string} [setname]
 * @returns {[any,number]} The parsed array and the index of the close array symbol to continue parsing from.
 */
function readArray(cotn, i = 0, keysets = {}, setname) {
    const arr = [];
    for (; i < cotn.length; i++) {
        if (isCommentStart(cotn, i)) {
            i = findCommentClose(cotn, i);
        } else if (cotn[i] === "]") {
            break;
        } else if (isValStart(cotn.charCodeAt(i))) {
            const [value, end] = parseValue(cotn, i, keysets, setname);
            arr.push(value);
            i = end - 1;
        }
    }
    return [arr, i];
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @returns {boolean} true if cotn[i] is and is followed by an opening comment symbol.
 */
function isCommentStart(cotn, i = 0) {
    return cotn.slice(i, i + COMMENT_OPEN.length) === COMMENT_OPEN;
}

/**
 * @param {string} cotn
 * @param {number} [i=0]
 * @returns {number} The index of the close comment symbol to continue parsing from.
 */
function findCommentClose(cotn, i = 0) {
    for (; i < cotn.length; i++) {
        if (cotn.slice(i, i + COMMENT_CLOSE.length) === COMMENT_CLOSE) {
            i += COMMENT_CLOSE.length - 1;
            break;
        }
    }
    return i;
}
