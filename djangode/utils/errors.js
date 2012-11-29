var util = require('util');


// --------------------------------------------------------------------------------------------------------------------
// Base Error
// --------------------------------------------------------------------------------------------------------------------

function BaseError(name, level /*, message, ...*/)
{
	this.name = name;
	this.level = level;
	this.message = util.format.apply(this, Array.prototype.slice(arguments, [2]))
    this.htmlMessage = util.format('<h2>%s</h2><p>%s</p>', name, this.message);

    Error.call(this);
}

util.inherits(BaseError, Error);

BaseError.prototype.toString = function()
{
    return this.message;
};


// --------------------------------------------------------------------------------------------------------------------
// File Not Found
// --------------------------------------------------------------------------------------------------------------------

function FileNotFound(filename, directories)
{
    BaseError.call(this, "File Not Found", "Critical",
            'File "%s" not found in the given directories:\n%s',
            filename,
            directories ? ' - ' + directories.join('\n - ') : ' (no directories given)'
            );
	this.htmlMessage = util.format(
            '<h2>File Not Found</h2><p>File "%s" not found in the given directories:</p><ul><li>%s</li></ul>',
            filename,
            directories.join('</li><li>')
            );
}

util.inherits(FileNotFound, BaseError);


// --------------------------------------------------------------------------------------------------------------------
// Template Not Found
// --------------------------------------------------------------------------------------------------------------------

function TemplateNotFound(template, templateSearchPath)
{
    BaseError.call(this, "Template Not Found", "Critical",
            'Template "%s" not found. Please check the template name, or your settings.\n\nTemplate search path:\n%s',
            filename,
            directories ? ' - ' + templateSearchPath.join('\n - ') : ' (no directories given)'
            );
	this.htmlMessage = util.format(
            '<h2>Template Not Found</h2><p>Template "%s" not found. Please check the template name, or your settings.</p><p>Template search path:</p><ul><li>%s</li></ul>',
            filename,
            templateSearchPath.join('</li><li>')
            );
}

util.inherits(TemplateNotFound, BaseError);


// --------------------------------------------------------------------------------------------------------------------

module.exports = {
    'BaseError': BaseError,
    'FileNotFound': FileNotFound,
    'TemplateNotFound': TemplateNotFound,
};
