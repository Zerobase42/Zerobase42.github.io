const defines = {};

const active = [];
const taken = [];

function parent_active() {
    return active.length ? active[active.length - 1] : true;
}

function eval_if(expr) {
    expr = expr.trim();

    expr = expr.replace(/&&/g, " && ");
    expr = expr.replace(/\|\|/g, " || ");
    expr = expr.replace(/!(?!=)/g, " ! ");

    // Replace logical operators to JavaScript equivalents
    expr = expr.replace(/&&/g, "&&");
    expr = expr.replace(/\|\|/g, "||");
    expr = expr.replace(/!(?!=)/g, "!");

    // Replace identifiers with their defined values or 0
    expr = expr.replace(/\b[A-Za-z_]\w*\b/g, (name) => {
        if (name === "and" || name === "or" || name === "not") {
            // These are Python operators, convert to JS equivalents
            if (name === "and") return "&&";
            if (name === "or") return "||";
            if (name === "not") return "!";
        }
        return defines.hasOwnProperty(name) ? defines[name] : "0";
    });

    try {
        // Use Function constructor to safely evaluate expression
        // Only allow boolean context
        return Boolean(Function(`"use strict"; return (${expr});`)());
    } catch (e) {
        return false;
    }
}

export function undef_macro(code) {
    let res = "";
    for (const line of code) {
        const s = line.trimStart();

        if (s.startsWith("#define")) {
            const parts = s.split(/\s+/, 3);
            if (parts.length >= 2) {
                if (parts.length === 2) {
                    defines[parts[1]] = "1";
                } else {
                    defines[parts[1]] = parts[2].trimEnd();
                }
            }
            continue;
        }

        if (s.startsWith("#undef")) {
            const parts = s.split(/\s+/);
            if (parts.length >= 2) {
                delete defines[parts[1]];
            }
            continue;
        }

        if (s.startsWith("#ifdef")) {
            const name = s.split(/\s+/)[1];
            const cond = defines.hasOwnProperty(name);
            active.push(parent_active() && cond);
            taken.push(cond);
            continue;
        }

        if (s.startsWith("#ifndef")) {
            const name = s.split(/\s+/)[1];
            const cond = !defines.hasOwnProperty(name);
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
            function expand(token) {
                const vis = new Set();
                while (defines.hasOwnProperty(token) && !vis.has(token)) {
                    vis.add(token);
                    token = defines[token];
                }
                return token;
            }

            const out = line.replace(/\b[A-Za-z_]\w*\b/g, (match) => expand(match));
            res += out + "\n";
        }
    }
    return res;
}