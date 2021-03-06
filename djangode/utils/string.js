/*jslint laxbreak: true, eqeqeq: true, undef: true, regexp: false */
/*global require, process, exports */

var util = require('util');


// regular expression from django/utils/text.py in Django project.
var smartSplitRE = /([^\s"]*"(?:[^"\\]*(?:\\.[^"\\]*)*)"\S*|[^\s']*'(?:[^'\\]*(?:\\.[^'\\]*)*)'\S*|\S+)/g;

/* Function: smart_split(s)
 *      Split a string by spaces, leaving qouted phrases together. Supports both
 *      single and double qoutes, and supports escaping strings qoutes with
 *      backslashes. Qoutemarks wil not be removed.
 *
 *  Returns:
 *      Array of strings.
 */
function smart_split(s) {
    var out = [];
    var m = false;

    smartSplitRE.lastIndex = 0;
    while ((m = smartSplitRE.exec(s))) {
        out.push(m[0]);
    }
    return out;
}


// Modified from the above, mostly rewritten for JS expressions.
var exprRE = /(\d+(?:\.\d*)?|\.\d+|"(?:[^"\\]*(?:\\.[^"\\]*)*)"|'(?:[^'\\]*(?:\\.[^'\\]*)*)'|[!=]==|[|&+-]{2}|[!<>=*\/+-]=|[<>()\[\].!%^|&=*\/+-]|[a-zA-Z_$][^\s!@#%^&*().+=\[\]{}'"\/\\-]*)/g;

/* Function: expr_split(s)
 *      Split a string into expression tokens, leaving quoted phrases together.
 *      Supports both single and double quotes, and supports escaping
 *      characters inside strings with backslashes. Quotes will not be removed.
 *
 *  Returns:
 *      Array of strings.
 */
function expr_split(s) {
    var out = [];
    var m = false;

    exprRE.lastIndex = 0;
    while ((m = exprRE.exec(s))) {
        out.push(m[0]);
    }
    return out;
}


var quotesRE = /['"]/g;

/* Function: add_slashes
 *      Escapes qoutes in string by adding backslashes in front of them.
 */
function add_slashes(s) {
    return s.replace(quotesRE, "\\$&");
}


/* Function: cap_first
 *      Capitalizes first letter of string
 */
function cap_first(s) {
    return s[0].toUpperCase() + s.substring(1);
}


/*************************************************************************
 * sprintf() and str_repeat() from http://code.google.com/p/sprintf/
 */

/**
 * sprintf() for JavaScript v.0.4
 *
 * Copyright (c) 2007 Alexandru Marasteanu <http://alexei.417.ro/>
 * Thanks to David Baird (unit test and patch).
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 */

function str_repeat(i, m) { for (var o = []; m > 0; o[--m] = i); return(o.join('')); }

function sprintf() {
    var i = 0, a, f = arguments[i++], o = [], m, p, c, x;
    while (f) {
        if ((m = /^[^\x25]+/.exec(f))) o.push(m[0]);
        else if ((m = /^\x25{2}/.exec(f))) o.push('%');
        else if ((m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f))) {
            if (((a = arguments[m[1] || i++]) === null) || (a === undefined)) throw("Too few arguments.");
            if (/[^s]/.test(m[7]) && (typeof(a) != 'number'))
                throw("Expecting number but found " + typeof(a));
            switch (m[7]) {
                case 'b': a = a.toString(2); break;
                case 'c': a = String.fromCharCode(a); break;
                case 'd': a = parseInt(a, 10); break;
                case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
                case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
                case 'o': a = a.toString(8); break;
                case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
                case 'u': a = Math.abs(a); break;
                case 'x': a = a.toString(16); break;
                case 'X': a = a.toString(16).toUpperCase(); break;
            }
            a = (/[def]/.test(m[7]) && m[2] && a > 0 ? '+' + a : a);
            c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
            x = m[5] - String(a).length;
            p = m[5] ? str_repeat(c, x) : '';
            o.push(m[4] ? a + p : p + a);
        }
        else throw ("Huh ?!");
        f = f.substring(m[0].length);
    }
    return o.join('');
}

/******************************************************************************
 * titleCaps from http://ejohn.org/files/titleCaps.js (by John Resig), modified
 */

var small = "(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v[.]?|via|vs[.]?)";
var punct = "([!\"#$%&'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]*)";
var split = /[:.;?!] |(?: |^)["Ò]/g;
var word = /\b([A-Za-z][a-z.'Õ]*)\b/g;
var wordWithPunct = /[A-Za-z]\.[A-Za-z]/;

function titleCaps(title) {
    var parts = [], index = 0;

    while (true) {
        var m = split.exec(title);

        parts.push(title.substring(index, m ? m.index : title.length)
                .replace(word, capitalizeIfNoPunct)
                .replace(RegExp("\\b" + small + "\\b", "ig"), lower)
                .replace(RegExp("^" + punct + small + "\\b", "ig"), capitalizeAfterPunct)
                .replace(RegExp("\\b" + small + punct + "$", "ig"), capitalize));

        index = split.lastIndex;

        if (m) {
            parts.push(m[0]);
        } else {
            break;
        }
    }

    return parts.join("").replace(/ V(s?)\. /ig, " v$1. ")
            .replace(/(['Õ])S\b/ig, "$1s")
            .replace(/\b(AT&T|Q&A)\b/ig, function(all) {
                return all.toUpperCase();
            });
}

function lower(word) {
    return word.toLowerCase();
}

function capitalize(word) {
    return word.substr(0, 1).toUpperCase() + word.substr(1);
}

function capitalizeIfNoPunct(all) {
    return wordWithPunct.test(all) ? all : capitalize(all);
}

function capitalizeAfterPunct(all, punct, word) {
    return punct + capitalize(word);
}


/*************************************************************************/

function center(s, width) {
    if (s.length > width) { return s; }
    var right = Math.round((width - s.length) / 2);
    var left = width - (s.length + right);
    return str_repeat(' ', left) + s + str_repeat(' ', right);
}


/*************************************************************************/

// from: http://phpjs.org/functions/wordwrap, all credit to authors below
function wordwrap(str, int_width, str_break, cut) {
    // Wraps buffer to selected number of characters using string break char
    // version: 909.322
    // discuss at: http://phpjs.org/functions/wordwrap
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Nick Callen
    // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Sakimori    // +   bugfixed by: Michael Grier
    // *     example 1: wordwrap('Kevin van Zonneveld', 6, '|', true);
    // *     returns 1: 'Kevin |van |Zonnev|eld'
    // *     example 2: wordwrap('The quick brown fox jumped over the lazy dog.', 20, '\n');
    // *     returns 2: 'The quick brown fox \njumped over the lazy\n dog.'
    // *     example 3: wordwrap('Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
    // *     returns 3: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod \ntempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim \nveniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea \ncommodo consequat.'
    // PHP Defaults
    var m = ((arguments.length >= 2) ? arguments[1] : 75);
    var b = ((arguments.length >= 3) ? arguments[2] : "\n");
    var c = ((arguments.length >= 4) ? arguments[3] : false);

    var i, j, l, s, r;

    str += '';
    if (m < 1) {
        return str;
    }
    for (i = -1, l = (r = str.split(/\r\n|\n|\r/)).length; ++i < l; r[i] += s) {
        for (s = r[i], r[i] = ""; s.length > m; r[i] += s.slice(0, j) + ((s = s.slice(j)).length ? b : "")) {
            j = c == 2 || (j = s.slice(0, m + 1).match(/\S*(\s)?$/))[1] ? m : j.input.length - j[0].length ||
            c == 1 && m || j.input.length + (j = s.slice(m).match(/^\S*/)).input.length;
        }
    }
    return r.join("\n");
}


// replace groups in regex like string with replacer
function replace_groups(input, replacer) {
    var i, out = '', cnt = 0;
    for (i = 0; i < input.length; i += 1) {
        if (input[i] === '\\') {
            if (cnt === 0) {
                out += input[i] + input[i + 1];
            }
            i += 1;
            continue;
        }
        if (cnt === 0 && input[i] !== '(') {
            out += input[i];
            continue;
        }
        if (input[i] === '(') {
            cnt += 1;
        } else if (input[i] === ')') {
            cnt -= 1;
            if (cnt === 0) {
                out += replacer;
            }
        }
    }
    return out;
}

function regex_to_string(re, group_replacements) {
    var s = re.toString();

    // remove leading and trailing slashes
    s = s.substr(1, s.length - 2);

    // replace groups with '(())'
    s = replace_groups(s, '(())');

    // remove special chars
    s = s.replace(/\^|\$|\*|\+|\?|\.|\\cX|\\xhh|\\uhhhh|\\./g, function (m) {
        if (m[0] === '\\') {
            if (m.substr(1).match(/f|r|n|t|v|\d+|b|s|S|w|W|d|D|b|B/)) { return ''; }
            if (m.substr(1).match(/c.|x..|u..../)) {
                // jshint evil: true
                return eval("'" + m + "'");
            }
            return m[1];
        }
        return '';
    });

    // replace groups with replacers
    s = s.replace(/\(\(\)\)/g, function () { return (group_replacements || []).shift() || ''; });

    return s;
}

module.exports = {
    smart_split: smart_split,
    expr_split: expr_split,
    add_slashes: add_slashes,
    cap_first: cap_first,
    sprintf: sprintf,
    str_repeat: str_repeat,
    capitalize: capitalize,
    titleCaps: titleCaps,
    center: center,
    wordwrap: wordwrap,
    regex_to_string: regex_to_string
};
