console.log("minifier.js loaded");

import {db} from "./database.js";

import {
    protectStrings,
    restoreStrings
} from "./stringProtect.js";

import {undef_macro} from "./undef_marco.js";

import {renameVariables} from "./variableRename.js";

const HARD_TEXT = "궯둞쉞렣";

// ============================================================
// 주석 제거
// ============================================================

function removeCComments(code){

    // 여러 줄 주석
    code = code.replace(
        /\/\*[\s\S]*?\*\//g,
        comment => comment.replace(/[^\r\n]/g," ")
    );

    // 한 줄 주석
    code = code.replace(
        /\/\/[^\r\n]*/g,
        ""
    );

    return code;
}

// ============================================================
// 코드 평탄화
// ============================================================

function flattenCodePreservingDirectives(code){

    const output = [];

    let normalLines = [];

    let directiveLines = null;

    const flushNormal = () => {

        if(normalLines.length === 0){
            return;
        }

        output.push(
            normalLines.join(" ")
        );

        normalLines = [];
    };

    for(const raw of code.split(/\r?\n/)){

        const line = raw.trim();

        // 전처리문 연속 구간
        if(directiveLines !== null){

            directiveLines.push(line);

            if(!line.endsWith("\\")){

                output.push(
                    directiveLines.join("\n")
                );

                directiveLines = null;
            }

            continue;
        }

        if(line === ""){
            continue;
        }

        // 전처리문
        if(line.startsWith("#")){

            flushNormal();

            directiveLines = [line];

            if(!line.endsWith("\\")){

                output.push(line);

                directiveLines = null;
            }

            continue;
        }

        // 일반 코드
        normalLines.push(line);
    }

    flushNormal();

    if(directiveLines !== null){

        output.push(
            directiveLines.join("\n")
        );
    }

    return output.join("\n");
}

// ============================================================
// Minify
// ============================================================

export async function minify(
    code,
    removeComments=true,
    flattenCode=false,
    undefMacro=false,
    from=4,
    to=4,
    renameVars=false,
    renameOptions={}
){

    if(typeof code !== "string"){

        throw new TypeError(
            "code must be a string"
        );
    }

    if(!Number.isInteger(from) || from < 1){

        throw new RangeError(
            "from must be a positive integer"
        );
    }

    if(!Number.isInteger(to) || to < 0){

        throw new RangeError(
            "to must be a non-negative integer"
        );
    }

    // ========================================================
    // 1. 문자열 보호
    // ========================================================

    const protectedData = protectStrings(code);

    code = protectedData.code;

    // ========================================================
    // 2. 주석 제거
    // ========================================================

    if(removeComments){

        code = removeCComments(code);
    }

    // ========================================================
    // 3. 줄 단위 공백 최적화
    // ========================================================

    const lines = code.split(/\r?\n/);

    const result = [];

    for(let i=0; i<lines.length; i++){

        let line = lines[i];

        const stripped = line.trim();

        if(stripped === ""){
            continue;
        }

        // ====================================================
        // 전처리문 독립 유지
        // ====================================================

        if(stripped.startsWith("#")){

            result.push(stripped);

            // 여러 줄 전처리문
            while(
                result[result.length-1].endsWith("\\") &&
                i+1 < lines.length
            ){

                i++;

                result.push(
                    lines[i].trim()
                );
            }

            continue;
        }

        // ====================================================
        // 일반 코드 공백 최적화
        // ====================================================

        line = line.replaceAll(
            " ".repeat(from),
            HARD_TEXT
        );

        for(const op of db){

            line = line.replaceAll(
                " " + op + " ",
                op
            );

            line = line.replaceAll(
                op + " ",
                op
            );

            line = line.replaceAll(
                " " + op,
                op
            );
        }

        line = line.replaceAll(
            HARD_TEXT,
            " ".repeat(to)
        );

        if(line.trim() !== ""){

            result.push(line);
        }
    }

    code = result.join("\n");

    // ========================================================
    // 4. 코드 평탄화
    // ========================================================

    if(flattenCode){

        code = flattenCodePreservingDirectives(code);
    }

    // ========================================================
    // 5. 빈 줄 제거
    // ========================================================

    code = code.replace(
        /\n[ \t]*\n+/g,
        "\n"
    );

    // ========================================================
    // 6. 문자열 복원
    // ========================================================

    code = restoreStrings(
        code,
        protectedData.strings
    );

    // ========================================================
    // 7. 매크로 처리
    // ========================================================

    if(undefMacro){

        code = undef_macro(code);
    }

    // ========================================================
    // 8. 변수명 변경
    // ========================================================

    if(renameVars){

        code = await renameVariables(
            code,
            renameOptions
        );
    }

    return code;
}