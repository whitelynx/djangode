exports.extend = function (original, extended) {
    for (var key in (extended || {})) {
        if (Object.prototype.hasOwnProperty.call(extended, key)) {
            original[key] = extended[key];
        }
    }
    return original;
};
