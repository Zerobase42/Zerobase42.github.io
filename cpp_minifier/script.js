console.log("script loaded");
let db = [];

const HARD_TEXT = "궯둞쉞렣";

async function loadDatabase() {

    const text = await fetch("database.txt")
        .then(r => r.text());

    db = text
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);
    
        // 길이내림차순 정렬
    db.sort((a,b)=>b.length-a.length);
    
    console.log("database loaded:", db.length);
}

loadDatabase();

function protectStrings(code) {
    const saved = [];
    let result = "";
    let i = 0;

    function store(str) {
        const id = saved.length;
        saved.push(str);
        return `__STR_${id}__`;
    }

    while (i < code.length) {

        // Raw String
        let rawMatch =
            code.slice(i).match(
                /^(?:u8|u|U|L)?R"([^ ()\\\t\r\n]{0,16})\(/
            );

        if (rawMatch) {
            const delim = rawMatch[1];
            const startLen = rawMatch[0].length;

            const endTag = ")" + delim + "\"";
            const endPos = code.indexOf(
                endTag,
                i + startLen
            );

            if (endPos !== -1) {
                const raw =
                    code.slice(
                        i,
                        endPos + endTag.length
                    );

                result += store(raw);
                i = endPos + endTag.length;
                continue;
            }
        }

        // 일반 문자열
        let prefix = null;

        if (
            code.startsWith("u8\"", i) ||
            code.startsWith("u\"", i) ||
            code.startsWith("U\"", i) ||
            code.startsWith("L\"", i)
        ) {
            if (code.startsWith("u8\"", i))
                prefix = "u8";
            else
                prefix = code[i];
        }

        if (
            code[i] === '"' ||
            prefix !== null
        ) {
            const start = i;

            if (prefix === "u8")
                i += 2;
            else if (prefix)
                i += 1;

            i++; // "

            while (i < code.length) {

                if (code[i] === '\\') {
                    i += 2;
                    continue;
                }

                if (code[i] === '"') {
                    i++;
                    break;
                }

                i++;
            }

            result += store(
                code.slice(start, i)
            );
            continue;
        }

        // 문자 리터럴
        if (
            code[i] === '\'' ||
            code.startsWith("L\'", i) ||
            code.startsWith("u\'", i) ||
            code.startsWith("U\'", i)
        ) {
            const start = i;

            if (
                code[i] !== '\''
            ) {
                i++;
            }

            i++; // '

            while (i < code.length) {

                if (code[i] === '\\') {
                    i += 2;
                    continue;
                }

                if (code[i] === '\'') {
                    i++;
                    break;
                }

                i++;
            }

            result += store(
                code.slice(start, i)
            );
            continue;
        }

        result += code[i];
        i++;
    }

    return {
        code: result,
        strings: saved
    };
}

function restoreStrings(code, strings) {
    return code.replace(
        /__STR_(\d+)__/g,
        (_, n) => strings[+n]
    );
}

function minify(code,removeComments=true) {
    const protectedData =
        protectStrings(code);

    code = protectedData.code;

    const lines = code.split('\n');
    const result = [];

    for (let line of lines) {

        const stripped = line.trim();

        // 전처리문 유지
        /*
        if (stripped.startsWith('#')) {
            result.push(stripped);
            continue;
        }
        */

        line = line.replaceAll("    ", HARD_TEXT);

        for (const op of db) {
            line = line.replaceAll(" " + op + " ",op);
            line = line.replaceAll(op + " ",op);
            line = line.replaceAll(" " + op,op);
        }

        result.push(
            line.replaceAll(HARD_TEXT,"    ")
        );
    }

    code = result.join("\n");

    if (removeComments) {
        // // 주석 제거
        code = code.replace(
            /\/\/[^\n]*/g,
            ""
        );

        // /* */ 주석 제거
        code = code.replace(
            /\/\*[\s\S]*?\*\//g,
            ""
        );
    }

    // 빈 줄 제거
    code = code.replace(
        /\n\s*\n+/g,
        "\n"
    );

    code = restoreStrings(
        code,
        protectedData.strings
    );

    return code;
}

function minifyCode() {

    if (db.length === 0) {
        alert("database loading...");
        return;
    }

    const code =
        document.getElementById("input").value;

    const removeComments =
        document.getElementById("switch").checked;

    const result =
        minify(code, removeComments);

    const output =
        document.getElementById(
            "output-code"
        );

    output.textContent =
        result;

    hljs.highlightElement(output);
}

function updateHighlight() {

    const input =
        document.getElementById("input");

    const code =
        document.getElementById("input-code");

    code.textContent =
        input.value;

    hljs.highlightElement(code);
}

function updateEditorSize() {

    const input =
        document.getElementById("input");

    const h =
        Math.max(
            280,
            input.scrollHeight
        );

    input.style.height =
        h + "px";

    document.getElementById(
        "input-highlight"
    ).style.height =
        h + "px";

    document.getElementById(
        "lineNumbers"
    ).style.height =
        h + "px";
}

function updateLineNumbers() {
    const input =
        document.getElementById("input");

    const lines =
        input.value.split("\n").length;

    document.getElementById("lineNumbers")
        .innerHTML =
            Array.from(
                { length: lines },
                (_, i) => i + 1
            ).join("<br>");

    updateEditorSize();
}

loadDatabase();

window.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            document.getElementById(
                "input"
            );

        input.addEventListener(
            "input",
            () => {
                updateLineNumbers();
                updateHighlight();
            }
        );

        input.addEventListener(
            "scroll",
            () => {

                const pre =
                    document.getElementById(
                        "input-highlight"
                    );

                const nums =
                    document.getElementById(
                        "lineNumbers"
                    );

                pre.scrollTop =
                    input.scrollTop;

                pre.scrollLeft =
                    input.scrollLeft;

                nums.scrollTop =
                    input.scrollTop;
            }
        );

        document
            .getElementById(
                "minify-btn"
            )
            .addEventListener(
                "click",
                minifyCode
            );

        document
            .getElementById(
                "switch"
            )
            .addEventListener(
                "change",
                minifyCode
            );

        updateLineNumbers();
        updateHighlight();
    }
);