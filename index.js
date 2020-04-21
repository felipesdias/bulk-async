'use strict';

/**
 * The Options is responsible for behavior of the methods
 * @typedef {Object} Verbose
 */

/**
 * The Options is responsible for behavior of the methods
 * @typedef {Object} Options
 * @property {Number} [retry=0] - Maximum number of retries
 * @property {Boolean} [ignoreExceptions=false] - Ignore exceptions and 
 * @property {Number} [sizeLimit=max] - Maximum executions at the same time
 * @property {Number} [sleepOnRetry=0] - Sleep when function fail
 * @property {Function|Promise} [onError] - Sleep when function fail
 * @property {Verbose} [verbose] - Sleep when function fail
 */

 function sleep(timestamp) {
    return new Promise(resolve => {
        setTimeout(resolve, timestamp);
    });
 }

async function processItem(callback, args, config) {
    if (config.stopProcess)
        return null;

    let cont = 0;
    while (cont <= config.retry) {
        try {
            return await callback(args);
        } catch (error) {
            if (config.onError) {
                await config.onError({args, retry: cont, error});
            }

            if (cont === config.retry && !config.ignoreExceptions) {
                config.stopProcess = true;
                throw error;
            }
            cont++;

            await sleep(config.sleepOnRetry);
        }
    }

    return null;
}

async function nextItem(control, id, resolve, reject) {
    if (control.config.stopProcess)
        resolve();

    if (control.current < control.max && !control.config.stopProcess) {
        const idx = control.current;
        control.current++;
        try {
            const result = await processItem(control.callback, control.collection[idx], control.config);
            if (control.config.returnValue)
                control.results[idx] = result;
            nextItem(control, id, resolve, reject);
        } catch (e) {
            reject(e);
        }
    } else {
        resolve();
    }
}

async function fastBatchAsync(collection, callback, options) {
    if (!Array.isArray(collection)) {
        throw 'collenction shold be a array';
    }

    if (typeof callback !== 'function') {
        throw 'callback shold be a function';
    }

    const config = {
        retry: 0,
        ignoreExceptions: false,
        sizeLimit: collection.length,
        ...options
    }

    config.verbose = {
        exceptions: false,
        ...config.verbose
    }

    config.sizeLimit = Math.min(collection.length, config.sizeLimit);

    const promisses = [];
    const control = {
        current: 0,
        max: collection.length,
        results: {},
        callback,
        collection,
        config
    };

    for (let i = 0; i < config.sizeLimit; i++) {
        promisses.push(new Promise((resolve, reject) => {
            nextItem(control, i, resolve, reject);
        }));
    }

    await Promise.all(promisses);

    if (config.returnValue)
        return Object.keys(control.results).map(x => control.results[x]);
}


/**
 * @name module.exports.map
 * @param {Array} collection - Collection of parameters
 * @param {Function|Promise} callback - Function that will be executed for each parameter in the collection
 * @param {Options} [options] - Behavior options
 * @returns {Promise<Array>}
 */
async function map(collection, callback, options = {}) {
    try {
        return await fastBatchAsync(collection, callback, {
            ...options,
            returnValue: true
        });
    } catch (e) {
        throw e;
    }
}

/**
 * @name module.exports.map
 * @param {Array} collection - Collection of parameters
 * @param {Function|Promise} callback - Function that will be executed for each parameter in the collection
 * @param {Options} [options] - Behavior options
 */
async function forEach(collection, callback, options) {
    try {
        return await fastBatchAsync(collection, callback, {
            ...options,
            returnValue: false
        });
    } catch (e) {
        throw e;
    }
}

module.exports = {
    map,
    forEach
}

