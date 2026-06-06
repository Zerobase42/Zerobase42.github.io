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

window.addEventListener(
    "DOMContentLoaded",
    async ()=>{
        await loadDatabase();
        const params=new URLSearchParams(location.search);
        const shared=params.get("code");
        if(shared){
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
        updateLineNumbers();
        updateHighlight();
    }
);