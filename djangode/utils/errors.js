var util = require('util');

// --------------------------------------------------------------------------------------------------------------------
// Base Error
// --------------------------------------------------------------------------------------------------------------------

function BaseError(name, level /*, message, ...*/)
{
    this.name = name;
    this.level = level;
    this.message = util.format.apply(this, Array.prototype.slice.call(arguments, 2))
    this.htmlMessage = util.format('<h2>%s</h2><p>%s</p>', name, this.message);

    Error.call(this, this.message);
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
// Invalid Value
// --------------------------------------------------------------------------------------------------------------------

function InvalidValue(value, message)
{
    if(message)
    {
        message = util.format.apply(this, Array.prototype.slice.call(arguments, 2))
    }
    else
    {
        message = util.format('Value %j is invalid!', value);
    }

    BaseError.call(this, "Invalid Value", "Error", message);
    this.htmlMessage = util.format(
            '<h2>Invalid Value</h2><p>%s</p>',
            message
            );
}

util.inherits(InvalidValue, BaseError);


// --------------------------------------------------------------------------------------------------------------------
// Not Iterable
// --------------------------------------------------------------------------------------------------------------------

function NotIterable(value)
{
    InvalidValue.call(this, value, 'Value %j is not iterable!', value);
}

util.inherits(NotIterable, InvalidValue);


// --------------------------------------------------------------------------------------------------------------------
// Not Numeric
// --------------------------------------------------------------------------------------------------------------------

function NotNumeric(value)
{
    InvalidValue.call(this, value, 'Value %j is not numeric!', value);
}

util.inherits(NotNumeric, InvalidValue);


// --------------------------------------------------------------------------------------------------------------------
// Template Error
// --------------------------------------------------------------------------------------------------------------------

function TemplateError(filename, token, message)
{
    var line = token.lineNum;
    var col = token.column;

    filename = filename || '<string>';

    BaseError.call(this, "Template Error", "Critical", 'Template Error at %s:%d:%d: %s', filename, line, col, message);
    this.htmlMessage = util.format(
            '<h2>Template Error</h2><p><em>in %s on line %d, column %d</em></p><p>%s</p></ul>',
            filename, line, col, message
            );
}

util.inherits(TemplateError, BaseError);


// --------------------------------------------------------------------------------------------------------------------
// Template Parse Error
// --------------------------------------------------------------------------------------------------------------------

function TemplateParseError(filename, message)
{
    filename = filename || '<string>';

    BaseError.call(this, "Template Parse Error", "Critical", 'Template Parse Error in %s: %s', filename, message);
    this.htmlMessage = util.format(
            '<h2>Template Parse Error</h2><p><em>in %s</em></p><p>%s</p></ul>',
            filename, message
            );
}

util.inherits(TemplateParseError, TemplateError);


// --------------------------------------------------------------------------------------------------------------------

module.exports = {
    'BaseError': BaseError,
    'FileNotFound': FileNotFound,
    'TemplateNotFound': TemplateNotFound,
    'InvalidValue': InvalidValue,
    'NotIterable': NotIterable,
    'NotNumeric': NotNumeric,
    'TemplateError': TemplateError,
    'TemplateParseError': TemplateParseError,
};
