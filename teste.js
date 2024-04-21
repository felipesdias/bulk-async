const fastPromisses = require('./index');

// function sleep(timestamp) {
//     if (timestamp <= 0)
//         return;

//     return new Promise(resolve => {
//         setTimeout(resolve, timestamp);
//     });
//  }

// (async () => {
//     console.time('teste');

//     await fastPromisses.forEach([5000,4000,3000,2000,1000], async (item) => {
//         console.log('primeiro', item);
//         await sleep(item);
//         console.log('segundo', item);
//         return item;
//     }, { sizeLimit: 2 });

//     console.timeEnd('teste');
// })();

const sleep = (miliseconds) => new Promise(resolve => {
    setTimeout(resolve, miliseconds);
});

function random(max) {
    return Math.round(Math.random() * max + 0.5) - 1;
}

Array.prototype.random = function () {
    return this.length === 0
        ? null
        : this[random(this.length)];
};

Array.prototype.shuffle = function () {
    for (let i = 0; i < this.length; i++) {
        const pos = random(this.length);
        [this[i], this[pos]] = [this[pos], this[i]];
    }

    return this;
};


const n = 50;
const p = 10;
const np = Math.ceil(n / p);

const a = Array(n).fill(0).map((_, b) => random(1500)).shuffle();
const aSorted = a.map(x => x).sort((a, b) => a-b);


const b = [];
const bSorted = [];

for (let i = 0; i < np; i++) {
    b.push(a.slice(i * p, i * p + p));
}

for (let i = 0; i < np; i++) {
    bSorted.push(aSorted.slice(i * p, i * p + p));
}

//console.log(b);
// console.log(bSorted);

(async () => {
    console.time('speed up 1');
    const g = await fastPromisses.map(a, async (t) => {
        // if (Math.random() < 0.5)
        //     throw "bla";
        await sleep(t);
        return t;
    }, { sizeLimit: p, retry: 3, ignoreExceptions: true, sleepOnRetry: 0, windowSize: 1000 });
    console.timeEnd('speed up 1');

    console.time('batch sorted 1');
    const oiSorted = [];
    for (const batch of bSorted) {
        // oiSorted.push(...(
            await Promise.all(
                batch.map((x) => new Promise(resolve => {
                    setTimeout(() => {
                        resolve(x)
                    }, x);
                }))
            )
        // ));
    }
    console.timeEnd('batch sorted 1');

    console.time('batch 2');
    const oi = [];
    for (const batch of b) {
        // oi.push(...(
            await Promise.all(
                batch.map((x) => new Promise(resolve => {
                    setTimeout(() => {
                        resolve(x)
                    }, x);
                }))
            )
        // ));
    }
    console.timeEnd('batch 2');

    // console.log(g);
})();