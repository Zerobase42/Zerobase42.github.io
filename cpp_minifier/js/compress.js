console.log("compress.js loaded");

import base85 from "https://cdn.jsdelivr.net/npm/@alttiri/base85@1.8.0/base85.min.js";

export function compress(text){
    const compressed=pako.gzip(text,{level:9});
    return encodeURIComponent(base85.encode(compressed));
}
export function decompress(encoded){
    const compressed=base85.decode(encoded);
    return pako.ungzip(compressed,{to:"string"});
}