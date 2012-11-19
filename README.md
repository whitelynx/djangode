djangode
========

Utility functions for [node.js][] that imitate some useful concepts from [Django][].

[node.js]: http://nodejs.org/
[Django]:  http://www.djangoproject.com/

Example usage:

```javascript
var dj = require('./djangode/core');
dj.serve(dj.makeApp([
	['^/$', function(req, res) {
		dj.respond(res, '<h1>Homepage</h1>');
	}],
	['^/other$', function(req, res) {
		dj.respond(res, '<h1>Other page</h1>');
	}],
	['^/page/(\\d+)$', function(req, res, page) {
		dj.respond(res, '<h1>Page ' + page + '</h1>');
	}]
]), 8008); // Serves on port 8008
```

Run `node examples/example.js` for a slightly more interesting example.


Templates
---------

djangode provides an implementation of Django's template system; see `TEMPLATES.md` for more information, and run
`node examples/template_example.js` for an example.
