console.log("stringProtect.js loaded");

export function protectStrings(code){
    const saved=[];
    let result="";
    let i=0;
    function store(str){
        const id=saved.length;
        saved.push(str);
        return `__STR_${id}__`;
    }
    while(i<code.length){
        //Raw String
        let rawMatch=code.slice(i).match(/^(?:u8|u|U|L)?R"([^()\\\t\r\n]{0,16})\(/);
        if(rawMatch){
            const delim=rawMatch[1];
            const startLen=rawMatch[0].length;
            const endTag=")"+delim+"\"";
            const endPos=code.indexOf(endTag,i+startLen);
            if(endPos!==-1){
                const raw=code.slice(i,endPos+endTag.length);
                result+=store(raw);
                i=endPos+endTag.length;
                continue;
            }
        }
        //일반 문자열
        let prefix=null;
        if(code.startsWith("u8\"",i)||
            code.startsWith("u\"",i)||
            code.startsWith("U\"",i)||
            code.startsWith("L\"",i)){
            if(code.startsWith("u8\"",i)) prefix="u8";
            else prefix=code[i];
        }
        if(code[i]==='"'||prefix!==null){
            const start=i;
            if(prefix==="u8") i+=2;
            else if(prefix) i+=1;
            i++;//"
            while(i<code.length){
                if(code[i]==='\\'){
                    i+=2;
                    continue;
                }
                if(code[i]==='"'){
                    i++;
                    break;
                }
                i++;
            }
            result+=store(code.slice(start,i));
            continue;
        }
        //문자 리터럴
        if(code[i]==='\''||
            code.startsWith("L\'",i)||
            code.startsWith("u\'",i)||
            code.startsWith("U\'",i)){
            const start=i;
            if(code[i]!=='\'')
                i++;
            i++;//'
            while(i<code.length){
                if(code[i]==='\\'){
                    i+=2;
                    continue;
                }
                if(code[i]==='\''){
                    i++;
                    break;
                }
                i++;
            }
            result+=store(code.slice(start,i));
            continue;
        }
        result+=code[i];
        i++;
    }
    return{code:result,strings:saved};
}
export function restoreStrings(code,strings){
    return code.replace(/__STR_(\d+)__/g,(_,n)=>strings[+n]);
}