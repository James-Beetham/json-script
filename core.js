

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
    ruleSets: {
        default: {
            p: 0, g: [
            {g: [
                {s: ["ke"], k: "("}, {s: ["ek"], k: ")"}
            ]}, {p: 1, s: ["ek"], g: [
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
        }
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

    parse(env, rules, str);
}

function parse(env, rules, str) {
    // confirm match parenthesis, curly braces (if strict)
    // confirm rules are followed (if strict) - eg. types / return types, semicolons, whitespace, etc
    // split into lines and try to parse lines (ignore if line fails to parse)
    var lines = parseSplitLines(env, rules, str);
    for (line of lines) {
        parseLine(env, rules, [env], str);
    }
}

/**
 * returns array of individual expressions to parse
 */
function parseSplitLines(env, rules, str) {
    return str.split(";");
}

/**
 * scope is array of scopes this line has available.
 *  eg: (all entries must have data key, ie env.data[variableName])
 *      [env]: just global variables
 *      [functionEnv, packageEnv, env]: accesses variables from these environments 
 *          if collisions chooses first in array (usually scopes higher on stack)
 *          specific env can be specified in raw input by using "scope global foobar" (gets foobar from global scope)
 *              global correlates with env, this function's is this, packageEnv is parent, parent 2 is 2nd ele in scope array
 */
function parseLine(env, rules, scope, str) {
    // console.log("parsing line: " + str);
    var tree = parseExpr(rules, str);
    console.log("tree: " + JSON.stringify(tree));
    console.log(rules);
}

/**
 * returns parse tree
 */
// function parseExpr(rules, str) {
//     if (typeof(str) == "string") str = [str];
//     if (str.length == 0 || rules.length == 0) return str;
//     // TODO group strings (match quotes)
//     var v, arr = [], q, rule = rules.pop();
//     for (var v of str) {
//         var tmp = v.split(rule.k);
//         // console.log("\tlength start: " + tmp.length + ", " + JSON.stringify(tmp));
//         for (var q = 0; q < tmp.length; q++) {
//             tmp[q] = tmp[q].trim();
//             if (tmp[q].length == 0) { tmp.splice(q, 1); q--; }
//         }
//         arr.push(tmp);
//     }
//     // console.log("length: " + arr.length + JSON.stringify(tmp));
//     var ret = [];
//     for (var i = 0; i < arr.length; i++) {
//         var tmp = parseExpr(rules, arr[i]);
//         ret.push(tmp.length == 1 ? tmp[0] : tmp);
//     }
//     if (ret.length == 1) { ret = ret[0];
//         if (ret.length != 1) ret.splice(0, 0, rule.k);
//     }
//     rules.push(rule);
//     return ret;
// }

function parseExpr(rules, str) { // TODO (working on it)
    if (typeof(str) == "string") str = [str];
    var v, arr = [], tmp, rule = rules.pop();
    var amt = countChars(rule.s[0], "e");
    for (v of str) {
        tmp = v.split(rule.k);
        if (tmp.length == 1) {
            if (tmp[0].length == v.length) // no change
                tmp = tmp[0];
        } else if (tmp.length > amt - 1) {
            var stairFunc = function(arr, c, amt) {
                if (arr.length > amt) {
                    arr[1] = stairFunc(arr.splice(amt - 1, arr.length - (amt - 1)), c);
                }
                arr.splice(0, 0, c, amt);
                return arr;
            }
            tmp = stairFunc(tmp, c);
        }
        arr.push(tmp);
    }
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
    }
}

