# json-script

### Data Structures
```javascript
var env = {
    data: {
        "foo": {type: "string", value: "hello world"},
        "bar": {type: "function", parameters: [label: "s"]value: "console.log(s + \"!\");"}
        "a": {type: "number", value: 3}
    },
    events: {
        list: {
            "message": {
                pre: [{p: 1, f: func, a: args}, {p: 99, f: func, a: args}],
                post: [{p: 4, f: func, a: args}]
            },
            "messageType": {

            }
        }
    }
};
var keywords = { p: 0, // p for priority
    g: [ // g for group
        {s: ["kek", "ke"], g: [ // s for structure, e is expression, k is keyword
            {k: "("}, {k: ")"}
        ]}, {p: 1, s: ["ek"], g: [
            {k: ";"}, {k: "\n"}
        ]}, {p: 2, s: ["eke", "kee", "eek"], g: [
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
        {p: 1, s: ["ke", "ek"], g: [
            {k: "!"}, 
            {p: 4, g: [
                {k: "var"}, {k: "num"}, {k: "int"}, {k: "integer"}, {k: "float"}, {k: "double"}, {k: "string"}, {k: "function"}
            }]
        ]}
    ]
};
```

### Functions
parseRaw(str): helper function for parse
parse(env, rules, str)