Djangode Templates
==================

The template system is a complete port of the real Django template system
implemented for Node.js. It uses the same syntax and it supports (almost) all
the default Django (version 1.1) template tags and filters, so if you are used
to writing Django templates, you can jump right in!

If not, I suggest you take a look at the really excellent documentation that is
provided for it -- most of it is just as useful for Djangode templates as it
is for Django:

[Django Template Documentation](http://docs.djangoproject.com/en/1.1/topics/templates/)

For now, let's look at how to use the template system with Djangode and Node.js:

```javascript
var dj = require('./djangode'),
	template = require('./template/template');

var app = dj.makeApp([
	['^/$', function(req, res) {
		var t = template.parse('{% for name in list %}Hello, {{ name|capfirst }}!\n{% endfor %}');
		var context = { list: [ 'alice', 'bob', 'caitlyn' ] };

		t.render(context, function (error, result) {
			if (error) {
				dj.default_show_500(req, res, error);
			} else {
				dj.respond(res, result, 'text/plain');
			}
		});
	}]
]);

dj.serve(app, 8000);
```

The `parse()` function parses a string into a template object, and the template
object's `render()` function renders the template with a context.

The `render()` function uses the same callback style as the Node.js standard API
function; The last argument is a callback that is executed when the template is
rendered, and the first argument to the callback is an error flag that is
raised if something goes wrong. The result is passed along as the second
argument to the callback.



Template loader
---------------

Most of the time you do not want to serve your templates from strings, you will
want to keep them in files and use the `template_loader` module.

```javascript
var dj = require('./djangode'),
	template = require('./template/template'),
	loader = require('./template/loader');

loader.set_path('.');

var app = dj.makeApp([
	['^/$', function (req, res) {
		loader.load('template.html', function (error, t) {
			t.render({ list: ['alice', 'bob', 'caitlyn' ] }, function (error, result) {
				if (error) {
					dj.default_show_500(req, res, error);
				} else {
					dj.respond(res, result, 'text/plain');
				}
			});
		});
	}]
]);

dj.serve(app, 8000);
```

Now, the template will be rendered from the `./template.html` file. The above
chaining of load and render is pretty common so you could use the
`load_and_render` shortcut:

```javascript
loader.load_and_render('template.html', context, function (error, result) {
	if (error) {
		dj.default_show_500(req, res, error);
	} else {
		dj.respond(res, result, 'text/plain');
	}
});
```

The loader automatically caches loaded templates, and will re-load them only if
the template source file's modification time has changed, or if something
caused the template name (`template.html` in the example above) to resolve to a
different file. (e.g. if you change the template path at runtime)



Template inheritance
--------------------

You can extend and inherit your templates from other templates by using the
extend and block tags. See the Django template documentation for a description
of this and some examples. Djangode templates work the same way!

[Template inheritance](http://docs.djangoproject.com/en/1.1/topics/templates/#id1)



Autoescaping
------------

Djangode templates autoescape everything that is not explicitly marked as safe
with the `safe` filter. Let's say you have a context that looks like this:

```javascript
{ str: '<script type="text/javascript">alert("hey!")</script>' };
```

Rendering that will provide output like this:

```htmldjango
{{ str }}  <!-- &lt;script type=&qout;text/javascript&qout;&gt;alert(&qout;hey!&qout;)&lt;/script&gt; -->
{{ str|safe }} <!-- <script type="text/javascript">alert("hey!")</script> -->
{% autoescape off %}
	{{ str }} <!-- <script type="text/javascript">alert("hey!")</script> -->
{% endautoescape %}
```

The autoescaping in djangode follows the same rules as django templates - read
in detail about it here:

[Autoescaping](http://docs.djangoproject.com/en/1.1/topics/templates/#id2)



Extending the template system
-----------------------------

Djangode supports (almost) all the Django default templates and filters, and
they should cover most of what you need in your templates, however, there may
be times when it is convenient or even neccessarry to implement your own tags
or filters. In Djangode an extention package is simply any standard Node.js
module that exports the two objects tags and filters.

Before you start making your own tags and filters you should read the Django
documentation on the subject. Djangode is JavaScript, not Python, but even
though things are different Djangode templates builds upon the same ideas and
uses the same concepts as Django:

[Extending the template system](http://docs.djangoproject.com/en/1.1/howto/custom-template-tags/)

```javascript
exports.filters = {
	firstletter: function (value, arg, safety) {
		return String(value)[0];
	}
};

exports.tags = {
	uppercase_all: function (parser, token) {

		var nodelist = parser.parse('enduppercase_all');
		parser.delete_first_token();

		return function (context, callback) {
			nodelist.evaluate(context, function (error, result) {
				if (error) {
					callback(error);
				} else {
					callback(false, result.toUpperCase());
				}
			});
		};
	}
};
```

Here's an example of a template that uses the above module (you will need to
save the above module as `tagtest.js` and put it in a directory somewhere on
your template path for this example to work):

```htmldjango
{% load tagtest %}
{{ str|firstletter }}
{% uppercase_all %}
This text will all be uppercased.
{% enduppercase_all %}
```


### Custom Filters ########

Filters are javascript functions. They receive three arguments: the value the
filter should operate on, the arguments passed to the filter, and an object
that describes the current safety state of the value.

```javascript
function my_filter(value, args, safety) {
	return 'some_result';
}
```

Safety has two properties: `is_safe` and `must_escape`. `is_safe` tells wether
or incoming value is considered safe, and therefore should not be escaped.

If the value is not safe, the `must_escape` property tells if it should be
escaped, that is, if autoescaping is enabled or the `escape` filter has been
applied to the current filter chain.

If your filter will output any "unsafe" characters such as `<`, `>`, `&`, or
`"`, it must escape the entire value if the string if the `must_escape`
property is enabled. When you have escaped the output, set `safety.is_safe` to
`true`.

If `is_safe` is already marked as `true`, the value may already contain HTML
characters that should not be escaped. If you cannot correctly handle that, your
filter should fail and return an empty string.

```javascript
function my_filter(value, args, safety) {

	/* do processing */

	html = require('./utils/html');

	if (!safety.is_safe && safety.must_escape) {
		result = html.escape(result);
		safety.is_safe = true;
	}
	return result;
}
```

If your filter does not output any "unsafe" characters, you can completely
disregard the safety argument.


### Custom Tags ########

Tags are called with two arguments: the parser, and the token. The token
represents the tag itself (or the opening tag if it's a block tag) and contains
the tagname and the tag's contents. Use the `token.split_contents()` function
to split the contents into arguments. The `split_contents()` function
recognizes quoted values, and will not split them.

```javascript
// {% my_tag is "the best" %}
function (parser, token) {
	token.type // 'my_tag'
	token.contents // 'my_tag is "the best"'
	token.split_contents() // ['my_tag', 'is', 'the best'];

	// see the utils/tags module for some helper functions for parsing and verifying tokens.
}
```

Your tag function is called when parsing the template, and must return an inner
function that takes a context and a callback as arguments. This inner function
is then called when the node is rendered. When you have generated the tag's
output, you must call the passed callback function, which takes an error state
and the output of the tag as arguments.

```javascript
function (parser, token) {
	// ... parse token ...
	return function (context, callback) {
		context.push(); // push a new scope level onto the scope stack.
		// any variables set in the context will have precedence over
		// similarly-named variables in lower scope levels

		context.set('name', 15); // set the variable "name" to 15

		var variable = context.get('variable'); // get the value of "variable"

		context.pop(); // pop the topmost scope level off the scope stack.

		callback(false, result); // complete rendering by calling the callback with the result of the node
	}
}
```

If you want to create a tag that contains other tags (like the `uppercase_all`
tag above) you must use the parser to parse them:

```javascript
function (parser, token) {
	// parses until it reaches an 'endfor' tag or an 'else' tag
	var node_list = parser.parse('endfor', 'else');

	// parsing stops before the first listed tag it reaches, so get rid of it before returning.
	parser.delete_first_token();

	var next_token = parser.next_token(); // parse a single token.

	return function (context, callback) {
		node_list.evaluate(context, function (error, result) {
			// process the result of the evaluated nodelist an return by calling callback().
			// remember to check the error flag!
		}
	}
}
```



Other differences from Django
-----------------------------
### Set tag #
The `set/endset` tag allows you to assign any block of text to a variable,
including HTML and template text.

### Numcomma filter #

The `numcomma` filter will add commas to any number as appropriate. This mimcs 
django.contrib.humanize.intcomma, except that it supports all numeric types.

### Cycle tag ########

The cycle tag does not support the legacy notation `{% cycle row1,row2,row3 %}`.
Use the new and improved syntax described in the django docs:

[Documentation for the cycle tag](http://docs.djangoproject.com/en/1.1/ref/templates/builtins/#cycle)


### Stringformat filter #######

The `stringformat` filter is based on Alexandru Marasteanu's `sprintf()` function
and it behaves like regular C-style `sprintf`. Django's `stringformat` tag uses
Python's `sprintf` function, and it has some (very few) nonstandard extensions.
These are not supported by djangode's `stringformat` tag. Most of the time you
won't have any problems, though.

[sprintf() on Google Code](http://code.google.com/p/sprintf/)


### Url Tag #########

The `url` tag only supports named urls, and you have to register them with the
template system before you can use them by assigning your urls to the special
variable `process.djangode_urls`, like this:

```javascript
var app = dj.makeApp([
	['^/item/(\w+)/(\d+)$', function (req, res) { /* ... */ }, 'item']
]);
dj.serve(app, 8000);
process.djangode_urls = app.urls;
```

Then you can use the url tag in any template:

```htmldjango
{% url "item" 'something',27 %} <!-- outputs: /item/something/27 -->
```

Like in django you can also store the url in a variable and use it later in the
site.

```htmldjango
{% url "item" 'something',27 as the_url %}
<a href="{{ the_url }}">This is a link to {{ the_url }}</a>
```

Read more about the url tag here:

[Django documentation for url tag](http://docs.djangoproject.com/en/1.1/ref/templates/builtins/#url)


### Unsupported Tags and Filters ########

The plan is to support all Django tags and filters, but currently the filters
`iriencode` and `unordered_list` and the tags `ssi` and `debug` are not supported.
