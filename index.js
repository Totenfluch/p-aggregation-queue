const {default: PQueue} = require('p-queue');

class QueueClass {
    constructor() {
        this._queue = [];
    }
    enqueue(run, options) {
        const element = {
            options,
            run
        };
        for (let i = 0; i < this._queue.length; i += 1) {
            if (typeof options.mergeFn !== 'function') {
                continue;
            }
            for (let x = 0; x < options.mergePromise.length; x += 1) {
                const result = options.mergePromise[x](this._queue[i].options, options, options.mergeFn);
                if (result !== null) {
                    //console.log(result, `merged ${JSON.stringify(options)} WITH ${JSON.stringify(this._queue[i].options)}`);
                    this.removeItemFromQueueIndex(i);
                    this.insertIntoQueue(i, { run: result.fn, options: result.options });
                    return;
                }
            }
        }
        this._queue.push(element);
        //console.log(JSON.stringify(this._queue));
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

const queue = new PQueue({concurrency: 1, queueClass: QueueClass});

let count = 0;
queue.on('active', () => {
    console.log(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`);
    queue.pause();
    setTimeout(() => {
        queue.start();
    }, 1000);
});

async function singletip(from, to, coin, amount) {
    console.log('SINGLETIP CALL: ', from, to, coin, amount, 'SINGLETIP END');
    return `TX${from}${to}${coin}${amount}`;
}

async function multiTip(from, addresses) {
    console.log('MULTITIP ALL CALL', from, addresses, ' MULTITIP END');
    return `TX${from}${addresses}`;
}

const mergedFnGlobal = multiTip;

function mergeSingle(promise1Call, promise2Call, mergeFn) {
    if (promise1Call.method === promise2Call.method && promise1Call.from === promise2Call.from) {
        const toAddresses = {};
        toAddresses[`${promise1Call.to}`] = promise1Call.amount;
        toAddresses[`${promise2Call.to}`] = promise2Call.amount;
        return { 
            fn: async () => mergeFn(promise1Call.from, toAddresses),
            options: {
                method: 'multi',
                from: promise1Call.from,
                addresses: toAddresses,
                mergePromise: [],
                mergeFn: null,
            },
        }
    }
    return null;
}

function mergeToMulti(multiCall, singleCall, mergeFn) {
    if (multiCall.method === 'multi' && singleCall.method === 'single' && multiCall.from === singleCall.from) {
        multiCall.addresses[`${singleCall.to}`] = singleCall.amount;
        return { 
            fn: async () => mergeFn(multiCall.from, multiCall.addresses), 
            options: {
                method: 'multi',
                from: multiCall.from,
                addresses: multiCall.addresses,
                mergePromise: [],
                mergeFn: null,
            },
        };
    }
    return null;
}
 
async function run() {
    queue.add(() => singletip('stefan', 'TaXb1', 'tzc', 10), { method: 'single', from: 'stefan', to: 'TaXb1', amount: 10, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('torsten', 'TaXb2', 'tzc', 11), { method: 'single', from: 'torsten', to: 'TaXb2', amount: 11, mmergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('xana', 'TaXb3', 'tzc', 12), { method: 'single', from: 'xana', to: 'TaXb3', amount: 12, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('stefan', 'TaXb4', 'tzc', 15), { method: 'single', from: 'stefan', to: 'TaXb4', amount: 15, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('xana', 'TaXb5', 'tzc', 16), { method: 'single', from: 'xana', to: 'TaXb5', amount: 16, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('stefan', 'TaXb6', 'tzc', 17), { method: 'single', from: 'stefan', to: 'TaXb6', amount: 17, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('xana', 'TaXb7', 'tzc', 18), { method: 'single', from: 'xana', to: 'TaXb7', amount: 18, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('stefan', 'TaXb8', 'tzc', 19), { method: 'single', from: 'stefan', to: 'TaXb8', amount: 19, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
    queue.add(() => singletip('xana', 'TaXb9', 'tzc', 20), { method: 'single', from: 'xana', to: 'TaXb9', amount: 20, mergePromise: [mergeToMulti, mergeSingle], mergeFn: mergedFnGlobal });
}

run();