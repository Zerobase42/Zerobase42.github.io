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
/* v.1.6 : code 공유 기능
import {loadSharedCode}
from "./share.js";
*/

window.addEventListener(
    "DOMContentLoaded",
    async ()=>{
        await loadDatabase();
        /* v.1.6 : code 공유 기능
        await loadSharedCode();
        */
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