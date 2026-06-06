export let db=[];
export async function loadDatabase(){
    const text=await fetch("../database.txt")
        .then(r=>r.text());
    db=text
        .split(/\r?\n/)
        .map(x=>x.trim())
        .filter(Boolean);
        //길이내림차순 정렬
    db.sort((a,b)=>b.length-a.length);
    console.log("database loaded:",db.length);
}