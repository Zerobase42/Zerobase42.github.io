console.log("shareCode.js loaded");

import {minify} from "./minifier.js";
import {
    compress, decompress
} from "./compress.js";

export async function shareCode(){
    const input=document.getElementById("input").value;
    const removeComments=document.getElementById("switch").checked;
    const minified=minify(input,removeComments);
    const compressed=await compress(minified);
    const url=location.origin+location.pathname+"?code="+compressed;
    await navigator.clipboard.writeText(url);
    alert("링크가 복사되었습니다.");
}