console.log("minifier.js loaded");

import {db} from "./database.js";
import {
    protectStrings,
    restoreStrings
} from "./stringProtect.js";
const HARD_TEXT="궯둞쉞렣";

export function minify(code,removeComments=true){
    const protectedData=protectStrings(code);
    code=protectedData.code;
    const lines=code.split('\n');
    const result=[];
    for(let line of lines){
        const stripped=line.trim();
        //전처리문 유지
        /*
        if(stripped.startsWith('#')){
            result.push(stripped);
            continue;
        }
        */
        line=line.replaceAll("    ",HARD_TEXT);
        for(const op of db){
            line=line.replaceAll(" "+op+" ",op);
            line=line.replaceAll(op+" ",op);
            line=line.replaceAll(" "+op,op);
        }
        result.push(line.replaceAll(HARD_TEXT,"    "));
    }
    code=result.join("\n");
    if(removeComments){
        ////주석 제거
        code=code.replace(/\/\/[^\n]*/g,"");
        ///**/주석 제거
        code=code.replace(/\/\*[\s\S]*?\*\//g,"");
    }
    //빈 줄 제거
    code=code.replace(/\n\s*\n+/g,"\n");
    code=restoreStrings(code,protectedData.strings);
    return code;
}