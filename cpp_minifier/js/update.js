console.log("update.js loaded");

export function updateHighlight(){
    const input=document.getElementById("input");
    const code=document.getElementById("input-code");
    code.innerHTML=hljs.highlight(input.value,{language:"cpp"}).value;
}
export function updateEditorSize(){
    const input=document.getElementById("input");
    input.style.height="auto";
    const h=Math.min(Math.max(280,input.scrollHeight),500);
    input.style.height=h+"px";
    document.getElementById("input-highlight").style.height=h+"px";
    document.getElementById("lineNumbers").style.height=h+"px";
}
export function updateLineNumbers(){
    const input=document.getElementById("input");
    const lines=input.value.split("\n").length;
    document.getElementById("lineNumbers")
        .innerHTML=Array.from({length:lines},(_,i)=>i+1)
        .join("\n");
    updateEditorSize();
}