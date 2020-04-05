const {default: PQueue} = require('p-queue');

class QueueClass {
    constructor() {
        this._queue = [];
    }
    enqueue(run, options) {
        options = Object.assign({ priority: 0 }, options);
        const element = {
            options,
            run
        };
        for (let i = 0; i < this._queue.length; i += 1) {
            if (typeof options.mergeFn !== 'function') {
                continue;
            }
            const result = options.mergePromise(this._queue[i].options, options, options.mergeFn);
            if (result !== null) {
                //console.log(result, `merged ${JSON.stringify(options)} WITH ${JSON.stringify(this._queue[i].options)}`);
                this.removeItemFromQueueIndex(i);
                this.insertIntoQueue(i, {run: result, options: {}});
                return;
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

const queue = new PQueue({concurrency: 2, queueClass: QueueClass});

let count = 0;
queue.on('active', () => {
    console.log(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`);
    queue.pause();
    setTimeout(() => {
        queue.start();
    }, 1000);
});

async function promise1(user, number) {
    console.log('PROMISE1 CALL: ', user, number, 'END PROMISE 1 CALL');
}

async function promiseAll(combined) {
    console.log('PROMISE ALL CALL', combined, ' END ALL CALL');
}

const mergedFnGlobal = promiseAll;

function mergePromise(promise1Call, promise2Call, mergedFn) {
    if (promise1Call.method === promise2Call.method) {
        const concatParams = [];
        concatParams.push({paramsF1: promise1Call, paramsF2: promise2Call});
        return async () => mergedFn(concatParams);
    }
    return null;
}
 
async function run() {
    queue.add(() => promise1('stefan', 98), {method: 'xy', param1: 'asdf', param2: 99, mergePromise, mergeFn: mergedFnGlobal });
    queue.add(() => promise1('peter', 98), {method: 'xy', param1: 'asdfj', param2: 98, mergePromise, mergeFn: mergedFnGlobal });
    queue.add(() => promise1('dofian', 97), {method: 'xy', param1: 'asdfj', param2: 97, mergePromise, mergeFn: mergedFnGlobal });
    queue.add(() => promise1('stefan', 1), {method: 'promise1', param1: 'stefan', param2: 1, mergePromise, mergeFn: mergedFnGlobal });
    queue.add(() => promise1('stefan', 2), {method: 'promise1', param1: 'stefan', param2: 2, mergePromise, mergeFn: mergedFnGlobal });
    queue.add(() => promise1('kevin', 3), {method: 'promise1', param1: 'kevin', param2: 3, mergePromise, mergeFn: mergedFnGlobal });
    queue.add(() => promise1('kevin', 4), {method: 'promise1', param1: 'kevin', param2: 4, mergePromise, mergeFn: mergedFnGlobal });
    queue.add(() => promise1('kevin', 5), {method: 'promise1', param1: 'kevin', param2: 5, mergePromise, mergeFn: mergedFnGlobal });
}

run();