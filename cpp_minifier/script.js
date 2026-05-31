console.log("script loaded");
let db=[];
const HARD_TEXT="궭뷁쉛뤒";
async function loadDatabase(){
    const text=await fetch("database.txt")
        .then(r=>r.text());
    db=text
        .split(/\r?\n/)
        .map(x=>x.trim())
        .filter(Boolean);
    db.sort((a,b)=>b.length-a.length);
    console.log("database loaded:",db.length);
}
loadDatabase();
function protectStrings(code){
    const saved=[];
    let result="";
    let i=0;
    function store(str){
        const id=saved.length;
        saved.push(str);
        return `__STR_${id}__`;
    }
    while(i<code.length){
        let rawMatch=
            code.slice(i).match(
                /^(?:u8|u|U|L)?R"([^ ()\\\t\r\n]{0,16})\(/
            );

        if (rawMatch) {
            const delim = rawMatch[1];
            const startLen = rawMatch[0].length;

            const endTag = ")"+delim+"\"";
            const endPos=code.indexOf(
                endTag,
                i+startLen
            );
            if(endPos!==-1){
                const raw=
                    code.slice(
                        i,
                        endPos+endTag.length
                    );
                result+=store(raw);
                i=endPos+endTag.length;
                continue;
            }
        }
        let prefix=null;
        if(
            code.startsWith("u8\"",i)||
            code.startsWith("u\"",i)||
            code.startsWith("U\"",i)||
            code.startsWith("L\"",i)
        ){
            if(code.startsWith("u8\"",i))
                prefix="u8";
            else
                prefix=code[i];
        }
        if(
            code[i]==='"'||
            prefix!==null
        ){
            const start=i;
            if(prefix==="u8")
                i+=2;
            else if(prefix)
                i+=1;
            i++;
            code.startsWith("L\'",i)||
            code.startsWith("u\'",i)||
            code.startsWith("U\'",i)
        ){
            const start=i;
            if(
                code[i]!=='\''
            ){
                i++;
            }
            i++;
                    i++;
                    break;
                }
                i++;
            }
            result+=store(
                code.slice(start,i)
            );
            continue;
        }
        result+=code[i];
        i++;
    }
    return{
        code:result,
        strings:saved
    };
}
function restoreStrings(code,strings){
    return code.replace(
        /__STR_(\d+)__/g,
        (_,n)=>strings[+n]
    );
}
function minify(code,removeComments=true){
    const protectedData=
        protectStrings(code);
    code=protectedData.code;
    const lines=code.split('\n');
    const result=[];
    for(let line of lines){
        const stripped=line.trim();
        line=line.replaceAll("    ",HARD_TEXT);
        for(const op of db){
            line=line.replaceAll(" "+op+" ",op);
            line=line.replaceAll(op+" ",op);
            line=line.replaceAll(" "+op,op);
        }
        result.push(
            line.replaceAll(HARD_TEXT,"    ")
        );
    }
    code=result.join("\n");
    if(removeComments){
        code=code.replace(
            /\/\/[^\n]*/g,
            ""
        );
        code=code.replace(
            /\/\*[\s\S]*?\*\
            ""
        );
    }
    code=code.replace(
        /\n\s*\n+/g,
        "\n"
    );
    code=restoreStrings(
        code,
        protectedData.strings
    );
    return code;
}
function minifyCode(){
    if(db.length===0){
        alert("database is not loaded yet. Please wait a moment and try again.");
        return;
    }
    const code=
        document.getElementById("input").value;
    const removeComments=
        document.getElementById("switch").checked;
    const result=
        minify(code,removeComments);
    document
        .getElementById("output")
        .textContent=result;
}