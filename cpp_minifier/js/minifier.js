console.log("minifier.js loaded");

import {db} from "./database.js";
import {
    protectStrings,
    restoreStrings
} from "./stringProtect.js";
import {undef_macro} from "./undef_marco.js";
const HARD_TEXT="궯둞쉞렣";
export function minify(code,removeComments=true,flattenCode=false,undefMacro=false, from=4, to=4){
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
        line=line.replaceAll(" ".repeat(from),HARD_TEXT);
        for(const op of db){
            line=line.replaceAll(" "+op+" ",op);
            line=line.replaceAll(op+" ",op);
            line=line.replaceAll(" "+op,op);
        }
        if(line!==""){
            result.push(line.replaceAll(HARD_TEXT," ".repeat(to)));
        }
    }
    code=result.join("\n");
    if(removeComments){
        // /**/주석 제거
        code=code.replace(/\/\*[\s\S]*?\*\//g,"");
        // //주석 제거
        code=code.replace(/\/\/[^\n]*/g,"");
    }
    if(flattenCode){
        // 코드 평탄화
        const lines = code.split('\n');
        const result = [];
        let normalCode = "";
    
        for(let line of lines){
            line = line.trim();
    
            if(line === ""){
                continue;
            }
    
            // 전처리문은 독립된 줄로 유지
            if(line.startsWith('#')){
                if(normalCode !== ""){
                    result.push(normalCode);
                    normalCode = "";
                }
    
                result.push(line);
            }
            else{
                // 일반 코드는 공백을 두고 합치기
                if(normalCode !== ""){
                    normalCode += " ";
                }
    
                normalCode += line;
            }
        }
    
        // 마지막 일반 코드 추가
        if(normalCode !== ""){
            result.push(normalCode);
        }
    
        code = result.join("\n");
    }
    //빈 줄 제거
    code=code.replace(/\n\s*\n+/g,"\n");
    code=restoreStrings(code,protectedData.strings);
    if(undefMacro){
        code=undef_macro(code);
    }
    return code;
}