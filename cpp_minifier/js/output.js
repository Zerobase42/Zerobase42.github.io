console.log("output.js loaded");

import {db} from "./database.js";
import {minify} from "./minifier.js";

export function minifyCode(){

    if(db.length === 0){
        alert("database loading...");
        console.log("database is not defined. Please check the database.txt.");
        return;
    }

    const code = document.getElementById("input").value;
    const removeComments = document.getElementById("switch").checked;
    const flattenCode = document.getElementById("flatten-code").checked;
    const undefMacro = document.getElementById("undef-macro").checked;

    // Minify
    const result = minify(
        code,
        removeComments,
        flattenCode,
        undefMacro
    );

    // 반환값 검사
    if(typeof result !== "string"){
        throw new TypeError(
            `minify() must return a string. Received: ${typeof result}`
        );
    }

    // Highlight    
    const output = document.getElementById("output-code");

    const highlighted = hljs.highlight(result, {
        language: "cpp"
    });

    output.innerHTML = highlighted.value;

    // 줄 번호
    const lines = result.split("\n").length;

    const outputNums = document.getElementById("outputLineNumbers");

    outputNums.innerHTML = Array.from(
        {length: lines},
        (_, i) => i + 1
    ).join("\n");

    // Output 높이 동기화
    const outputHighlight = document.getElementById("output-highlight");

    const h = Math.min(
        Math.max(280, outputHighlight.scrollHeight),
        500
    );

    outputHighlight.style.height = h + "px";
    outputNums.style.height = h + "px";

    document.querySelector(".output-container").style.maxHeight = h + "px";

    console.log(
        "input code length:", code.length,
        "\nminified code length:", result.length,
        "\nreduction ratio:",
        ((code.length - result.length) / code.length * 100).toFixed(2) + "%"
    );
}