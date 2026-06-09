console.log("shareCode.js loaded");

import {minify} from "./minifier.js";
import {
    compress, decompress
} from "./compress.js";

export function shareCode(){
    const code=document.getElementById("input").value;
    const compressed=compress(code);
    const url=location.origin+location.pathname+"?code="+encodeURIComponent(compressed);
    navigator.clipboard.writeText(url);
    console.log("compressed code:", compressed);
    alert("링크가 복사되었습니다.\nlink :"+url);
}