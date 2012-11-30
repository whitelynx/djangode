exports.values = function values(arrayOrArgs)
{
    var o = {};
    var a = (Array.isArray(arrayOrArgs)) ? arrayOrArgs : arguments;
    for(var i = 0; i < arguments.length; i++)
    {
        o[arguments[i]] = null;
    }
    return o;
}
