import{
    mkdtempSync,
    writeFileSync,
    rmSync
}from "node:fs";
import{tmpdir}from "node:os";
import{
    join,
    resolve,
    isAbsolute
}from "node:path";
import{execFileSync}from "node:child_process";
const ALPHABET=
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DECLARATION_KINDS=new Set([
    "VarDecl",
    "ParmVarDecl",
    "BindingDecl",
    "FieldDecl",
    "NonTypeTemplateParmDecl"
]);
const REFERENCE_KINDS=new Set([
    "DeclRefExpr",
    "MemberExpr"
]);
const RESERVED_WORDS=new Set(`
    alignas alignof
    and and_eq asm auto
    bitand bitor bool break
    case catch char char8_t char16_t char32_t class compl
    concept const consteval constexpr constinit const_cast
    continue co_await co_return co_yield
    decltype default delete do double dynamic_cast
    else enum explicit export extern
    false float for friend
    goto if inline int
    long mutable namespace new noexcept not not_eq nullptr
    operator or or_eq
    private protected public
    register reinterpret_cast requires return
    short signed sizeof static static_assert static_cast
    struct switch
    template this thread_local throw true try typedef typeid
    typename union unsigned using
    virtual void volatile
    wchar_t while xor xor_eq
    _Alignas _Alignof _Atomic _Bool _Complex
    _Generic _Imaginary _Noreturn _Static_assert _Thread_local
    typeof typeof_unqual
    final override import module
`.trim().split(/\s+/));
function encodeName(index){
    let name="";
    do{
        name=ALPHABET[index%52]+name;
        index=Math.floor(index/52)-1;
    }while(index>=0);
    return name;
}
function normalizePath(file){
    if(!file){
        return null;
    }
    let result=isAbsolute(file)
        ?file
        :resolve(file);
    result=result.replace(/\\/g,"/");
    if(process.platform==="win32"){
        result=result.toLowerCase();
    }
    return result;
}
function resolveLocation(location,currentFile){
    if(!location){
        return{
            file:currentFile,
            point:null
        };
    }
    let loc=location;
    while(loc&&(loc.spellingLoc||loc.expansionLoc)){
        loc=loc.spellingLoc??loc.expansionLoc;
    }
    if(!loc){
        return{
            file:currentFile,
            point:null
        };
    }
    const file=loc.file
        ?normalizePath(loc.file)
        :currentFile;
    const point=Number.isInteger(loc.offset)
        ?{
            offset:loc.offset,
            length:Number.isInteger(loc.tokLen)
                ?loc.tokLen
                :0
        }
        :null;
    return{
        file,
        point
    };
}
function walkAst(node,currentFile,onNode){
    if(!node||typeof node!=="object"){
        return currentFile;
    }
    const declaration=resolveLocation(
        node.loc,
        currentFile
    );
    currentFile=declaration.file;
    const rangeBegin=resolveLocation(
        node.range?.begin,
        currentFile
    );
    currentFile=rangeBegin.file;
    const rangeEnd=resolveLocation(
        node.range?.end,
        currentFile
    );
    currentFile=rangeEnd.file;
    const positions={
        declarationPoint:declaration.point,
        declarationFile:declaration.file,
        rangeBeginPoint:rangeBegin.point,
        rangeEndPoint:rangeEnd.point,
        rangeFile:rangeEnd.file
    };
    onNode(node,positions);
    if(Array.isArray(node.inner)){
        for(const child of node.inner){
            currentFile=walkAst(
                child,
                currentFile,
                onNode
            );
        }
    }
    return currentFile;
}
function verifyToken(
    buffer,
    point,
    expected,
    description
){
    if(!point){
        throw new Error(
            `${description}:소스 위치를 확인할 수 없습니다.`
        );
    }
    const length=point.length||
        Buffer.byteLength(expected,"utf8");
    const actual=buffer.subarray(
        point.offset,
        point.offset+length
    ).toString("utf8");
    if(actual!==expected){
        throw new Error(
            `${description}:소스 토큰이 일치하지 않습니다.\n`+
            `예상:${expected}\n`+
            `실제:${actual}`
        );
    }
    return{
        offset:point.offset,
        length
    };
}
function executeClang(
    compiler,
    args,
    description
){
    try{
        return execFileSync(
            compiler,
            args,
            {
                encoding:"utf8",
                maxBuffer:512*1024*1024,
                windowsHide:true,
                stdio:[
                    "ignore",
                    "pipe",
                    "pipe"
                ]
            }
        );
    }catch(error){
        const stderr=(
            error.stderr??
            error.message??
            ""
        ).toString();
        throw new Error(
            `${description}\n${stderr.slice(-12000)}`
        );
    }
}
function collectMacroNames(
    compiler,
    baseArgs,
    sourcePath
){
    const names=new Set();
    try{
        const output=executeClang(
            compiler,
            [
                ...baseArgs,
                "-E",
                "-dM",
                sourcePath
            ],
            "매크로 분석 실패"
        );
        const pattern=
            /^#define\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
        let match;
        while((match=pattern.exec(output))!==null){
            names.add(match[1]);
        }
    }catch(error){
    }
    return names;
}
export function renameVariables(source,options={}){
    if(typeof source!=="string"){
        throw new TypeError(
            "source must be a string"
        );
    }
    const language=options.language??"cpp";
    const standard=options.standard??
        (language==="c"?"c17":"c++20");
    const compiler=options.compiler??
        (language==="c"?"clang":"clang++");
    const compilerArgs=options.compilerArgs??[];
    const includeDirs=options.includeDirs??[];
    const sourceDir=resolve(
        options.sourceDir??process.cwd()
    );
    if(language!=="c"&&language!=="cpp"){
        throw new Error(
            "language는 c 또는 cpp이어야 합니다."
        );
    }
    if(
        !Array.isArray(compilerArgs)||
        !Array.isArray(includeDirs)
    ){
        throw new TypeError(
            "compilerArgs와 includeDirs는 배열이어야 합니다."
        );
    }
    const extension=language==="c"
        ?".c"
        :".cpp";
    const tempDir=mkdtempSync(
        join(tmpdir(),"variable-rename-")
    );
    const sourcePath=join(
        tempDir,
        "input"+extension
    );
    const inputPath=normalizePath(sourcePath);
    const sourceBuffer=Buffer.from(
        source,
        "utf8"
    );
    try{
        writeFileSync(
            sourcePath,
            sourceBuffer
        );
        const includeArgs=[
            "-iquote",
            sourceDir
        ];
        for(const dir of includeDirs){
            includeArgs.push(
                "-I",
                resolve(dir)
            );
        }
        const baseArgs=[
            "-x",
            language==="c"?"c":"c++",
            `-std=${standard}`,
            "-fno-color-diagnostics",
            ...includeArgs,
            ...compilerArgs
        ];
        const astText=executeClang(
            compiler,
            [
                ...baseArgs,
                "-fsyntax-only",
                "-Xclang",
                "-ast-dump=json",
                sourcePath
            ],
            "Clang AST 분석 실패"
        );
        let ast;
        try{
            ast=JSON.parse(astText);
        }catch{
            throw new Error(
                "Clang AST JSON 파싱 실패"
            );
        }
        const usedNames=new Set(
            source.match(
                /[A-Za-z_][A-Za-z0-9_]*/g
            )??[]
        );
        for(const word of RESERVED_WORDS){
            usedNames.add(word);
        }
        const macroNames=collectMacroNames(
            compiler,
            baseArgs,
            sourcePath
        );
        for(const name of macroNames){
            usedNames.add(name);
        }
        const declarations=new Map();
        const references=[];
        const state={
            currentFile:null
        };
        walkAst(
            ast,
            state.currentFile,
            (node,positions)=>{
                if(
                    DECLARATION_KINDS.has(node.kind)&&
                    node.id&&
                    node.name&&
                    !node.isImplicit
                ){
                    if(
                        positions.declarationFile!==inputPath
                    ){
                        return;
                    }
                    const token=verifyToken(
                        sourceBuffer,
                        positions.declarationPoint,
                        node.name,
                        `${node.kind}'${node.name}'`
                    );
                    declarations.set(node.id,{
                        id:node.id,
                        name:node.name,
                        offset:token.offset,
                        length:token.length,
                        previousDecl:
                            node.previousDecl??null
                    });
                    return;
                }
                if(REFERENCE_KINDS.has(node.kind)){
                    let referencedId=null;
                    if(node.kind==="DeclRefExpr"){
                        referencedId=
                            node.referencedDecl?.id;
                    }
                    else if(node.kind==="MemberExpr"){
                        referencedId=
                            node.referencedMemberDecl;
                    }
                    if(referencedId){
                        references.push({
                            id:referencedId,
                            point:positions.rangeEndPoint,
                            file:positions.rangeFile
                        });
                    }
                }
                if(
                    node.kind==="DesignatedInitExpr"&&
                    Array.isArray(node.designators)
                ){
                    for(const designator of node.designators){
                        const id=designator.field?.id;
                        if(!id){
                            continue;
                        }
                        const location=resolveLocation(
                            designator.fieldLoc,
                            positions.rangeFile
                        );
                        references.push({
                            id,
                            point:location.point,
                            file:location.file
                        });
                    }
                }
                if(
                    node.kind==="OffsetOfExpr"&&
                    Array.isArray(node.components)
                ){
                    for(const component of node.components){
                        const id=component.field?.id;
                        if(!id){
                            continue;
                        }
                        const location=resolveLocation(
                            component.fieldLoc,
                            positions.rangeFile
                        );
                        references.push({
                            id,
                            point:location.point,
                            file:location.file
                        });
                    }
                }
            }
        );
        const parent=new Map();
        for(const declaration of declarations.values()){
            const previous=declaration.previousDecl;
            parent.set(
                declaration.id,
                previous&&declarations.has(previous)
                    ?previous
                    :declaration.id
            );
        }
        function findRoot(id){
            let root=id;
            while(
                parent.has(root)&&
                parent.get(root)!==root
            ){
                root=parent.get(root);
            }
            let current=id;
            while(
                parent.has(current)&&
                parent.get(current)!==root
            ){
                const next=parent.get(current);
                parent.set(current,root);
                current=next;
            }
            return root;
        }
        const blockedRoots=new Set();
        for(const declaration of declarations.values()){
            if(
                declaration.previousDecl&&
                !declarations.has(declaration.previousDecl)
            ){
                blockedRoots.add(
                    findRoot(declaration.id)
                );
            }
        }
        const groups=new Map();
        for(const declaration of declarations.values()){
            const root=findRoot(declaration.id);
            if(blockedRoots.has(root)){
                continue;
            }
            if(!groups.has(root)){
                groups.set(root,[]);
            }
            groups.get(root).push(declaration);
        }
        const orderedGroups=[...groups.entries()].sort(
            (a,b)=>{
                const aOffset=Math.min(
                    ...a[1].map(item=>item.offset)
                );
                const bOffset=Math.min(
                    ...b[1].map(item=>item.offset)
                );
                return aOffset-bOffset;
            }
        );
        const renamed=new Map();
        let index=0;
        for(const[root]of orderedGroups){
            let newName;
            do{
                newName=encodeName(index++);
            }while(usedNames.has(newName));
            usedNames.add(newName);
            renamed.set(
                root,
                newName
            );
        }
        const patches=new Map();
        function addPatch(
            point,
            oldName,
            newName,
            description
        ){
            const token=verifyToken(
                sourceBuffer,
                point,
                oldName,
                description
            );
            const existing=patches.get(
                token.offset
            );
            if(existing){
                if(
                    existing.newName!==newName||
                    existing.length!==token.length
                ){
                    throw new Error(
                        "동일한 소스 위치에 서로 다른 변수가 연결되었습니다."
                    );
                }
                return;
            }
            patches.set(
                token.offset,
                {
                    offset:token.offset,
                    length:token.length,
                    newName
                }
            );
        }
        for(const[root,members]of orderedGroups){
            const newName=renamed.get(root);
            for(const declaration of members){
                addPatch(
                    {
                        offset:declaration.offset,
                        length:declaration.length
                    },
                    declaration.name,
                    newName,
                    `변수 선언 '${declaration.name}'`
                );
            }
        }
        for(const reference of references){
            if(!declarations.has(reference.id)){
                continue;
            }
            const root=findRoot(reference.id);
            const newName=renamed.get(root);
            if(!newName){
                continue;
            }
            if(
                reference.file!==inputPath||
                !reference.point
            ){
                throw new Error(
                    "변수 참조의 수정 위치가 입력 파일에서 확인되지 않습니다. "+
                    "매크로 또는 외부 선언을 확인하세요: "+
                    declarations.get(reference.id).name
                );
            }
            const declaration=
                declarations.get(reference.id);
            addPatch(
                reference.point,
                declaration.name,
                newName,
                `변수 참조 '${declaration.name}'`
            );
        }
        const sortedPatches=[...patches.values()]
            .sort((a,b)=>a.offset-b.offset);
        if(sortedPatches.length===0){
            return source;
        }
        const chunks=[];
        let cursor=0;
        for(const patch of sortedPatches){
            if(patch.offset<cursor){
                throw new Error(
                    "변수명 변경 위치가 서로 겹칩니다."
                );
            }
            chunks.push(
                sourceBuffer.subarray(
                    cursor,
                    patch.offset
                )
            );
            chunks.push(
                Buffer.from(
                    patch.newName,
                    "utf8"
                )
            );
            cursor=patch.offset+patch.length;
        }
        chunks.push(
            sourceBuffer.subarray(cursor)
        );
        return Buffer.concat(chunks).toString("utf8");
    }finally{
        rmSync(
            tempDir,
            {
                recursive:true,
                force:true
            }
        );
    }
}