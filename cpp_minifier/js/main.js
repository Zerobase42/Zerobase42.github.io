import {loadDatabase}
from "./database.js";

import {
    updateLineNumbers,
    updateHighlight
}
from "./editor.js";

import {minifyCode}
from "./output.js";

import {loadSharedCode}
from "./share.js";

window.addEventListener(
    "DOMContentLoaded",
    ()=>{
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
            .addEventListener(
                "scroll",
                function(){
                    document.getElementById("outputLineNumbers")
                        .scrollTop=this.scrollTop;
                }
            );
        updateLineNumbers();
        updateHighlight();
    }
);