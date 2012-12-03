var util = require('util');

exports.reduce = function reduce(array, iter_callback, initial, result_callback) {

    var index = 0;

    if (!result_callback) { throw 'no result callback!!!'; }

    (function inner (error, value) {

        if (error) {
            return result_callback(error);
        }

        if (index < array.length) {
            process.nextTick( function () {
                try {
                    iter_callback( value, array[index], index, array, inner );
                    index = index + 1;
                } catch (e) {
                    result_callback(e);
                }
            });
        } else {
            result_callback( false, value );
        }
    })( false, initial );
}

