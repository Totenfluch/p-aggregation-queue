const { default: PQueue } = require('p-aggregate-queue');

class QueueClass {
    constructor() {
        this._queue = [];
    }
    enqueue(run, options, resolve) {
        const element = {
            options,
            run
        };
        element.options.resolve = [resolve];
        for (let i = 0; i < this._queue.length; i += 1) {
            if (typeof options.mergeFn !== 'function') {
                continue;
            }
            for (let x = 0; x < options.mergePromise.length; x += 1) {
                const result = options.mergePromise[x](this._queue[i].options, options, options.mergeFn);
                if (result !== null) {
                    // console.log(result, `merged ${JSON.stringify(options)} WITH ${JSON.stringify(this._queue[i].options)}`);
                    this.removeItemFromQueueIndex(i);
                    this.insertIntoQueue(i,
                        {
                            run: async () => {
                                const fnResult = await result.fn();
                                const resolveArray = result.options.resolve;
                                for (let i = 0; i < resolveArray.length; i += 1) {
                                    resolveArray[i](fnResult);
                                }
                            },
                            options: result.options
                        });
                    return;
                }
            }
            // console.log('---')
            // console.log(this._queue);
        }
        this._queue.push(element);
        // console.log(JSON.stringify(this._queue));
    }
    removeItemFromQueueIndex(i) {
        return this._queue.splice(i, 1);
    }
    insertIntoQueue(i, item) {
        return this._queue.splice(i, 0, item);
    }
    dequeue() {
        const item = this._queue.shift();
        return item && item.run;
    }
    filter(options) {
        return this._queue;
    }
    get size() {
        return this._queue.length;
    }
}

let queue = new PQueue({ concurrency: 1, queueClass: QueueClass, throwOnTimeout: true, timeout: 600 });
queue.on('completed', (msg) => console.log(`Queue complete: ${msg}`));
queue.on('error', (error) => console.log(`ERR ${error}`));

let count = 0;
queue.on('active', () => {
    console.log(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`);
    queue.pause();
    setTimeout(() => {
        queue.start();
    }, 1000);
});

async function singletip(from, to, coin, amount) {
    console.log('START SINGLETIP CALL: ', from, to, coin, amount, 'SINGLETIP END');
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 500);
    });
    console.log('COMPLETE SINGLETIP CALL: ', from, to, coin, amount, 'SINGLETIP END');
    return `TX${from}${to}${coin}${amount}`;
}

async function multiTip(from, addresses) {
    console.log('START MULTITIP ALL CALL', from, addresses, ' MULTITIP END');
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 1000);
    });
    console.log('COMPLETE MULTITIP ALL CALL', from, addresses, ' MULTITIP END');
    return `TX${from}${JSON.stringify(addresses)}`;
}

const mergedFnGlobal = multiTip;

function mergeSingle(promise1Call, promise2Call, mergeFn) {
    if (promise1Call.method === promise2Call.method && promise1Call.from === promise2Call.from) {
        const toAddresses = {};
        if (promise1Call.to === promise2Call.to) {
            toAddresses[`${promise1Call.to}`] = promise1Call.amount + promise2Call.amount;
        } else {
            toAddresses[`${promise1Call.to}`] = promise1Call.amount;
            toAddresses[`${promise2Call.to}`] = promise2Call.amount;
        }
        return {
            fn: async () => mergeFn(promise1Call.from, toAddresses),
            options: {
                method: 'multi',
                from: promise1Call.from,
                addresses: toAddresses,
                mergePromise: [],
                mergeFn: null,
                resolve: promise1Call.resolve.concat(promise2Call.resolve),
            },
        }
    }
    return null;
}

function mergeToMulti(multiCall, singleCall, mergeFn) {
    if (multiCall.method === 'multi' && singleCall.method === 'single' && multiCall.from === singleCall.from) {
        if (multiCall.addresses[`${singleCall.to}`]) {
            multiCall.addresses[`${singleCall.to}`] = multiCall.addresses[`${singleCall.to}`] + singleCall.amount;
        } else {
            multiCall.addresses[`${singleCall.to}`] = singleCall.amount;
        }
        return {
            fn: async () => mergeFn(multiCall.from, multiCall.addresses),
            options: {
                method: 'multi',
                from: multiCall.from,
                addresses: multiCall.addresses,
                mergePromise: [],
                mergeFn: null,
                resolve: multiCall.resolve.concat(singleCall.resolve),
            },
        };
    }
    return null;
}

async function run() {
    const t1 = queue.add(() => singletip('stefan', 'TaXb1', 'tzc', 10), { method: 'single', from: 'stefan', to: 'TaXb1', amount: 10, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t2 = queue.add(() => singletip('torsten', 'TaXb2', 'tzc', 11), { method: 'single', from: 'torsten', to: 'TaXb2', amount: 11, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t3 = queue.add(() => singletip('xana', 'TaXb3', 'tzc', 12), { method: 'single', from: 'xana', to: 'TaXb3', amount: 12, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t4 = queue.add(() => singletip('stefan', 'TaXb4', 'tzc', 15), { method: 'single', from: 'stefan', to: 'TaXb4', amount: 15, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t5 = queue.add(() => singletip('xana', 'TaXb5', 'tzc', 16), { method: 'single', from: 'xana', to: 'TaXb5', amount: 16, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t6 = queue.add(() => singletip('stefan', 'TaXb6', 'tzc', 17), { method: 'single', from: 'stefan', to: 'TaXb6', amount: 17, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t10 = queue.add(() => singletip('torsten', 'TaXb2', 'tzc', 31), { method: 'single', from: 'torsten', to: 'TaXb2n', amount: 11, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t7 = queue.add(() => singletip('xana', 'TaXb7', 'tzc', 18), { method: 'single', from: 'xana', to: 'TaXb7', amount: 18, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t8 = queue.add(() => singletip('stefan', 'TaXb8', 'tzc', 19), { method: 'single', from: 'stefan', to: 'TaXb8', amount: 19, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    const t9 = queue.add(() => singletip('xana', 'TaXb9', 'tzc', 20), { method: 'single', from: 'xana', to: 'TaXb9', amount: 20, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    Promise.resolve(t1).then((value) => console.log(`Result t1: ${value}`));
    Promise.resolve(t2).then((value) => console.log(`Result t2: ${value}`));
    Promise.resolve(t3).then((value) => console.log(`Result t3: ${value}`));
    Promise.resolve(t4).then((value) => console.log(`Result t4: ${value}`));
    Promise.resolve(t5).then((value) => console.log(`Result t5: ${value}`));
    Promise.resolve(t6).then((value) => console.log(`Result t6: ${value}`));
    Promise.resolve(t7).then((value) => console.log(`Result t7: ${value}`));
    Promise.resolve(t8).then((value) => console.log(`Result t8: ${value}`));
    Promise.resolve(t9).then((value) => console.log(`Result t9: ${value}`));
    Promise.resolve(t10).then((value) => console.log(`Result t10: ${value}`));
}

run();