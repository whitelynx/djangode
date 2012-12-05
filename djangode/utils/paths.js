var util = require('util');
var fs = require('fs');
var path = require('path');
var errors = require('./errors');


// --------------------------------------------------------------------------------------------------------------------

/**
 * Find the full path and stats of the first file with the given name in one of the given directories.
 *
 * @param filename         the filename to search for
 * @param directories  the list of directories to search in
 * @param callback     function(error, absolute_path, stats)
 */
function find_file(filename, directories, callback)
{
    if(!callback)
    {
        throw 'paths.find_file() must be called with a callback';
    }
    var dirsToSearch = directories.slice();  // Copy the template_path array.

    function tryNextPathEntry()
    {
        if(dirsToSearch.length == 0)
        {
            callback(errors.FileNotFound(filename, directories));
            return;
        }

        var fullPath = path.join(dirsToSearch.shift(), filename);
        fs.stat(fullPath,
                function (error, stats)
                {
                    if(error)
                    {
                        tryNextPathEntry();
                    }
                    else
                    {
                        callback(null, fullPath, stats);
                    }
                });
    };

    tryNextPathEntry();
}

/**
 * Find the full path of the first file with the given name in one of the given directories, synchronously.
 *
 * @param filename         the filename to search for
 * @param directories  the list of directories to search in
 */
function find_file_sync(filename, directories)
{
    try
    {
        directories.forEach(
                function (dir)
                {
                    var fullPath = path.join(dir, filename);
                    if (fs.existsSync(fullPath))
                    {
                        // Found it! Throw to get out of the forEach().
                        throw {'fullPath': fullPath}
                    }
                });
    }
    catch(ex)
    {
        if(ex.fullPath)
        {
            // Got the full path; return it.
            return ex.fullPath;
        }
        else
        {
            throw ex;
        }
    }

    return undefined;
}


// --------------------------------------------------------------------------------------------------------------------

module.exports = {
    'find_file': find_file,
    'find_file_sync': find_file_sync,
};
