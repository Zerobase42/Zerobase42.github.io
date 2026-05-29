let pyodide;

async function init() {
    pyodide = await loadPyodide();
}

init();

async function runPython() {

    const code = document.getElementById("input").value;

    pyodide.globals.set("cpp_code", code);

    await pyodide.runPythonAsync(`
import re

def minify(code):

    code = re.sub(r'//.*', '', code)
    code = re.sub(r'/\\*.*?\\*/', '', code, flags=re.S)

    lines = []

    for line in code.splitlines():
        line = line.strip()

        if line:
            lines.append(line)

    return ''.join(lines)

result = minify(cpp_code)
    `);

    const result = pyodide.globals.get("result");

    document.getElementById("output").textContent = result;
}