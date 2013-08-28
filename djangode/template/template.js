/*jslint laxbreak: true, eqeqeq: true, undef: true, regexp: false */
/*global require, process, module */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var string_utils = require('../utils/string');
var html = require('../utils/html');
var iter = require('../utils/iter');
var extend = require('../utils/base').extend;
var errors = require('../utils/errors');


function parse(input, filename) {
    return new Template(input, filename);
}

function normalize(value) {
    if (typeof value !== 'string') { return value; }

    if (value === 'true') { return true; }
    if (value === 'false') { return false; }
    if (/^\d/.exec(value)) { return value - 0; }

    var isStringLiteral = /^(["'])(.*?)\1$/.exec(value);
    if (isStringLiteral) { return isStringLiteral.pop(); }

    return value;
}

/***************** TOKEN **********************************/

function Token(type, contents) {
    this.type = type;
    this.contents = contents;
}

extend(Token.prototype, {
    split_contents: function() {
        return string_utils.smart_split(this.contents);
    },
    expr_split_contents: function() {
        return string_utils.expr_split(this.contents);
    }
});

/***************** TOKENIZER ******************************/

function tokenize(input) {
    var re = /(?:{#|#}|{{|}}|{%|%})|[{}%#|]|[^{}%#|]+/g;

    var token_list = [];

    var lastLineCount = 0;
    var lastLineStartPos = 0;
    var lastLineCountEndPos = 0;

    function countLines(text) {
        var count = -1;
        var position = -1;
        var lastPosition = -1;

        do {
            count += 1;
            lastPosition = position;
            position = text.indexOf('\n', position + 1);
        } while (position != -1);

        return {'count': count, 'lastPosition': lastPosition};
    }

    function lineNum(pos) {
        if (pos == lastLineCountEndPos) {
            return lastLineCount;
        }

        if (pos > lastLineCountEndPos) {
            lastLineCount = 0;
            lastLineCountEndPos = 0;
        }

        var countedLines = countLines(input.toString('utf8', lastLineCountEndPos, pos));

        lastLineCount += countedLines.count;
        lastLineStartPos = countedLines.lastPosition == -1 ? lastLineStartPos : countedLines.lastPosition;
        lastLineCountEndPos = pos;

        return lastLineCount;
    }

    function currentLine() {
        return lineNum(re.lastIndex);
    }

    function consume(re, input) {
        var m = re.exec(input);
        return m ? m[0] : null;
    }

    function consume_until() {
        var next, s = '';
        var args = Array.prototype.slice.apply(arguments);
        while ((next = consume(re, input))) {
            if (args.indexOf(next) > -1) {
                return [s, next];
            }
            s += next;
        }
        return [s];
    }

    function pushToken(type, contents, lineNum, column) {
        var newToken = new Token(type, contents);
        newToken.lineNum = lineNum;
        newToken.column = column;
        token_list.push(newToken);
    }

    function literal() {
        var lineNum = currentLine();
        var column = re.lastIndex - lastLineStartPos;

        var res = consume_until("{{", "{%", "{#");

        if (res[0]) {
            pushToken('text', res[0], lineNum, column);
        }

        if (res[1] === "{#") { return comment_tag; }
        if (res[1] === "{{") { return variable_tag; }
        if (res[1] === "{%") { return template_tag; }
        return undefined;
    }

    function comment_tag() {
        var lineNum = currentLine();
        var column = re.lastIndex - lastLineStartPos;

        var res = consume_until("#}");

        if (res[1]) { return literal; }
        return undefined;
    }

    function variable_tag() {
        var lineNum = currentLine();
        var column = re.lastIndex - lastLineStartPos;

        var res = consume_until("}}");

        if (res[0]) {
            pushToken('variable', res[0].trim(), lineNum, column);
        }
        if (res[1]) { return literal; }
        return undefined;
    }

    function template_tag() {
        var lineNum = currentLine();
        var column = re.lastIndex - lastLineStartPos;

        var res = consume_until("%}"),
            parts = res[0].trim().split(/\s/, 1);

        pushToken(parts[0], res[0].trim(), lineNum, column);

        if (res[1]) { return literal; }
        return undefined;
    }

    var state = literal;

    while (state) {
        state = state();
    }

    return token_list;
}

/*********** FilterExpression **************************/

// groups are: 1=variable, 2=constant, 3=filter_name, 4=filter_constant_arg, 5=filter_variable_arg
var filter_re = /("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|([\w\.]+|[\-+\.]?\d[\d\.e]*)|(?:\|(\w+)(?::(?:("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|([\w\.]+|[\-+\.]?\d[\d\.e]*)))?)/g;

function FilterExpression(expression, constant) {

    filter_re.lastIndex = 0;

    this.filter_list = [];

    var parsed = this.consume(expression);

    //util.debug(expression + ' => ' + util.inspect(parsed));

    if (!parsed) {
        this.error(expression, "Couldn't parse expression!");
    }
    if (constant !== undefined) {
        if (parsed.variable !== undefined || parsed.constant !== undefined) {
            this.error(expression, "Did not expect variable when constant is passed!");
        }
        parsed.constant = constant;
    }

    while (parsed) {
        if (parsed.constant !== undefined && parsed.variable !== undefined) {
            this.error(expression, "Did not expect both variable and constant!");
        }
        if ((parsed.constant !== undefined || parsed.variable !== undefined) &&
            (this.variable !== undefined || this.constant !== undefined)) {
            this.error(expression, "Did not expect variable or constant at this point!");
        }
        if (parsed.constant !== undefined) { this.constant = normalize(parsed.constant); }
        if (parsed.variable !== undefined) { this.variable = normalize(parsed.variable); }

        if (parsed.filter_name) {
            this.filter_list.push(this.make_filter_token(parsed));
        }

        parsed = this.consume(expression);

        //util.debug(expression + ' => ' + util.inspect(parsed));
    }

    //util.debug(expression + ' => ' + util.inspect(this));

}

extend(FilterExpression.prototype, {

    consume: function (expression) {
        var m = filter_re.exec(expression);
        return m ?
            { constant: m[1], variable: m[2], filter_name: m[3], filter_arg: m[4], filter_var_arg: m[5] }
            : null;
    },

    make_filter_token: function (parsed) {
        var token = { name: parsed.filter_name };
        if (parsed.filter_arg !== undefined) { token.arg = normalize(parsed.filter_arg); }
        if (parsed.filter_var_arg !== undefined) { token.var_arg = normalize(parsed.filter_var_arg); }
        return token;
    },

    error: function (expression) {
        var args = Array.prototype.slice.call(arguments, 1);
        var filename = 'unknown'; // FIXME: Get the filename (and possibly token for line/col numbers) here!
        throw new errors.FilterExpressionParseError(expression, filter_re.lastIndex, filename, util.format.apply(util, args));
    },

    resolve: function (context) {
        var value;
        if (this.hasOwnProperty('constant')) {
            value = this.constant;
        } else {
            value = context.get(this.variable);
        }

        var safety = {
            is_safe: false,
            must_escape: context.autoescaping
        };

        var out = this.filter_list.reduce(function (p, c) {

            var filter = context.filters[c.name];

            var arg;
            if (c.arg) {
                arg = c.arg;
            } else if (c.var_arg) {
                arg = context.get(c.var_arg);
            }

            if ( filter && typeof filter === 'function') {
                return filter(p, arg, safety);
            } else {
                // throw 'Cannot find filter';
                util.debug('Cannot find filter ' + c.name);
                return p;
            }
        }, value);

        if (safety.must_escape && !safety.is_safe) {
            if (typeof out === 'string') {
                return html.escape(out);
            } else if (out instanceof Array) {
                return out.map(function (o) { return typeof o === 'string' ? html.escape(o) : o; });
            }
        }
        return out;
    }
});

/*********** PARSER **********************************/

function Parser(input, filename) {
    this.token_list = tokenize(input);
    this.indent = 0;
    this.blocks = {};
    this.filename = filename;

    var defaults = require('./template_defaults');
    this.tags = defaults.tags;
    this.nodes = defaults.nodes;
}

function make_nodelist() {
    var node_list = [];
    node_list.evaluate = function (context, callback) {
        iter.reduce(this, function (p, c, idx, list, next) {
            context.node_stack = context.node_stack || []; // Ensure there's a node stack on the context.
            context.node_stack.unshift(c);
            c(context, function (error, result) {
                context.node_stack.shift();
                next(error, p + result);
            });
        }, '', callback);
    };
    node_list.only_types = function (/*args*/) {
        var args = Array.prototype.slice.apply(arguments);
        return this.filter(function (x) { return args.indexOf(x.type) > -1; });
    };
    node_list.append = function (node, token) {
        node.token = token;
        node.type = token.type || token;
        this.push(node);
    };
    return node_list;
}

extend(Parser.prototype, {

    parse: function () {

        var stoppers = Array.prototype.slice.apply(arguments);
        var node_list = make_nodelist();
        var token = this.token_list[0];
        var tag = null;

        //util.debug('' + this.indent++ + ':starting parsing with stoppers ' + stoppers.join(', '));

        while (this.token_list.length) {
            if (stoppers.indexOf(this.token_list[0].type) > -1) {
                //util.debug('' + this.indent-- + ':parse done returning at ' + token[0] + ' (length: ' + node_list.length + ')');
                return node_list;
            }

            token = this.next_token();

            //util.debug('' + this.indent + ': ' + token);

            tag = this.tags[token.type];
            if (tag && typeof tag === 'function') {
                node_list.append(tag(this, token), token);
            } else {
                //throw new errors.TemplateParseError(this.filename, 'Unknown tag: ' + token[0]);
                node_list.append(
                    this.nodes.TextNode('[[ UNKNOWN ' + token.type + ' ]]'),
                    'UNKNOWN'
                );
            }
        }
        if (stoppers.length) {
            throw new errors.TemplateParseError(this.filename, 'Expected tag not found: ' + stoppers.join(', '));
        }

        //util.debug('' + this.indent-- + ':parse done returning end (length: ' + node_list.length + ')');

        return node_list;
    },

    next_token: function () {
        return this.token_list.shift();
    },

    delete_first_token: function () {
        this.token_list.shift();
    },

    make_filterexpression: function (expression, constant) {
        return new FilterExpression(expression, constant);
    }

});

/*************** Context *********************************/

function Context(o) {
    this.scope = [ o || {} ];
    this.extends = '';
    this.blocks = {};
    this.autoescaping = true;
    this.filters = require('./template_defaults').filters;
    this.node_stack = [];
}

util.inherits(Context, EventEmitter);

extend(Context.prototype, {
    get: function (name) {

        if (typeof name !== 'string') { return name; }

        var normalized = normalize(name);
        if (name !== normalized) { return normalized; }

        var parts = name.split('.');
        name = parts.shift();

        var val, level, next;
        for (level = 0; level < this.scope.length; level++) {
            if (this.scope[level].hasOwnProperty(name)) {
                val = this.scope[level][name];
                while (parts.length && val) {
                    next = val[parts.shift()];

                    if (typeof next === 'function') {
                        val = next.apply(val);
                    } else {
                        val = next;
                    }
                }

                if (typeof val === 'function') {
                    return val();
                } else {
                    return val;
                }
            }
        }

        this.emit('unrecognizedName', name, this.node_stack[0]);
        return undefined;
    },
    keys: function () {
        var keys = [];
        var visitedKeys = {}; // Use an object to track keys we already have
        var level;
        for (level = 0; level < this.scope.length; level++) {
            for (var key in this.scope[level]) {
                if (this.scope[level].hasOwnProperty(key) && !(key in visitedKeys)) {
                    keys.push(key);
                    visitedKeys[key] = null;
                }
            }
        }
        return keys;
    },
    set: function (name, value) {
        this.scope[0][name] = value;
    },
    push: function (o) {
        this.scope.unshift(o || {});
    },
    pop: function () {
        return this.scope.shift();
    }
});


/*********** Template **********************************/

function Template(input, filename) {
    this.set_source(input, filename);
}

util.inherits(Template, EventEmitter);

extend(Template.prototype, {
    set_source: function set_source(input, filename) {
        if(input)
        {
            this.parser = new Parser(input, filename);
            this.node_list = this.parser.parse();
        }
        else
        {
            this.parser = undefined;
            this.node_list = undefined;
        }
    },
    render: function render(o, callback) {

        if (!callback) { throw 'template.render() must be called with a callback'; }

        var context = (o instanceof Context) ? o : new Context(o || {});
        context.extends = '';

        var self = this;
        context.on('unrecognizedName', function (name, current_node) {
            var line = (current_node && current_node.token) ? current_node.token.lineNum : undefined;
            var col = (current_node && current_node.token) ? current_node.token.column : undefined;

            var filename = self.parser.filename;

            self.emit('unrecognizedName', name, filename, line, col);
        });

        this.node_list.evaluate(context, function (error, rendered) {
            if (error) { return callback(error); }

            if (context.extends) {
                var template_loader = require('./loader');
                template_loader.load_and_render(context.extends, context, callback);
            } else {
                callback(false, rendered);
            }
        });
    }
});

/********************************************************/

module.exports = {
    'parse': parse,

    // exported for test
    'Context': Context,
    'FilterExpression': FilterExpression,
    'tokenize': tokenize,
    'make_nodelist': make_nodelist
};
