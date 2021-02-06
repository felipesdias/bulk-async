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
    if (timestamp <= 0)
        return;

    return new Promise(resolve => {
        setTimeout(resolve, timestamp);
    });
 }

function* nextArgument(collection) {
    for(let i=0; i<collection.length; i++) {
        yield {
            index: i,
            args: collection[i]
        };
    }
}

async function executor(executorId, callback, argumentsController, config, finalResult) {
    for(let item = argumentsController.next(); !item.done; item = argumentsController.next()) {
        let cont = 0;

        while (cont <= config.retry) {
            if (config.$stopProcess)
                return;

            try {
                const result = await callback(item.value.args);

                if (config.returnValue)
                    finalResult[item.index] = { status: 'OK', value: result, retries: cont };

                break;
            } catch(e) {
                const startExceptionTime = new Date().getTime();

                if (config.onError) {
                    await config.onError({args, retry: cont, error});
                }
    
                if (cont === config.retry) {
                    cont++;

                    if (config.ignoreExceptions) {
                        finalResult[item.index] = { status: 'ERROR', value: e, retries: cont };
                    } 
                    else {
                        config.$stopProcess = true;
                        config.$errorStopProcess = e;
                        throw e;
                    }
                } else {
                    cont++;
                    const endExceptionTime = new Date().getTime();   
                    await sleep(config.sleepOnRetry - endExceptionTime - startExceptionTime);
                }
            }
        }
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
        verbose: {},
        ...options
    }

    config.verbose = {
        exceptions: false,
        ...config.verbose
    }

    config.sizeLimit = Math.min(collection.length, config.sizeLimit);

    const promisses = [];
    const finalResult = {};

    const argumentsController = nextArgument(collection);

    for (let i = 0; i < config.sizeLimit; i++) {
        promisses.push(executor(i, callback, argumentsController, config, finalResult));
    }

    try {
        await Promise.all(promisses);
    } catch (e) {
        throw e;
    }

    if (config.returnValue)
        return Object.keys(finalResult).sort((a, b) => Number(a)-Number(b)).map(x => finalResult[x]);
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