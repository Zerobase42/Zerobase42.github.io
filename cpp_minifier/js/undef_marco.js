console.log("undef_macro.js loaded");

export function undef_macro(code) {
    const defines = Object.create(null);
    const functionLike = Object.create(null); // store names of function-like macros so we don't treat them as tokens

    const active = [];
    const taken = [];
    const lines = typeof code === "string" ? code.split(/\r?\n/) : code;

    function parent_active() {
        return active.length ? active[active.length - 1] : true;
    }

    // Expand identifiers in `text` using defines, but protect against infinite recursion.
    function expand(text) {
        let prev;
        let iter = 0;
        const MAX_ITER = 50; // safety cap

        do {
            prev = text;
            text = text.replace(/\b[A-Za-z_]\w*\b/g, (m) =>
                Object.prototype.hasOwnProperty.call(defines, m) ? defines[m] : m
            );
            iter++;
        } while (text !== prev && iter < MAX_ITER);

        return text;
    }

    // Evaluate a preprocessor #if expression. Supports 'defined' operator and basic logical/arithmetic ops.
    function eval_if(expr) {
        expr = expr.trim();

        // Handle defined(NAME) and defined NAME
        expr = expr.replace(/defined\s*\(\s*([A-Za-z_]\w*)\s*\)/g, (_, name) =>
            Object.prototype.hasOwnProperty.call(defines, name) ? "1" : "0"
        );
        expr = expr.replace(/defined\s+([A-Za-z_]\w*)/g, (_, name) =>
            Object.prototype.hasOwnProperty.call(defines, name) ? "1" : "0"
        );

        // Expand any macros inside the expression first
        expr = expand(expr);

        // Convert C-like logical operators to JS equivalents (kept minimal)
        expr = expr.replace(/&&/g, "&&").replace(/\|\|/g, "||").replace(/!(?!=)/g, "!");

        // Replace remaining identifiers with their values or 0
        expr = expr.replace(/\b[A-Za-z_]\w*\b/g, (name) =>
            Object.prototype.hasOwnProperty.call(defines, name) ? defines[name] : "0"
        );

        try {
            // Evaluate in a restricted function scope.
            // This will throw if expr contains disallowed tokens; in that case treat as false.
            return Boolean(Function(`"use strict"; return (${expr});`)());
        } catch (e) {
            return false;
        }
    }

    let res = "";
    for (const line of lines) {
        const s = line.trimStart();

        if (s.startsWith("#define")) {
            // Keep the entire rest of the line as the value (so we don't lose spaces).
            const rest = s.slice(7).trim();
            // Match name (possibly with params) and the optional value after whitespace.
            // Example matches:
            //   NAME value...
            //   NAME(params) value...
            const m = rest.match(/^([A-Za-z_]\w*(?:\s*\([^)]*\))?)(?:\s+(.*))?$/);
            if (m) {
                let name = m[1].trim();
                let value = m[2] !== undefined ? m[2] : "1";

                // Remove trailing comments from the value
                value = value.replace(/\/\/.*$/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();

                // Normalize function-like macro name (no spaces)
                if (name.includes("(")) {
                    const normalized = name.replace(/\s+/g, "");
                    functionLike[normalized] = { rawValue: value };
                } else {
                    defines[name] = value;
                }
            }
            continue;
        }

        if (s.startsWith("#undef")) {
            const rest = s.slice(6).trim();
            const name = rest.split(/\s+/)[0];
            if (name) {
                delete defines[name];
                delete functionLike[name];
            }
            continue;
        }

        if (s.startsWith("#ifdef")) {
            const name = s.split(/\s+/)[1];
            const cond = Object.prototype.hasOwnProperty.call(defines, name);
            active.push(parent_active() && cond);
            taken.push(cond);
            continue;
        }

        if (s.startsWith("#ifndef")) {
            const name = s.split(/\s+/)[1];
            const cond = !Object.prototype.hasOwnProperty.call(defines, name);
            active.push(parent_active() && cond);
            taken.push(cond);
            continue;
        }

        if (s.startsWith("#if") && !s.startsWith("#ifdef") && !s.startsWith("#ifndef")) {
            const cond = eval_if(s.slice(3));
            active.push(parent_active() && cond);
            taken.push(cond);
            continue;
        }

        if (s.startsWith("#elif")) {
            const parent = active.length >= 2 ? active[active.length - 2] : true;

            if (taken[taken.length - 1]) {
                active[active.length - 1] = false;
            } else {
                const cond = eval_if(s.slice(5));
                active[active.length - 1] = parent && cond;
                if (cond) {
                    taken[taken.length - 1] = true;
                }
            }
            continue;
        }

        if (s.startsWith("#else")) {
            const parent = active.length >= 2 ? active[active.length - 2] : true;

            if (taken[taken.length - 1]) {
                active[active.length - 1] = false;
            } else {
                active[active.length - 1] = parent;
                taken[taken.length - 1] = true;
            }
            continue;
        }

        if (s.startsWith("#endif")) {
            if (active.length) {
                active.pop();
                taken.pop();
            }
            continue;
        }

        if (parent_active()) {
            // Replace only object-like macro tokens. Avoid trying to expand function-like macros here.
            const out = line.replace(/\b[A-Za-z_]\w*\b/g, (token) => {
                // Don't replace function-like macro names (they include parentheses and are stored normalized)
                if (Object.prototype.hasOwnProperty.call(functionLike, token)) {
                    // leave as-is; proper expansion of function-like macros would require parsing arguments (not implemented)
                    return token;
                }
                return Object.prototype.hasOwnProperty.call(defines, token) ? expand(defines[token]) : token;
            });
            res += out + "\n";
        }
    }
    return res;
}
