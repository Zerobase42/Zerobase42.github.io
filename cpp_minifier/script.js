console.log("script loaded");

const db = [
    '+', '-', '*', '/', '%', '?', ':', ';',
    '(', ')', '{', '}', '[', ']',
    ',', '==', '+=', '-=', '*=', '/=', '%=',
    '&=', '|=', '^=', '>=', '<=', '=',
    '>', '<', '!=', '&', '|', '&&', '||', '~'
];

const HARD_TEXT = "궭뷁쉛뤒";

function minify(code) {

    const lines = code.split('\n');
    const result = [];

    for (let line of lines) {

        const stripped = line.trim();

        // 전처리문 유지
        if (stripped.startsWith('#')) {
            result.push(stripped);
            continue;
        }

        line = line.replaceAll('    ', HARD_TEXT);

        for (const a of db) {
            line = line.replaceAll(' ' + a + ' ', a);
            line = line.replaceAll(a + ' ', a);
            line = line.replaceAll(' ' + a, a);
        }

        result.push(
            line.replaceAll(HARD_TEXT, '    ')
        );
    }

    code = result.join('\n');

    // // 주석 제거
    code = code.replace(/\/\/[^\n]*/g, '');

    // /* */ 주석 제거
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');

    // 빈 줄 제거
    code = code.replace(/\n\s*\n+/g, '\n');

    return code;
}

function minifyCode() {

    const code =
        document.getElementById("input").value;

    const result =
        minify(code);

    document
        .getElementById("output")
        .textContent = result;
}