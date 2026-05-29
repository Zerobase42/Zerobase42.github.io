const code = document.getElementById("input").value;

pyodide.globals.set("cpp_code", code);

await pyodide.runPythonAsync(`
from minifier import minify

result = minify(cpp_code)
`);

const result = pyodide.globals.get("result");

document.getElementById("output").textContent = result;