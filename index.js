const { Queue } = require('./queue');

/**
 * The Options is responsible for behavior of the methods
 * @typedef {Object} Options
 * @property {Number} [retry=0] - Maximum number of retries
 * @property {Boolean} [ignoreExceptions=false] - Ignore exceptions and 
 * @property {Number} [sizeLimit=max] - Maximum executions at the same time
 * @property {Number} [windowSize] - Maximum executions in window of miliseconds
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

const initDate = new Date().getTime();

/**
 * @name nextArgument
 * @param {Array} collection - Collection of parameters
 * @param {Options} [options] - Behavior options
 */
async function* nextArgument(collection, options) {
    const items = [];
    const queue = new Queue();

    let elementsOnRetry = 0;

    const retry = async (item) => {
        if (item.retries < options.retry) {
            elementsOnRetry++;

            if (options.sleepOnRetry > 0)
                await sleep(options.sleepOnRetry);

            items.push({
                ...item,
                retries: item.retries + 1
            });

            elementsOnRetry--;
        }
    }

    for (let i = collection.length - 1; i >= 0; i--) {
        items.push({
            index: i,
            args: collection[i],
            retry,
            retries: 0
        });
    }


    while (items.length > 0 || elementsOnRetry > 0) {
        if (items.length > 0) {
            if (options.windowSize) {
                if (queue.size >= options.sizeLimit) {
                    const oldest = queue.dequeue();

                    const timeToSleep = options.windowSize - (new Date().getTime() - oldest);

                    if (timeToSleep > 0)
                        await sleep(timeToSleep);
                }

                queue.enqueue(new Date().getTime());
            }

            const item = items.pop();

            yield item;
        }
        else
            await sleep(10);
    }
}

async function executor(executorId, callback, argumentsController, config, finalResult) {
    for (let item = await argumentsController.next(); !item.done; item = await argumentsController.next()) {
        item = item.value;

        if (config.verbose) {
            console.log(executorId, ":", item.index, item.args, new Date().getTime() - initDate);
        }

        if (config.$stopProcess)
            return;

        try {
            const result = await callback(item.args);

            if (config.returnValue)
                finalResult[item.index] = { status: 'OK', value: result, retries: item.retries };

        } catch (e) {
            if (config.onError) {
                await config.onError({ args: item.args, retries: item.retries, error: e });
            }

            if (item.retries + 1 === config.retry) {
                if (config.ignoreExceptions) {
                    finalResult[item.index] = { status: 'ERROR', value: e, retries: item.retries };
                }
                else {
                    config.$stopProcess = true;
                    config.$errorStopProcess = e;
                    throw e;
                }
            } else {
                item.retry(item);
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

    const argumentsController = nextArgument(collection, options);

    const finalResult = Array(collection.length);

    for (let i = 0; i < config.sizeLimit; i++) {
        promisses.push(executor(i, callback, argumentsController, config, finalResult));
    }

    await Promise.all(promisses);

    return finalResult;
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