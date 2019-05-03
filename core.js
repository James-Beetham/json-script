

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
                {s: ["ke"], k: "("}, {s: ["ek"], k: ")"}
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
            if (a.type != b.type) 
                env.events.execute("warning", {l: 5, m: "Converting variable to different type"});
            a.type = b.type;
            a.value = b.value;
            return a;
        },
        "+": function(a, b) { // a + b (combines array, doesn't append)
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
        }
    }
}

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
    var getRules = function(arr, parent, rule) {
        var tmp = {p: parent.p, s: parent.s};
        if (rule.p != undefined) tmp.p = rule.p;
        if (rule.s != undefined) tmp.s = rule.s;
        if (rule.k != undefined)
            utils.binaryInsert(arr, {p: tmp.p, s: tmp.s, k: rule.k}, "p");
        if (rule.g != undefined) 
            for (v of rule.g)
                getRules(arr, tmp, v);
    };
    getRules(rules, {}, env.ruleSets.default);
    if (env.keywords == undefined) generateKeywords(env, rules);
    // console.log(rules);
    parse(env, rules, str);
}

function parse(env, rules, str) {
    // confirm match parenthesis, curly braces (if strict)
    // confirm rules are followed (if strict) - eg. types / return types, semicolons, whitespace, etc
    // split into lines and try to parse lines (ignore if line fails to parse)
    var tree = parseExpr(rules, str);
    // console.log(JSON.stringify(tree));
    var ret = parseExprTree(env, [env], tree);
    // console.log("RETURN: " + JSON.stringify(ret));
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

// TODO parse all keywords of same priority together
function parseExpr(rules, str, i = rules.length - 1) { // TODO (working on it)
    if (str.length == 0) return "";
    if (i == -1) return str;
    var j, tmp, rule, changed = true;

    // array of same priority
    var max = {index: i, loc: str.lastIndexOf(rules[i].k)};
    var lastPriority = i;
    // console.log(str);
    for (j = i - 1; j >= 0 && rules[j].p == rules[i].p; lastPriority = j--) {
        if ((tmp = str.lastIndexOf(rules[j].k)) > max.loc) max = {index: j, loc: tmp};
        // console.log("\t%s: %s", rules[j].k, JSON.stringify(tmp));
    }
    var rule = rules[max.index];

    var tmpStr = str, tmpStrRem = "";
    while ((tmp = utils.splitLast(tmpStr, rule.k)).length > 1) {
        if (utils.isVarName(rule.k)) {
            if ((tmp[0].length != 0 || tmp[0][tmp[0].length - 1] != " ")
                && (tmp.length == 1 || tmp[1].length == 0 || tmp[1][0] == " ")) {
                    if (tmpStrRem.length != 0 && tmp.length == 2) tmp[1] += tmpStrRem;
                    break;
                }
        } else break;
        tmpStr = tmp[0] + rule.k.slice(0, rule.k.length - 1);
        tmpStrRem = rule.k[rule.k.length - 1] + (tmp.length == 1 ? "" : tmp[1]) + tmpStrRem;
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
            combined.splice(0, 0, rule.k);
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
            tmp.splice(0, 0, rule.k);
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
        if (right >= arr.length) arr.splice(arr.length, 0, ele);
        else arr.splice(right + (arr[right][key] <= ele[key] ? 1 : -1), 0, ele);
        if (right != left) {console.log("wierd results for inserting %s: %s", ele.key, JSON.stringify(arr));}
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
        {s: "var a = 1 + 2", e: {a: 3}},
        {s: "var a=1", e: {a: 1}},
        {s: "var a = 1 + 3 - 5", e: {a: -1}},
        {s: "var a = 1 + 1 - 2 + 1", e: {a: 1}},
        {s: "var a = 1", e: {a: 1}},
        {s: "var a = 1;", e: {a: 1}},
        {s: "var a = 1;var b = 2;var c = 3;var de = 4;", e: {a: 1, b: 2, c: 3, de: 4}},
        {s: "var a = 1 var b = 2 var c = 3", e: {a: 1, b: 2, c: 3}},
        {s: "var a=1 var b=2 var c=3", e: {a: 1, b: 2, c: 3}},
        {s: "vara=1;var b=2;varc=3", e: {vara: 1, b: 2, varc: 3}},
    ];
    var count = {passed: 0, failed: 0};
    for (var v of testList) {
        var ret = test(v.s, v.e, 2);
        count.passed += ret.passed;
        count.failed += ret.failed;
    }

    console.log("%c Passed %s / %s ", "background: #" + (count.failed == 0 ? "a4ffb7" : "ff8787"),count.passed, count.passed + count.failed);
}();
