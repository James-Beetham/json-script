

var env = {data: {}, 
    events: {
        /**
         * events:
         *      warning: {l: level, m: message}
         */
        on: function(event, entry) {
            // TODO
        }, 
        execute: function(event, args) {
            // TODO
        }
    },
    keywords: undefined, // generated at runtime and whenever updateKeywords is called
    ruleSets: {
        default: {
            p: 0, g: [
            {g: [
                {s: ["kek"], g: [
                    {k: ["(", ")"]},
                    {k: ["{", "}"]},
                    {k: ["[", "]"]}
                ]}
            ]}, {p: 10, s: ["ek"], g: [
                {k: ";"}, {k: "\n"}
            ]}, {p: 2, s: ["eke"], g: [
                {g: [
                    {k: "*"}, {k: "/"}
                ]}, {p: 3, g: [
                    {k: "+"}, {k: "-"}
                ]}, {p: 5, k: "="
                }, {p: 6, g: [
                    {k: "&&"}, {k: "||"}
                ]}, {p: 7, g: [
                    {k: "="}
                ]}
            ]},
            {p: 1, s: ["ke"], g: [
                {k: "!"}, 
                {p: 1, g: [
                    {k: "var"}, {k: "num"}, {k: "int"}, {k: "integer"}, {k: "float"}, {k: "double"}, 
                    {k: "string"}, {k: "function"}, {k: "scope"}
                ]}
            ]}
        ]},
        variation: {
            p: 2, s: ["kee", "eek"], g: [
                {g: [
                    {k: "*"}, {k: "/"}
                ]}, {p: 3, g: [
                    {k: "+"}, {k: "-"}
                ]}, {p: 5, k: "="
                }, {p: 6, g: [
                    {k: "&&"}, {k: "||"}
                ]}, {p: 7, g: [
                    {k: "="}
                ]}, {p: 1, s: ["ek"], g: [
                    {k: "!"}, 
                    {p: 1, g: [
                        {k: "var"}, {k: "num"}, {k: "int"}, {k: "integer"}, {k: "float"}, {k: "double"}, 
                        {k: "string"}, {k: "function"}, {k: "scope"}
                    ]}
                ]}
            ]
        }
    },
    definitions: {
        "=": function(a, b) { // a = b
            if (a == undefined || b == undefined) {
                env.events.execute("warning", {l: 3, m: "Tried to '=' an undefined expression"});
                return a == undefined ? b : a;
            }
            if (a.type != b.type) 
                env.events.execute("warning", {l: 5, m: "Converting variable to different type"});
            a.type = b.type;
            a.value = b.value;
            return a;
        },
        "+": function(a, b) { // a + b (combines array, doesn't append)
            if (a == undefined || b == undefined) {
                env.events.execute("warning", {l: 3, m: "Tried to add an undefined expression"});
                return a == undefined ? b : a;
            }
            if (a.type == "number" && b.type == "number")
                return {type: "number", value: a.value + b.value};
            if (a.type + b.type == "stringstring" || a.type + b.type == "stringnumber" || a.type + b.type == "numberstring")
                return {type: "string", value: a.value + b.value};
            if (a.type + b.type == "arrayarray") {
                var ret = {type: "array", value: []};
                for (i = 0; i < a.value.length || i < b.value.length; i++)
                    ret.value.push(i < a.value.length ? a.value[i] + (i < b.value.length ? b.value[i] : 0) : b.value[i]);
                return {type: "array", value: a.value.concat(b.value)};
            }
            env.events.execute("warning", {l: 1, m: "Invalid addition operation, tried to add: " + a.type + " and " + b.type});
        },
        "-": function(a, b) {
            if (a.type == "number" && b.type == "number")
                return {type: "number", value: a.value - b.value};
            return {type: a.type, value: a.value};
        },
        "var": function(a) {
            return a;
        },
        ";": function(a) {
            return a;
        },
        "(": function(a) { return a; },
    }
};

// TODO go through rules and generate keywords (warning for any missing definitions)
function generateKeywords(env, rules, surpress = true) {
    if (env.keywords == undefined) env.keywords = {};
    for (var v of rules) {
        if (env.keywords[v.k] != undefined) { if (!surpress) console.warn("repeated keyword: %s, ignoring %s", v.k, JSON.stringify(v)); }
        else if (env.definitions[v.k] == undefined) { if (!surpress) console.warn("missing definition for keyword: %s, ignoring", v.k); }
        else env.keywords[v.k] = v;
    }
}

function parseRaw(str) {
    var rules = [];
    utils.getRules(rules, {}, env.ruleSets.default);
    if (env.keywords == undefined) generateKeywords(env, rules);
    // console.log(rules);
    parse(env, rules, str);
}

function parse(env, rules, str) {
    // confirm match parenthesis, curly braces (if strict)
    // confirm rules are followed (if strict) - eg. types / return types, semicolons, whitespace, etc
    // split into lines and try to parse lines (ignore if line fails to parse)
    console.log(rules);
    var tree = parseExpr(rules, str);
    console.log(utils.strRoot(tree));
    console.log(JSON.stringify(utils.flattenRoot(tree)));
    flatTree = utils.flattenRoot(tree);
    var ret = parseExprTree(env, [env], flatTree);
    console.log("RETURN: " + JSON.stringify(ret));
}

/**
 * recurses through tree and executes the expressions
 * scope is array of scopes this line has available.
 *  eg: (all entries must have data key, ie env.data[variableName])
 *      [env]: just global variables
 *      [functionEnv, packageEnv, env]: accesses variables from these environments 
 *          if collisions chooses first in array (usually scopes higher on stack)
 *          specific env can be specified in raw input by using "scope global foobar" (gets foobar from global scope)
 *              global correlates with env, this function's is this, packageEnv is parent, parent 2 is 2nd ele in scope array
*/
function parseExprTree(env, scope, exprTree) {
    // console.log(JSON.stringify(exprTree));
    var i;
    if (typeof(exprTree) == "string") { // initialize variable
        var type = "undefined";
        if (!isNaN(exprTree)) type = "number";
        else if (exprTree[0] == "\"") type = "string";
        var value = exprTree;
        if (type == "number") value = parseFloat(exprTree);
        else if (type == "undefined") {
            if (env.data[exprTree] == undefined) value = "undefined";
            else {
                value = env.data[exprTree].type;
                type = env.data[exprTree].type;
            }
        }
        var ret = {type: type, value: value};
        if (type == "undefined") {
            ret.name = exprTree;
            env.data[exprTree] = ret;
        }
        return ret;
    } else if (typeof(exprTree) == "object" && exprTree.length == 1) return parseExprTree(env, scope, exprTree[0]);

    for (i = (typeof(exprTree[0]) == "object" ? 0 : 1); i < exprTree.length; i++)
        exprTree[i] = parseExprTree(env, scope, exprTree[i]);
    // console.log("\t" + JSON.stringify(exprTree));
    if (typeof(exprTree[0]) == "string") {
        if (env.definitions[exprTree[0]] == undefined) {
            console.warn("no definition for keyword: %s", JSON.stringify(exprTree[0]));
            exprTree.splice(0, 1);
        } else  exprTree = env.definitions[exprTree[0]].apply(this, exprTree.slice(1));
    }
    if (typeof(exprTree) == "object" && exprTree.length == 1) exprTree = exprTree[0];
    // console.log("\t\t" + JSON.stringify(exprTree));
    return exprTree;
}

/*
var a = 1 + 2 - 3 + 4;
{k: var, c: []}
    {k: var, c: []} | a = 1 + 2 - 3 + 4 | k: = | c.push("a".split(' ')) | 
        root: {k: =, c: [{k: var, c: [a]}]} | 1 + 2 - 3 + 4 | k: + | c: [..., {k: +, c: [1]}]
            -> root, cur: {k: +, c: [1]} | 2 - 3 + 4 | k: - | {k: =, c: [., {k: -, c: [{k: +, c: [1, 2]}, ]}]}
        cur: {k: =, c: [{k: var, c: [a]}, {k: +, c: [1, 2]}]} | - 3 + 4 | {k: =, c: [..., {k: -, c: [{k: +, c: [1, 2]}]}]}
            -> cur: {k: -, c: [...]} | 3 + 4 | k: + | {k: -, c: [{k: +, c: [1, 2]}, 3]}
        cur: {k: =, c: [{k: var, c: [a]}, {k: -, c: [{k: +, c: [1, 2]}, 3]}]} | + 4 | {k: =, ...}
            -> cur: {}

|var, a, =, 1, +, (, 2, -, 3, ), +, 4
[var, a], |=, 1, +, (, 2, -, 3, ), +, 4

var a = 1 + 2 - 3 + 4
[=, [var, a], [+, [-, [+, 1, 2], 3], 4]]
var a = 1 + 2 * 3 + 4
[=, [var, 1], [+, [+, 1, [*, 2, 3]], 4]]
[=, [var, 1], [+, 1, .]] | e: 2 | {k: *} 
[=, [var, 1], [+, 1, [*, 2, .]]] | e: 3 | {k: +}
[=, [var, 1], [+, [+, 1, [*, 2, 3]], .]]

1 + 2 + 3 * 4
[+, 1, .] e: 2, k: +
[+, [+, 1, 2], .] e: 3, k: *
[+, [+, 1, 2], [*, 3, .]]

*/

// returns {root, cur, str}
function parseExpr(rules, str, root, cur) {
    // node: {k: keyword, c: children, p: parent, i: priority, l: length}
    // check if root is empty
        // get first keyword 
        // if there's string infront: split by ' ' and add as separate expressions
            // fill cur with expressions until full (going up tree if need but keeping cur)
        // go up tree until either an expr is required (warning) or the priority of the parent of cur is larger
        // add keyword to tree
    if (root == undefined) { root = {}; cur = root; }
    var getFirstK = function(r, s) {
        var max = {index: -1, rule: r[0]};
        for (var i = 0; i < r.length; i++) {
            var iof = s.indexOf(r[i].k[0]);
            if (utils.isVarName(r[i].k[0])) { // if keyword is var name, must end with space or end of string
                // console.warn("\tgetFirstK: %s", r[i].k[0]);
                var ss = s;
                while (!(
                    (iof == 0 || !utils.isAlphaNum(s.substring(iof - 1, iof)))  // starts with
                    && (iof + r[i].k[0].length == s.length || !utils.isAlphaNum(s.substring(iof + r[i].k[0].length, iof + r[i].k[0].length + 1))))) { // ends with
                        ss = ss.substring(iof + 1);
                        var tmp = ss.indexOf(r[i].k[0]);
                        if (tmp == -1) { iof = -1; break; }
                        iof += 1 + tmp;
                    }
            }

            if (iof != -1 && (max.index == -1 || iof < max.index)) 
                max = {index: iof, rule: r[i]};
            // console.log("getFirstK: %s, %d, %d", r[i].k[0], iof, max.index);
        }
        max.s = max.rule.s[0]; // TODO incorperate different s into checking getFirstK... recursive?
        return max;
    };
    var addExpr = function(root, exprs) {
        // console.log(exprs);
        for (var i = 0; i < exprs.length; i++) {
            var cur = root;
            while (cur.c != undefined && cur.c.length != 0 && cur.c[cur.c.length - 1].c != undefined) cur = cur.c[cur.c.length - 1];
            while (cur.p != undefined) { // rightmost cur with empty spot
                if (cur.c.length < cur.l) break;
                cur = cur.p;
            }
            if (cur.l == undefined || (cur.l != -1 && cur.l == cur.c.length)) { // root has filled up
                // console.log("addExpr: %s", JSON.stringify(exprs));
                var ret = cur.l == undefined ? {c: []} : {c: [root]};
                if (cur.l == undefined) {
                    if (root.c == undefined) root.c = [];
                    root.c = root.c.concat(exprs.splice(i));
                }
                // console.log(JSON.stringify(ret));
                return ret;
            }
            cur.c.push(exprs[i]);
        }
        return root;
    };
    var strRoot = utils.strRoot;
    var split, strRem, exprs, newKey, tmp, v, w;
    while (str.length > 0) {
        // console.log(str);
        // console.log(strRoot(root));
        if ((split = getFirstK(rules, str)).index == -1) { addExpr(root, str.split(" ")); break; }
        // console.log(split.rule.k[0] + " (" + split.s + "): " + JSON.stringify(utils.flattenRoot(root)));
        // console.log(JSON.stringify(split));
        strRem = str.substring(0, split.index).trim();
        str = str.substring(split.index + split.rule.k[0].length).trim();
        if (strRem.length != 0) {
            exprs = strRem.split(" ");
            addExpr(root, exprs);
            // console.log(JSON.stringify(root));
        }
        newKey = {k: split.rule.k[0], c: [], i: split.rule.p, l: (split.s.split("e").length - 1)};
        // find next cur () and add keyword
        // console.log(JSON.stringify(utils.flattenRoot(cur)));
        while (cur != root && (cur.i <= newKey.i || cur.c.length == cur.l)) cur = cur.p; // go up tree
        // console.log(JSON.stringify(utils.flattenRoot(cur)));
        // while (cur.c.length > 0 && cur.c[cur.c.length - 1].k != undefined && cur.c[cur.c.length - 1].i > newKey.i) cur = cur. // go down tree
        // console.log((cur != root) + ", " + (cur.p != undefined ? (cur.p.i <= newKey.i) : "undefined"));
        if (cur == root) {
            if (cur.c == undefined) { // root is empty
                root = newKey
            } else if (cur.k == undefined || cur.c.length < cur.l) { // root is a null array
                // console.log("1one");
                if (split.s.indexOf("e") == 0) { // pull in e's before k                
                    tmp = cur.c.splice(cur.c.length - 1);
                    for (v of tmp) if (v.p != undefined) v.p = newKey;
                    // console.log("3rd: " + JSON.stringify(tmp));
                    newKey.c = newKey.c.concat(tmp);
                }
                cur.c.push(newKey);
                newKey.p = cur;
            } else if (cur.i <= newKey.i) { // add newKey above root
                root = newKey;
                // console.log("1two");
                // console.log("newKey: " + JSON.stringify(newKey) + "\ncur: " + JSON.stringify(cur) + "\nroot: " + JSON.stringify(root));
                // console.log("1st: " + (cur.c != undefined));
                if (cur.c != undefined && cur.c.length != 0) {
                    if (split.s.indexOf("e") == 0 && cur.k == undefined) {
                        tmp = cur.c.splice(cur.c.length - 1);
                        newKey.c = newKey.c.concat(tmp);
                        // console.log("one: " + strRoot(newKey));
                    }
    
                    if (cur.c.k != undefined && cur.c.length != 0) {
                        root = {c: cur.c};
                        root.c = root.c.push(newKey);
                        // console.log("two: " + JSON.stringify(root));
                    }
                    newKey.c.push(cur); cur.p = newKey;
                    // console.error("eating previous");
                }
            } else {
                // console.log("1three");
                if (split.s.indexOf("e") == 0) { // pull in e's before k                
                    tmp = cur.c.splice(cur.c.length - 1);
                    for (v of tmp) if (v.p != undefined) v.p = newKey;
                    // console.log("3rd: " + JSON.stringify(tmp));
                    newKey.c = newKey.c.concat(tmp);
                }
                if (root.l != undefined && root.l == root.c.length) { // expand root
                    root = {c: [root]};
                }
                root.c.push(newKey);
                newKey.p = root;    
        }
        } else {
            // console.log("2nd: " + JSON.stringify(utils.flattenRoot(root)) + "\t" + JSON.stringify(utils.flattenRoot(cur)));
            if ((cur.p != undefined && cur.p.i <= newKey.i) || (cur.i < newKey.i)) console.warn("Not enough expressions, forced to ignore priority");

            if (split.s.indexOf("e") == 0) { // pull in e's before k                
                tmp = cur.c.splice(cur.c.length - 1);
                for (v of tmp) if (v.p != undefined) v.p = newKey;
                // console.log("3rd: " + JSON.stringify(tmp));
                newKey.c = newKey.c.concat(tmp);
            }

            cur.c.push(newKey); newKey.p = cur; 
        }
        cur = newKey;
        // console.log(strRoot(root));
    }
    return root;
}


// TODO parse all keywords of same priority together
function parseExpr2(rules, str, i = rules.length - 1, stack = []) { // TODO (working on it)
    if (str.length == 0) return "";
    if (i == -1) return str;
    if (i >= rules.length) return str;
    var j, tmp, rule, changed = true;

    // console.log(JSON.stringify(rules));
    // console.warn("i: %s, rule: %s", i, JSON.stringify(rules[i] != undefined ? rules[i].k : undefined));
    var max = {index: i, loc: str.lastIndexOf(rules[i].k[0])};
    var lastPriority = i;
    if (rules[i].p <= 10) { // array of same priority
        for (j = i - 1; j >= 0 && rules[j].p == rules[i].p; lastPriority = j--) {
            if ((tmp = str.lastIndexOf(rules[j].k[0])) > max.loc) max = {index: j, loc: tmp};
        }
    }
    var rule = rules[max.index];

    // console.log("str: %s, rule: %s", str, rule.k[0]);
    // a = 1 + (2 - 3) -> [=, a, [+, 1, [-, 2, 3]]]
    if (rule.k.length > 1 && str.indexOf(rule.k[0]) != -1) { // eg "kek" for '(' and ')'
        tmp = [];
        var startI = str.indexOf(rule.k[0]);
        var endI = str.lastIndexOf(rule.k[rule.k.length - 1]);
        for (j = 1; j < rule.k.length; j++) {
            // console.log("i1: %d, i2: %d, rule: %s", str.substring(str.indexOf(rule.k[j - 1]) + rule.k[j - 1].length, str.lastIndexOf(rule.k[j]), rule.k[j - 1]));
            var tmpStr = str.substring(str.indexOf(rule.k[j - 1]) + rule.k[j - 1].length, str.lastIndexOf(rule.k[j]));
            console.warn("s: %s, e: %s, s: %s, ns: %s", rule.k[j - 1], rule.k[j], str, tmpStr);
            tmp.push(parseExpr(rules, tmpStr));
        }
        // tmp.splice(0, 0, rule.k[0]);
        var tmpFunc = function(a) { return a.length == 1 && a[0].length == 1 ? tmpFunc(a[0]) : a; }
        var isEmt = function(a) { return a.length == 0 || (a.length == 1 && a[0].length == 0); }
        tmp = tmpFunc(tmp);
        var tmpArr = parseExpr(rules, str.substring(0, startI));
        if (!isEmt(tmpArr)) tmp = tmpArr.concat(tmp);
        tmpArr = parseExpr(rules, str.substring(endI + rule.k[rule.k.length - 1].length));
        if (!isEmt(tmpArr)) tmp = tmp.concat(tmpArr);
        return tmp;
    }

    // find last instance of this rule
    var tmpStr = str, tmpStrRem = "";
    while ((tmp = utils.splitLast(tmpStr, rule.k[0])).length > 1) {
        if (utils.isVarName(rule.k[0])) {
            if ((tmp[0].length != 0 || tmp[0][tmp[0].length - 1] != " ")
                && (tmp.length == 1 || tmp[1].length == 0 || tmp[1][0] == " ")) {
                    if (tmpStrRem.length != 0 && tmp.length == 2) tmp[1] += tmpStrRem;
                    break;
                }
        } else break;
        tmpStr = tmp[0] + rule.k[0].slice(0, rule.k[0].length - 1);
        tmpStrRem = rule.k[0][rule.k[0].length - 1] + (tmp.length == 1 ? "" : tmp[1]) + tmpStrRem;
    }
    if (tmp.length == 1) tmp[0] += tmpStrRem;
    for (j = 0; j < tmp.length; j++) {
        tmp[j] = tmp[j].trim();
        if (tmp[j].length == 0) tmp.splice(j--, 1);
    }

    if (tmp.length == 0) return [];
    if (tmp.length == 1) {
        if (tmp[0].length == 0) return [];
        if (tmp[0].length == str.length) { // no change
            changed = false;
        }
    }

    var thisBranch = [];
    var restBranches = [];
    // if (changed && rule.k == ";") console.log("%c%s, %s", "background: #dddddd", tmp[0], tmp[1]);
    if (tmp.length == 1)
        thisBranch = parseExpr(rules, tmp[0], lastPriority - (changed ? 0 : 1)); // parse this branch
    else {
        thisBranch = parseExpr(rules, tmp[1], lastPriority - 1);
        restBranches = parseExpr(rules, tmp[0], i); // parse rest of branches
    }

    // if (changed && rule.k == ";") console.log("\t%s, %s", JSON.stringify(thisBranch), JSON.stringify(restBranches));

    var combined = restBranches.concat(thisBranch);
    if (changed) {
        // if (rule.k == ";" || rule.k == "var") console.log("%c%s: %s, %s", "background: #dddddd", rule.k, JSON.stringify(combined), rule.s[0]);
        // if (rule.k == ";" || rule.k == "var") console.log("%c%s: %s\n\t%s", "background: #dddddd", rule.k, JSON.stringify(restBranches), JSON.stringify(thisBranch));
        // if (rule.k == "=") console.log("%c%s: %s\n\t%s", "background: #dddddd", rule.k, JSON.stringify(restBranches), JSON.stringify(thisBranch));
        var numExpr = utils.countChars(rule.s[0], "e");
        if (combined.length == numExpr) {
            combined.splice(0, 0, rule.k[0]);
            combined = [combined];
        } else if (combined.length > numExpr) {
            j = 0; var arr = combined;
            if (numExpr == 1) {
                if (rule.s[0] == "ek") {
                    j = restBranches.length == 0 ? thisBranch.length - 1 : restBranches.length - 1;
                } else if (rule.s[0] == "ke") {
                    j = restBranches.length;
                }
            } else j = restBranches.length - 1; 
            tmp = arr.splice(j, numExpr);
            tmp.splice(0, 0, rule.k[0]);
            arr.splice(j, 0, tmp);
        } else {
            console.warn("invalid number of expressions for rule: %s.\nExpected: %s, was: %s\n tree: %s", rule.k, numExpr, combined.length, JSON.stringify(combined));
        }
    }
    return combined;
}

var utils = {
    copy: function(o) { // deep copy of variables in javascript (assuming no loops)
        if (typeof(o) == "string") {
            return o.slice();
        } else if (typeof(o) == "number") {
            return o;
        } else if (typeof(o) == "function") {
            return o; // don't copy functions
        } else if (typeof(o) == "object") {
            var cpy = {};
            for (var v in o) {
                cpy[v] = utils.copy(o[v]);
            }
        } else if (typeof(o) == "undefined") {
            
        } else {
            console.log("unrecognized type: " + typeof(o));
        }
        var cpy = {};
    },
    merge: function(a, b) { // merge objects (with keys), appends b to end of a if array or string, ignores b if overlap is number 

    },
    binaryInsert(arr, ele, key) { // inserts value at end of same values (TODO make that part binary, isn't atm)
        var left = 0, right = arr.length, cur;
        while (right - left > 0) {
            cur = Math.floor((right + left) / 2);
            if (arr[cur][key] == ele[key]) {
                for (; cur < arr.length; cur++) {
                    if (arr[cur][key] != ele[key]) break;
                }
                arr.splice(cur, 0, ele);
                return;
            }
            if (arr[cur][key] < ele[key]) left = cur + 1;
            if (arr[cur][key] > ele[key]) right = cur - 1;
        }
        // if (right < 0) right = 0;
        if (right >= arr.length) arr.splice(arr.length, 0, ele);
        else if (right == -1 || right == 0) arr.splice(0, 0, ele);
        else arr.splice(right + (arr[right][key] <= ele[key] ? 1 : -1), 0, ele);

        // if (right != left) {console.log("wierd results for inserting %s:\t %s", JSON.stringify(ele), JSON.stringify(arr));}
    },
    countChars(str, c) {
        var count = 0;
        for (var i = 0; i < str.length; i++)
            if (str[i] == c) count++;
        return count;
    },
    splitFirst(str, s) { // TODO use indexOf instead of split
        var tmp = str.split(s);
        if (tmp.length == 1) return tmp;
        var sec = tmp.splice(1, 1)[0];
        while (tmp.length != 1)
            sec += s + tmp.splice(1, 1)[0];
        return [tmp[0], sec];
    },
    splitLast(str, s) {
        var loc = str.lastIndexOf(s);
        if (loc == -1) return [str];
        return [str.slice(0, loc), str.slice(loc + s.length)];
    },
    isVarName(str) {
        if (str == undefined || typeof(str) != "string") return false;
        str = str.toLowerCase();
        var nums = "0123456789";
        var letters = "abcdefghijklmnopqrstuvwxyz";
        var alphaNum = letters + nums;
        var bool = letters.indexOf(str[0]) != -1;
        for (i = 1; bool && i < str.length; i++)
            bool = alphaNum.indexOf(str[i]) != -1;
        return bool;
    },
    isAlphaNum(str) {
        var c = "abcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < str.length; i++) {
            if (c.indexOf(str[i]) == -1) return false;
        }
        return true;
    },
    strRoot(root) {
        var ret = "{";
        for (var v in root) {
            if (v == "p") ret += "p:.."
            else if (v == "c") {
                ret += "c:[";
                for (var w of root.c) ret += utils.strRoot(w) + ", ";
                if (root.c.length != 0) ret = ret.substring(0, ret.length - 2);
                ret += "]";
            } else {
                ret += v + ":" + JSON.stringify(root[v]);
            }
            ret += ", ";
        }
        if (ret[ret.length - 2] == ",") ret = ret.substring(0, ret.length - 2);
        ret += "}";
        return ret;
    },
    flattenRoot(root) {
        if (root == undefined || root.c == undefined) return root;
        var ret = [root.k];
        for (var c of root.c)
            ret.push(utils.flattenRoot(c));
        return ret;
    },
    getRules(arr, parent, rule) {
        var tmp = {p: parent.p, s: parent.s};
        if (rule.p != undefined) tmp.p = rule.p;
        if (rule.s != undefined) tmp.s = rule.s;
        if (rule.k != undefined) {
            if (typeof(rule.k) == "string") rule.k = [rule.k];
            utils.binaryInsert(arr, {p: tmp.p, s: tmp.s, k: rule.k}, "p");
        }
        if (rule.g != undefined) 
            for (v of rule.g)
                utils.getRules(arr, tmp, v);
    }
}

var tests = function() {
    var test = function(str, expected, show = false) { // show = 0 is show none, show = 1 shows failed, show = 2 shows all
        env.data = {};
        parseRaw(str);
        
        var v, tmp, success = true;
        var failed = [], passed = [];
        for (v in expected) {
            tmp = {name: v, expected: expected[v], was: (env.data[v] == undefined ? "!DNE!" : env.data[v].value)};
            if (tmp.expected != tmp.was) {
                success = false;
                failed.push(tmp);
            } else passed.push(tmp);
        }

        if (show != 0) {
            var output = "";
            var checksPassed = "";
            var checksFailed = "";
            var color = "0000ff", colorFail = "ff0000", colorPass = "008000";
            var logStr = "%cTest: \n%s\n%cChecks:\n%c%s";

            if (show >= 1)
                for (v of str.split("\n"))
                    output += " | " + v + "\n";        
            if (failed.length > 0)
                for (v of failed)
                    checksFailed += " | " + v.name + ": was [" + JSON.stringify(v.was) + "] expected [" + JSON.stringify(v.expected) + "]\n";
            if (show >= 2) {
                for (v of passed)
                    checksPassed += " | " + v.name + ": was [" + JSON.stringify(v.was) + "]\n";
                logStr += "%c%s";
            }
            
            if (show >= 2)
                console.log(logStr, "color: #" + color, output, "color: #" + (failed.length == 0 ? colorPass : colorFail),
                    "color: #" + colorFail, checksFailed, "color: #" + colorPass, checksPassed);
            else if (failed.length != 0 && show == 1) {
                console.log(logStr, "color: #" + color, output, "color: #" + (failed.length == 0 ? colorPass : colorFail),
                    "color: #" + colorFail, checksFailed);
            }
        }
        // env.data = {};
        return {passed: passed.length, failed: failed.length};
    };

    var testList = [
        // {s: "var a = 1 + 2", e: {a: 3}},
        // {s: "var a=1", e: {a: 1}},
        // {s: "var a = 1 + 3 - 5", e: {a: -1}},
        // {s: "var a = 1 + 1 - 2 + 1", e: {a: 1}},
        // {s: "var a = 1", e: {a: 1}},
        // {s: "var a = 1;", e: {a: 1}},
        // {s: "var a = 1;var b = 2;var c = 3;var de = 4;", e: {a: 1, b: 2, c: 3, de: 4}},
        // {s: "var a = 1 var b = 2 var c = 3", e: {a: 1, b: 2, c: 3}},
        // {s: "var a=1 var b=2 var c=3", e: {a: 1, b: 2, c: 3}},
        // {s: "vara=1;var b=2;varc=3", e: {vara: 1, b: 2, varc: 3}},
        {s: "var a = 3 - (4 + 1)", e: {a: -2}},
        
    ];
    var count = {passed: 0, failed: 0};
    for (var v of testList) {
        var ret = test(v.s, v.e, 1);
        count.passed += ret.passed;
        count.failed += ret.failed;
    }

    console.log("%c Passed %s / %s ", "background: #" + (count.failed == 0 ? "a4ffb7" : "ff8787"),count.passed, count.passed + count.failed);
}//();

var outRules = []
utils.getRules(outRules, {}, env.ruleSets.default)

module.exports = {
    parseExpr: parseExpr,
    parseTree: function(env, tree) { return parseExprTree(env, [env], tree); },
    rules: outRules,
    flatten: utils.flattenRoot
}