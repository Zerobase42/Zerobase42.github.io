console.log("undef_macro.js loaded");
// 전처리 매크로를 처리하는 함수
// #define, #undef, #ifdef, #ifndef, #if, #elif, #else, #endif를 처리
// 정의된 매크로를 기반으로 코드에서 매크로를 치환
// 조건부 컴파일 블록을 평가하여 활성화된 코드만 출력
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
    function merge_state(parent, cond) {
        if (parent === false) return false;
        if (parent === PASS || cond === PASS) return PASS;
        return parent && cond;
    }
    function parent_active() {
        if (!active.length) return true;

        return active[active.length - 1];
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
        function expand_defined_only(expr){
            return expr.replace(/\b[A-Za-z_]\w*\b/g, t => {
                if (Object.prototype.hasOwnProperty.call(defines, t))
                    return defines[t];
                return t;
            });
        }
        expr = expr.trim();

        // 1. defined 처리
        expr = expr.replace(/defined\s*\(\s*([A-Za-z_]\w*)\s*\)/g,
            (_,n)=>defines[n] ? "1" : "0");

        expr = expr.replace(/defined\s+([A-Za-z_]\w*)/g,
            (_,n)=>defines[n] ? "1" : "0");

        // 2. ONLY defined macros expand
        expr = expand_defined_only(expr);

        // 3. unknown detection (여기가 핵심)
        const tokens = expr.match(/[A-Za-z_]\w*/g) || [];

        for (const t of tokens) {
            if (t === "true" || t === "false") continue;

            // 숫자로 이미 변환된 건 제외
            if (!/^\d+$/.test(t)) {
                return PASS; // unknown 존재 → 즉시 PASS
            }
        }

        // 4. safe eval
        try {
            return Boolean(Function(`"use strict"; return (${expr});`)());
        } catch {
            return PASS;
        }
    }
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
        if (s.startsWith("#ifdef")) {
            const name = s.split(/\s+/)[1];

           if (!Object.prototype.hasOwnProperty.call(defines, name)) {
                active.push(PASS);
                taken.push(PASS);
                res += line + "\n";
                continue;
            }

            active.push(merge_state(parent_active(), true));
            taken.push(true);
            continue;
        }
        if (s.startsWith("#ifndef")) {
            const name = s.split(/\s+/)[1];

            if (!Object.prototype.hasOwnProperty.call(defines, name)) {
                active.push(PASS);
                taken.push(PASS);
                res += line + "\n";
                continue;
            }

            active.push(false);
            taken.push(true);
            continue;
        }
        if (
            s.startsWith("#if") &&
            !s.startsWith("#ifdef") &&
            !s.startsWith("#ifndef")
        ) {
            const cond = eval_if(s.slice(3));

            if (cond === PASS) {
                if (cond === PASS) {
                    active[active.length - 1] = PASS;
                    taken[taken.length - 1] = PASS;
                    res += line + "\n";
                }

                active.push(merge_state(parent_active(), cond));
                taken.push(cond);

                continue;
            }
        }
        if (s.startsWith("#elif")) {

            if (active[active.length - 1] === PASS) {
                res += line + "\n";
                continue;
            }

            const parent =
                active.length >= 2
                    ? active[active.length - 2]
                    : true;

            if (taken[taken.length - 1]) {
                active[active.length - 1] = false;
            } else {
                const cond = eval_if(s.slice(5));

                if (cond === PASS) {
                    active[active.length - 1] = PASS;
                    taken[active.length - 1] = PASS;
                    res += line + "\n";
                } else {
                    active[active.length - 1] = parent && cond;
                    if (cond)
                        taken[taken.length - 1] = true;
                }
            }

            continue;
        }
        if (s.startsWith("#else")) {

            if (active[active.length - 1] === PASS) {
                res += line + "\n";
                continue;
            }

            const parent =
                active.length >= 2
                    ? active[active.length - 2]
                    : true;

            if (taken[taken.length - 1]) {
                active[active.length - 1] = false;
            } else {
                active[active.length - 1] = parent;
                taken[taken.length - 1] = true;
            }

            continue;
        }
        if (s.startsWith("#endif")) {

            if (active[active.length - 1] === PASS)
                res += line + "\n";

            active.pop();
            taken.pop();

            continue;
        }
        const state=parent_active();
        if (state !== false) {
            const out = line.replace(/\b[A-Za-z_]\w*\b/g, token => {
                if (Object.prototype.hasOwnProperty.call(functionLike, token))
                    return token;

                if (Object.prototype.hasOwnProperty.call(defines, token))
                    return expand(defines[token]);

                return token;
            });

            res += out + "\n";
        }
    }
    return res;
}

const __LOCAL__=false;
if(__LOCAL__){
    console.log(undef_macro(`
#define A 1
#define B 2
#define C A+B

// TEST 1: basic macro expansion
int t1 = A + B;   // expected: 3

// TEST 2: recursive expansion
int t2 = C;       // expected: 3

// TEST 3: if true branch
#if A == 1
int t3 = 10;      // expected: 10
#endif

// TEST 4: if false branch
#if A == 0
int t4 = 100;
#endif

// TEST 5: undefined macro should be PASS
#if __linux__
int t5 = 999;     // expected: unchanged block
#endif

// TEST 6: mixed known + unknown => PASS
#if A == 1 && __cplusplus
int t6 = 111;
#endif

// TEST 7: ifdef defined
#ifdef A
int t7 = 7;       // expected: 7
#endif

// TEST 8: ifndef defined (should skip body)
#ifndef A
int t8 = 888;
#endif

// TEST 9: complex expression
#if A + B == 3
int t9 = 9;       // expected: 9
#endif

// TEST 10: nested-like logic simulation
#if A == 1
#if B == 2
int t10 = 10;     // expected: 10
#endif
#endif

// TEST 11: unknown macro in middle => PASS whole line
#if A == __unknown_macro__
int t11 = 1111;
#endif

// TEST 12: raw macro usage in code
int t12 = A + C + 1;  // expected: 1 + 3 + 1 = 5`))
}