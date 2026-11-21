console.log("minifier.js loaded");
import{db}from "./database.js";
import{
    protectStrings,
    restoreStrings
}from "./stringProtect.js";
import{undef_macro}from "./undef_marco.js";
import{renameVariables}from "./variableRename.js";
const HARD_TEXT="궯둞쉞렣";
function removeCComments(code){
    code=code.replace(
        /\/\*[\s\S]*?\*\//g,
        comment=>comment.replace(/[^\r\n]/g," ")
    );
    code=code.replace(
        /\/\/[^\r\n]*/g,
        ""
    );
    return code;
}
function flattenCodePreservingDirectives(code){
    const output=[];
    let normalLines=[];
    let directiveLines=null;
    const flushNormal=()=>{
        if(normalLines.length===0){
            return;
        }
        output.push(normalLines.join(" "));
        normalLines=[];
    };
    for(const raw of code.split(/\r?\n/)){
        const line=raw.trim();
        if(directiveLines!==null){
            directiveLines.push(line);
            if(!line.endsWith("\\")){
                output.push(
                    directiveLines.join("\n")
                );
                directiveLines=null;
            }
            continue;
        }
        if(line.startsWith("#")){
            flushNormal();
            directiveLines=[line];
            if(!line.endsWith("\\")){
                output.push(line);
                directiveLines=null;
            }
            continue;
        }
        if(line!==""){
            normalLines.push(line);
        }
    }
    flushNormal();
    if(directiveLines!==null){
        output.push(
            directiveLines.join("\n")
        );
    }
    return output.join("\n");
}
export function minify(
    code,
    removeComments=true,
    flattenCode=false,
    undefMacro=false,
    from=4,
    to=4,
    renameVars=false,
    renameOptions={}
){
    if(typeof code!=="string"){
        throw new TypeError("code must be a string");
    }
    if(!Number.isInteger(from)||from<1){
        throw new RangeError("from must be a positive integer");
    }
    if(!Number.isInteger(to)||to<0){
        throw new RangeError("to must be a non-negative integer");
    }
    const protectedData=protectStrings(code);
    code=protectedData.code;
    if(removeComments){
        code=removeCComments(code);
    }
    const lines=code.split(/\r?\n/);
    const result=[];
    for(let i=0;i<lines.length;i++){
        let line=lines[i];
        const stripped=line.trim();
        if(stripped===""){
            continue;
        }
        if(stripped.startsWith("#")){
            result.push(stripped);
            while(
                result[result.length-1].endsWith("\\")&&
                i+1<lines.length
            ){
                i++;
                result.push(lines[i].trim());
            }
            continue;
        }
        line=line.replaceAll(
            " ".repeat(from),
            HARD_TEXT
        );
        for(const op of db){
            line=line.replaceAll(
                " "+op+" ",
                op
            );
            line=line.replaceAll(
                op+" ",
                op
            );
            line=line.replaceAll(
                " "+op,
                op
            );
        }
        line=line.replaceAll(
            HARD_TEXT,
            " ".repeat(to)
        );
        if(line.trim()!==""){
            result.push(line);
        }
    }
    code=result.join("\n");
    if(flattenCode){
        code=flattenCodePreservingDirectives(code);
    }
    code=code.replace(
        /\n[\t]*\n+/g,
        "\n"
    );
    code=restoreStrings(
        code,
        protectedData.strings
    );
    if(undefMacro){
        code=undef_macro(code);
    }
    if(renameVars){
        code=renameVariables(
            code,
            renameOptions
        );
    }
    return code;
}