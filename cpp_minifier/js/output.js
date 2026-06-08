console.log("output.js loaded");

import {minify} from "./minifier.js";

export function minifyCode(){
    if(db.length===0){
        alert("database loading...");
        console.log("database is not defined. Please check the database.txt.");
        return;
    }
    const code=document.getElementById("input").value;
    const removeComments=document.getElementById("switch").checked;
    const result=minify(code,removeComments);
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
}