/*jslint eqeqeq: true, undef: true, regexp: false */
/*global require, process, module, escape */

var util = require('util');
var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

var template_system = require('./template');
var paths = require('../utils/paths');
var errors = require('../utils/errors');


var cache = {};
var cache_enabled = true;
var template_path = ['/tmp'];
var templatetags_path = ['/tmp'];


// --------------------------------------------------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------------------------------------------------

/**
 * Retrieve the given template either from the cache or from its source file.
 *
 * @param name      the name of the template
 * @param callback  function(error, template)
 */
function load(name, callback)
{
    if (!callback) { throw 'loader.load() must be called with a callback'; }

    if (cache_enabled && cache[name] !== undefined)
    {
        callback(null, cache[name]);
    }
    else
    {
        add_to_cache(name, callback);
    }
}

/**
 * Render the given template, loading or re-loading it if necessary.
 *
 * @param name      the name of the template
 * @param context   the context to use when rendering the template
 * @param callback  function(error, output)
 */
function load_and_render(name, context, callback)
{
    load(name,
            function (error, template)
            {
                if (error)
                {
                    callback(error);
                }
                else
                {
                    template.render(context, callback);
                }
            });
}

function disable_cache()
{
    cache_enabled = false;
}

function enable_cache()
{
    cache_enabled = true;
}

function flush_cache()
{
    cache = {};
}

function set_path(tpath)
{
    if (typeof tpath == 'string')
    {
        tpath = [tpath];
    }

    template_path = tpath.map(function(p) { return path.resolve(p); });
}

function add_path(tpath)
{
    template_path.push(path.resolve(tpath));
}

function get_path()
{
    return template_path.slice();
}

function set_templatetags_path(ttpath)
{
    if (typeof ttpath == 'string')
    {
        ttpath = [ttpath];
    }

    templatetags_path = ttpath.map(function(p) { return path.resolve(p); });
}

function add_templatetags_path(ttpath)
{
    templatetags_path.push(path.resolve(ttpath));
}

function get_templatetags_path()
{
    return templatetags_path.slice();
}


// --------------------------------------------------------------------------------------------------------------------
// Filesystem-backed template
// --------------------------------------------------------------------------------------------------------------------

function FSTemplate(name)
{
    this.name = name;
    cache[name] = this;
}

util.inherits(FSTemplate, EventEmitter);

/**
 * Find name and modification time of this template's source file.
 *
 * @param callback  function(error, absolute_path, modification_time)
 */
FSTemplate.prototype.find_source = function (callback)
{
    if(!callback)
    {
        throw 'FSTemplate.find_source() must be called with a callback';
    }

    paths.find_file(this.name, template_path,
            function (error, fullPath, stats)
            {
                if(error instanceof errors.FileNotFound)
                {
                    templateError = new TemplateNotFound(template, template_path);
                    templateError.inner = error;
                    error = templateError;
                }

                callback(error, fullPath, stats ? stats.mtime : undefined);
            });
};

/**
 * Load and parse the template from its source file.
 *
 * @param callback  function(error, template)
 */
FSTemplate.prototype.load = function (callback) {
    if(!callback)
    {
        throw 'FSTemplate.load() must be called with a callback';
    }
    var self = this;

    self.find_source(
            function (error, fullPath, mtime)
            {
                if(error)
                {
                    return callback(error);
                }

                load_template_from(self, fullPath,
                        function(error, template)
                        {
                            if(template)
                            {
                                template.last_mtime = mtime;
                                template.on('unrecognizedName', function (name, filename, line, col) {
                                    self.emit('unrecognizedName', name, filename, line, col);
                                });
                            }

                            callback(error, template);
                        });
            });
};

/**
 * Render the template, re-loading it if necessary.
 *
 * @param context   the context to use when rendering the template
 * @param callback  function(error, output)
 */
FSTemplate.prototype.render = function (context, callback) {
    if(!callback)
    {
        throw 'FSTemplate.render() must be called with a callback';
    }
    var self = this;

    self.find_source(
            function (error, fullPath, mtime)
            {
                if(error)
                {
                    return callback(error);
                }

                if(self.full_path != fullPath || self.last_mtime != mtime)
                {
                    load_template_from(self, fullPath,
                            function(error, template)
                            {
                                if(error)
                                {
                                    return callback(error);
                                }

                                template.last_mtime = mtime;
                                template.on('unrecognizedName', function (name, filename, line, col) {
                                    self.emit('unrecognizedName', name, filename, line, col);
                                });

                                template.loaded_template.render(context, callback);
                            });
                }
                else
                {
                    self.loaded_template.render(context, callback);
                }
            });
};

/**
 * Check if this template has been loaded and is up to date.
 *
 * @param callback  function(error, is_current)
 */
FSTemplate.prototype.cache_is_current = function (callback)
{
    if(!callback)
    {
        throw 'FSTemplate.cache_is_current() must be called with a callback';
    }
    var self = this;

    if (cache_enabled && self.last_mtime instanceof Date)
    {
        self.find_source(
                function (error, fullPath, mtime)
                {
                    if(error)
                    {
                        return callback(error);
                    }

                    callback(null, mtime == self.last_mtime);
                });
    }
    else
    {
        callback(null, false);
    }
};


// --------------------------------------------------------------------------------------------------------------------
// Private helpers
// --------------------------------------------------------------------------------------------------------------------

/**
 * Load and parse the given FSTemplate's source file, and populate the FSTemplate.
 *
 * @param template  an FSTemplate instance to populate
 * @param fullPath  the full path to the the template source file to load
 * @param callback  function(error, template)
 */
function load_template_from(template, fullPath, callback)
{
    if(fullPath)
    {
        fs.readFile(fullPath,
                function (error, s)
                {
                    if(error)
                    {
                        return callback(error);
                    }

                    template.fullPath = fullPath;
                    template.loaded_template = template_system.parse(s, fullPath);

                    callback(null, template);
                });
    }
    else
    {
        callback(new Error(util.format("Invalid template path: %s", util.inspect(template.name))));
    }
}

function add_to_cache(name, callback)
{
    var template = new FSTemplate(name);
    template.load(callback);
}


module.exports = {
    'load': load,
    'load_and_render': load_and_render,
    'enable_cache': enable_cache,
    'disable_cache': disable_cache,
    'flush_cache': flush_cache,
    'set_path': set_path,
    'add_path': add_path,
    'get_path': get_path,
    'set_tags_path': set_templatetags_path,
    'add_tags_path': add_templatetags_path,
    'get_tags_path': get_templatetags_path
};
