console.log("output.js loaded");

import {db} from "./database.js";
import {minify} from "./minifier.js";

export function minifyCode(){
    if(db.length===0){
        alert("database loading...");
        console.log("database is not defined. Please check the database.txt.");
        return;
    }
    const code=document.getElementById("input").value;
    const removeComments=document.getElementById("switch").checked;
    const flattenCode=document.getElementById("flatten-code").checked;
    const undefMacro=document.getElementById("undef-macro").checked;
    // 여기 위에 변수 넣어서 minify 함수 호출
    const result=minify(code,removeComments,flattenCode,undefMacro);
    // ^^^ 일단 minify 수정하고 여기다가 옵션 변수 넣기
    const output=document.getElementById("output-code");
    output.innerHTML=hljs.highlight(result,{language:"cpp"}).value;
    const lines=result.split("\n").length;
    const outputNums = document.getElementById("outputLineNumbers");
    outputNums.innerHTML = Array.from({length:lines},(_,i)=>i+1).join("\n");
    // output 높이 동기화
    const outputHighlight=document.getElementById("output-highlight");
    const h=Math.min(Math.max(280, outputHighlight.scrollHeight),500);
    outputHighlight.style.height=h+"px";
    outputNums.style.height=h+"px";
    document.querySelector(".output-container").style.maxHeight=h+"px";
    console.log("input code length:", code.length,"\nminified code length:", result.length,"\nreduction ratio:", ((code.length - result.length) / code.length * 100).toFixed(2) + "%");
}