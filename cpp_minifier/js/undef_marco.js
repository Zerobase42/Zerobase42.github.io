console.log("undef_macro.js loaded");
export function undef_macro(code){
    const defines=Object.create(null);
    const functionLike=Object.create(null);
    const PASS=Symbol("PASS");
    const active=[];
    const taken=[];
    const lines=typeof code==="string"
        ?code.split(/\r?\n/)
        :code;
    let res="";
    function parent_active(){
        if(!active.length)return true;
        const v=active[active.length-1];
        return v===PASS?PASS:v;
    }
    function expand(text){
        let prev;
        let iter=0;
        do{
            prev=text;
            text=text.replace(/\b[A-Za-z_]\w*\b/g,token=>{
                if(Object.prototype.hasOwnProperty.call(defines,token))
                    return defines[token];
                return token;
            });
            iter++;
        }while(text!==prev&&iter<100);
        return text;
    }
    //true->조건 참
    //false->조건 거짓
    //PASS->알 수 없는 매크로가 있으므로 평가하지 않음
    function eval_if(expr){
        expr=expr.trim();
        //defined(MACRO)
        expr=expr.replace(
            /defined\s*\(\s*([A-Za-z_]\w*)\s*\)/g,
            (_,name)=>
                Object.prototype.hasOwnProperty.call(defines,name)
                    ?"1"
                    :"0"
        );
        //defined MACRO
        expr=expr.replace(
            /defined\s+([A-Za-z_]\w*)/g,
            (_,name)=>
                Object.prototype.hasOwnProperty.call(defines,name)
                    ?"1"
                    :"0"
        );
        expr=expand(expr);
        let unknown=false;
        expr=expr.replace(/\b[A-Za-z_]\w*\b/g,name=>{
            if(Object.prototype.hasOwnProperty.call(defines,name))
                return defines[name];
            //JS 예약어는 그대로 둔다.
            if(
                name==="true"||
                name==="false"||
                name==="null"
            )
                return name;
            //선언되지 않은 전처리 매크로
            //(__linux__,__cplusplus 등)
            unknown=true;
            return name;
        });
        if(unknown)
            return PASS;
        try{
            return !!Function(
                `"use strict";return(${expr});`
            )();
        }catch{
            return PASS;
        }
    }
    let res="";
    for(const line of lines){
        const s=line.trimStart();
        if(s.startsWith("#define")){
            const rest=s.slice(7).trim();
            const m=rest.match(
                /^([A-Za-z_]\w*(?:\s*\([^)]*\))?)(?:\s+(.*))?$/
            );
            if(m){
                let name=m[1].trim();
                let value=m[2]??"1";
                value=value
                    .replace(/\/\/.*$/g,"")
                    .replace(/\/\*[\s\S]*?\*\//g,"")
                    .trim();
                if(name.includes("(")){
                    functionLike[name.replace(/\s+/g,"")]=value;
                }else{
                    defines[name]=value;
                }
            }
            continue;
        }
        if(s.startsWith("#undef")){
            const name=s.slice(6).trim().split(/\s+/)[0];
            delete defines[name];
            delete functionLike[name];
            continue;
        }
        if(s.startsWith("#ifdef")){
            const name=s.split(/\s+/)[1];
            const cond=Object.prototype.hasOwnProperty.call(defines,name);
            active.push(parent_active()===PASS?PASS:parent_active()&&cond);
            taken.push(cond);
            continue;
        }
        if(s.startsWith("#ifndef")){
            const name=s.split(/\s+/)[1];
            const cond=!Object.prototype.hasOwnProperty.call(defines,name);
            active.push(parent_active()===PASS?PASS:parent_active()&&cond);
            taken.push(cond);
            continue;
        }
        if(
            s.startsWith("#if")&&
            !s.startsWith("#ifdef")&&
            !s.startsWith("#ifndef")
        ){
            const cond=eval_if(s.slice(3));
            if(cond===PASS){
                active.push(PASS);
                taken.push(PASS);
                res+=line+"\n";
            }else{
                active.push(parent_active()&&cond);
                taken.push(cond);
            }
            continue;
        }
        if(s.startsWith("#elif")){
            if(active[active.length-1]===PASS){
                res+=line+"\n";
                continue;
            }
            const parent=
                active.length>=2
                    ?active[active.length-2]
                    :true;
            if(taken[taken.length-1]){
                active[active.length-1]=false;
            }else{
                const cond=eval_if(s.slice(5));
                if(cond===PASS){
                    active[active.length-1]=PASS;
                    res+=line+"\n";
                }else{
                    active[active.length-1]=parent&&cond;
                    if(cond)
                        taken[taken.length-1]=true;
                }
            }
            continue;
        }
        if(s.startsWith("#else")){
            if(active[active.length-1]===PASS){
                res+=line+"\n";
                continue;
            }
            const parent=
                active.length>=2
                    ?active[active.length-2]
                    :true;
            if(taken[taken.length-1]){
                active[active.length-1]=false;
            }else{
                active[active.length-1]=parent;
                taken[taken.length-1]=true;
            }
            continue;
        }
        if(s.startsWith("#endif")){
            if(active[active.length-1]===PASS)
                res+=line+"\n";
            active.pop();
            taken.pop();
            continue;
        }
        const state=parent_active();
        if(state===PASS){
            //평가하지 않는 전처리 블록 내부
            //객체형 매크로만 치환하고 나머지는 그대로 출력
            const out=line.replace(/\b[A-Za-z_]\w*\b/g,token=>{
                if(Object.prototype.hasOwnProperty.call(functionLike,token))
                    return token;
                if(Object.prototype.hasOwnProperty.call(defines,token))
                    return expand(defines[token]);
                return token;
            });
            res+=out+"\n";
        }
        else if(state){
            //활성 블록
            const out=line.replace(/\b[A-Za-z_]\w*\b/g,token=>{
                if(Object.prototype.hasOwnProperty.call(functionLike,token))
                    return token;
                if(Object.prototype.hasOwnProperty.call(defines,token))
                    return expand(defines[token]);
                return token;
            });
            res+=out+"\n";
        }
        //state===false 이면 출력하지 않음
    }
    return res;
}