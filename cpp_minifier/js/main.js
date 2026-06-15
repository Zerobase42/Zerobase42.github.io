console.log("MAIN START");
window.onerror=(...a)=>console.log("ERROR",a);

console.log("main.js loaded");

import {loadDatabase}
from "./database.js";

import {
    updateLineNumbers,
    updateHighlight
}
from "./update.js";

import {minifyCode}
from "./output.js";

import {shareCode}
from "./share.js";

import {decompress}
from "./compress.js";

window.addEventListener(
    "DOMContentLoaded",
    async ()=>{
        await loadDatabase();
        const params=new URLSearchParams(location.search);
        const shared=params.get("code");
        if(shared){
            console.log("Shared code:", shared);
            try{
                document
                    .getElementById("input")
                    .value=await decompress(shared);
            }
            catch(e){
                alert("Failed to restore shared code. please check the link.");
                console.error("공유 코드 복원 실패",e);
            }
        }
        const input=document.getElementById("input");
        input.addEventListener("input",
            ()=>{
                updateLineNumbers();
                updateHighlight();
            }
        );
        input.addEventListener("scroll",
            ()=>{
                const pre=document.getElementById("input-highlight");
                const nums=document.getElementById("lineNumbers");
                pre.scrollTop=input.scrollTop;
                pre.scrollLeft=input.scrollLeft;
                nums.scrollTop=input.scrollTop;
            }
        );
        document
            .getElementById("minify-btn")
            .addEventListener( "click",minifyCode);
        document
            .getElementById("switch")
            .addEventListener("change",minifyCode);
        document
            .getElementById("output-highlight")
            .addEventListener("scroll",
                function(){
                    document
                        .getElementById("outputLineNumbers")
                        .scrollTop=this.scrollTop;
                }
            );
        document
            .getElementById("share-btn")
            .addEventListener("click", shareCode);
        updateLineNumbers();
        updateHighlight();
    }
);

//=====Output Copy=====
const outputContainer=document.querySelector(".output-container");
const outputCode=document.getElementById("output-code");
//Copy 버튼 생성
const outputTabbar=document.querySelector("h2 + .window .tabbar");
const copyBtn=document.createElement("button");
copyBtn.id="copy-btn";
copyBtn.className="copy-btn";
copyBtn.textContent="Copy";
outputTabbar.appendChild(copyBtn);
//클릭 시 포커스
outputContainer.tabIndex=0;
outputContainer.addEventListener("click",()=>{
    outputContainer.focus();
});
//Ctrl+A → 출력 코드만 선택
outputContainer.addEventListener("keydown",(e)=>{
    if(e.ctrlKey&&e.key.toLowerCase()==="a"){
        e.preventDefault();
        const range=document.createRange();
        range.selectNodeContents(outputCode);
        const selection=window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
});
//Copy 버튼
copyBtn.addEventListener("click",async()=>{
    try{
        await navigator.clipboard.writeText(outputCode.textContent);
        const oldText=copyBtn.textContent;
        copyBtn.textContent="Copied!";
        copyBtn.disabled=true;
        setTimeout(()=>{
            copyBtn.textContent=oldText;
            copyBtn.disabled=false;
        },1000);
    }catch(err){
        console.error("Copy failed:",err);
        copyBtn.textContent="Failed";
        setTimeout(()=>{
            copyBtn.textContent="Copy";
        },1000);
    }
});
//Ctrl+C도 강제 복사
outputContainer.addEventListener("keydown",async(e)=>{
    if(e.ctrlKey&&e.key.toLowerCase()==="c"){
        const selected=window.getSelection().toString();
        if(selected.length){
            e.preventDefault();
            try{
                await navigator.clipboard.writeText(selected);
            }catch(err){
                console.error(err);
            }
        }
    }
});