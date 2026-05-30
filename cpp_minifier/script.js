console.log("script loaded");
let db = [];

const HARD_TEXT = "궭뷁쉛뤒";

async function loadDatabase() {

    const text = await fetch("database.txt")
        .then(r => r.text());

    db = text
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);

    console.log("database loaded:", db.length);
}

loadDatabase();

function minify(code) {

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

    // 빈 줄 제거
    code = code.replace(
        /\n\s*\n+/g,
        "\n"
    );

    return code;
}

function minifyCode() {

    if (db.length === 0) {
        alert("database.txt loading...");
        return;
    }

    const code =
        document.getElementById("input").value;

    const result =
        minify(code);

    document
        .getElementById("output")
        .textContent = result;
}