import {createCompileClient} from
    "./wasm-clang-runtime/src/compile-client.js";

// ============================================================
// 설정
// ============================================================

const ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const DECLARATION_KINDS = new Set([
    "VarDecl",
    "ParmVarDecl",
    "FieldDecl",
    "BindingDecl",
    "IndirectFieldDecl",
    "NonTypeTemplateParmDecl"
]);

const RESERVED_WORDS = `
    alignas alignof and and_eq asm auto
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
    template this thread_local throw true try
    typedef typeid typename union unsigned using
    virtual void volatile wchar_t while xor xor_eq

    _Alignas _Alignof _Atomic _Bool _Complex
    _Generic _Imaginary _Noreturn _Static_assert _Thread_local
`.trim().split(/\s+/);

// ============================================================
// Clang Worker
// ============================================================

let clangClient = null;

let inputCounter = 0;

function getClangClient(){

    if(!clangClient){
        clangClient = createCompileClient();
    }

    return clangClient;
}

// ============================================================
// 1. 변수명 생성
// ============================================================

function encodeName(index){

    let name = "";

    do{

        name = ALPHABET[index % 52] + name;

        index = Math.floor(index / 52) - 1;

    }while(index >= 0);

    return name;
}

// ============================================================
// 2. AST 순회
// ============================================================

function walkAst(root,callback){

    const stack = [root];

    while(stack.length){

        const node = stack.pop();

        if(!node || typeof node !== "object"){
            continue;
        }

        callback(node);

        if(Array.isArray(node.inner)){

            for(let i=node.inner.length-1; i>=0; i--){

                stack.push(node.inner[i]);
            }
        }
    }
}

// ============================================================
// 3. 직접 수정 가능한 소스 위치 검사
// ============================================================

function getSourcePoint(location){

    if(!location || typeof location !== "object"){
        return null;
    }

    // 매크로 확장 위치는 직접 수정하지 않음
    if(
        location.spellingLoc ||
        location.expansionLoc
    ){
        return null;
    }

    if(!Number.isInteger(location.offset)){
        return null;
    }

    return {

        offset: location.offset,

        length: Number.isInteger(location.tokLen)
            ? location.tokLen
            : 0

    };
}

// ============================================================
// 4. 참조 위치 수집
// ============================================================

function collectReferences(node,references){

    // 일반 변수 참조
    if(node.kind === "DeclRefExpr"){

        const target = node.referencedDecl;

        if(target?.id && DECLARATION_KINDS.has(target.kind)){

            references.push({

                id: target.id,

                point: getSourcePoint(
                    node.range?.end
                )

            });
        }
    }

    // 구조체 / 클래스 멤버 참조
    if(node.kind === "MemberExpr"){

        const id = node.referencedMemberDecl;

        if(id){

            references.push({

                id,

                point: getSourcePoint(
                    node.range?.end
                )

            });
        }
    }

    // 지정 초기화
    // struct S x = {.value = 10};
    if(node.kind === "DesignatedInitExpr"){

        for(const designator of node.designators ?? []){

            const id = designator.field?.id;

            if(id){

                references.push({

                    id,

                    point: getSourcePoint(
                        designator.fieldLoc
                    )

                });
            }
        }
    }

    // offsetof
    if(node.kind === "OffsetOfExpr"){

        for(const component of node.components ?? []){

            const id = component.field?.id;

            if(id){

                references.push({

                    id,

                    point: getSourcePoint(
                        component.fieldLoc
                    )

                });
            }
        }
    }
}

// ============================================================
// 5. 변수 선언 수집
// ============================================================

function collectDeclarations(ast){

    const declarations = new Map();

    const references = [];

    walkAst(ast,node=>{

        if(
            DECLARATION_KINDS.has(node.kind) &&
            node.id &&
            node.name &&
            !node.isImplicit
        ){

            declarations.set(node.id,{

                id: node.id,

                name: node.name,

                point: getSourcePoint(node.loc),

                previousDecl: node.previousDecl ?? null

            });
        }

        collectReferences(
            node,
            references
        );
    });

    return {
        declarations,
        references
    };
}

// ============================================================
// 6. 동일 변수의 재선언 연결
// ============================================================

function createDeclarationGroups(declarations,references){

    const parent = new Map();

    for(const declaration of declarations.values()){

        parent.set(
            declaration.id,
            declaration.id
        );
    }

    function find(id){

        let root = id;

        while(
            parent.has(root) &&
            parent.get(root) !== root
        ){

            root = parent.get(root);
        }

        let current = id;

        while(
            parent.has(current) &&
            parent.get(current) !== root
        ){

            const next = parent.get(current);

            parent.set(current,root);

            current = next;
        }

        return root;
    }

    function unite(a,b){

        if(!parent.has(a) || !parent.has(b)){
            return;
        }

        const rootA = find(a);
        const rootB = find(b);

        if(rootA !== rootB){

            parent.set(rootB,rootA);
        }
    }

    // 이전 선언과 현재 선언 연결
    for(const declaration of declarations.values()){

        if(declaration.previousDecl){

            unite(
                declaration.id,
                declaration.previousDecl
            );
        }
    }

    const groups = new Map();

    for(const declaration of declarations.values()){

        const root = find(declaration.id);

        if(!groups.has(root)){
            groups.set(root,[]);
        }

        groups.get(root).push(declaration);
    }

    // 매크로 위치 또는 외부 파일 선언이 연결된 변수는
    // 부분 변경하지 않도록 전체 그룹을 제외
    const blocked = new Set();

    for(const declaration of declarations.values()){

        const root = find(declaration.id);

        if(
            !declaration.point ||
            (
                declaration.previousDecl &&
                !declarations.has(declaration.previousDecl)
            )
        ){

            blocked.add(root);
        }
    }

    for(const reference of references){

        if(!declarations.has(reference.id)){
            continue;
        }

        if(!reference.point){

            blocked.add(
                find(reference.id)
            );
        }
    }

    return {
        find,
        groups,
        blocked
    };
}

// ============================================================
// 7. 새 변수명 할당
// ============================================================

function assignNames(source,groups,blocked){

    const usedNames = new Set(
        source.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []
    );

    for(const word of RESERVED_WORDS){

        usedNames.add(word);
    }

    const ordered = [];

    for(const [root,members] of groups){

        if(blocked.has(root)){
            continue;
        }

        const firstOffset = members.reduce(

            (min,item)=>Math.min(
                min,
                item.point?.offset ?? Infinity
            ),

            Infinity
        );

        ordered.push({
            root,
            members,
            firstOffset
        });
    }

    ordered.sort(
        (a,b)=>a.firstOffset-b.firstOffset
    );

    const renamed = new Map();

    let index = 0;

    for(const group of ordered){

        let name;

        do{

            name = encodeName(index++);

        }while(usedNames.has(name));

        usedNames.add(name);

        renamed.set(
            group.root,
            name
        );
    }

    return renamed;
}

// ============================================================
// 8. 소스 변경 위치 등록
// ============================================================

function createPatches(sourceBuffer){

    const patches = new Map();

    const decoder = new TextDecoder();

    function add(point,oldName,newName){

        if(!point){
            throw new Error(
                "변수의 소스 위치가 유효하지 않습니다."
            );
        }

        const length = point.length ||
            new TextEncoder().encode(oldName).length;

        const actual = decoder.decode(

            sourceBuffer.subarray(
                point.offset,
                point.offset + length
            )
        );

        if(actual !== oldName){

            throw new Error(
                `소스 위치 불일치: ${oldName} / ${actual}`
            );
        }

        const previous = patches.get(point.offset);

        if(previous){

            if(
                previous.newName !== newName ||
                previous.length !== length
            ){

                throw new Error(
                    "동일 위치에 서로 다른 변수명이 지정되었습니다."
                );
            }

            return;
        }

        patches.set(point.offset,{

            offset: point.offset,

            length,

            newName

        });
    }

    return {
        patches,
        add
    };
}

// ============================================================
// 9. 변수명 변경
// ============================================================

export async function renameVariables(source,options={}){

    if(typeof source !== "string"){

        throw new TypeError(
            "source must be a string"
        );
    }

    const {

        onProgress = null

    } = options;

    const compiler = getClangClient();

    // ========================================================
    // Clang AST 생성
    // ========================================================

    const input = `rename_${++inputCounter}.cpp`;

    const {ast} = await compiler.astDump(

        source,

        {
            input,

            onProgress
        }
    );

    if(!ast){

        throw new Error(
            "Clang AST 생성에 실패했습니다."
        );
    }

    // ========================================================
    // 변수 선언 및 참조 분석
    // ========================================================

    const {

        declarations,
        references

    } = collectDeclarations(ast);

    if(declarations.size === 0){

        return source;
    }

    // ========================================================
    // 재선언과 스코프 대상 그룹 구성
    // ========================================================

    const {

        find,
        groups,
        blocked

    } = createDeclarationGroups(
        declarations,
        references
    );

    // ========================================================
    // 새 이름 할당
    // ========================================================

    const renamed = assignNames(
        source,
        groups,
        blocked
    );

    if(renamed.size === 0){

        return source;
    }

    // ========================================================
    // 소스 변경
    // ========================================================

    const sourceBuffer = new TextEncoder().encode(source);

    const {
        patches,
        add
    } = createPatches(sourceBuffer);

    // --------------------------------------------------------
    // 변수 선언 변경
    // --------------------------------------------------------

    for(const [root,members] of groups){

        const newName = renamed.get(root);

        if(!newName){
            continue;
        }

        for(const declaration of members){

            add(
                declaration.point,
                declaration.name,
                newName
            );
        }
    }

    // --------------------------------------------------------
    // 변수 참조 변경
    // --------------------------------------------------------

    for(const reference of references){

        if(!declarations.has(reference.id)){
            continue;
        }

        const root = find(reference.id);

        const newName = renamed.get(root);

        if(!newName){
            continue;
        }

        const declaration =
            declarations.get(reference.id);

        add(
            reference.point,
            declaration.name,
            newName
        );
    }

    // ========================================================
    // 원본 코드 재구성
    // ========================================================

    const sorted = [...patches.values()].sort(
        (a,b)=>a.offset-b.offset
    );

    const chunks = [];

    let cursor = 0;

    for(const patch of sorted){

        if(patch.offset < cursor){

            throw new Error(
                "변수 변경 위치가 중복되었습니다."
            );
        }

        chunks.push(
            sourceBuffer.subarray(
                cursor,
                patch.offset
            )
        );

        chunks.push(
            new TextEncoder().encode(patch.newName)
        );

        cursor = patch.offset + patch.length;
    }

    chunks.push(
        sourceBuffer.subarray(cursor)
    );

    const output = new Uint8Array(
        chunks.reduce(
            (sum,chunk)=>sum+chunk.length,
            0
        )
    );

    let offset = 0;

    for(const chunk of chunks){

        output.set(chunk,offset);

        offset += chunk.length;
    }

    return new TextDecoder().decode(output);
}