const fastPromisses = require('./index');

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


const n = 300;
const p = 25;
const np = Math.ceil(n / p);

const a = Array(n).fill(0).map((_, b) => b).shuffle();
const b = [];

for (let i = 0; i < np; i++) {
    b.push(a.slice(i * p, i * p + p));
}

console.log(b);

(async () => {
    console.time('speed up');
    const g = await fastPromisses.map(a, async (t) => {
        await sleep(t);
        return t;
    }, { retry: 3, ignoreExceptions: true });
    console.timeEnd('speed up');

    console.time('speed up');
    await fastPromisses.forEach(a, async (t) => {
        await sleep(t);
        return t;
    }, { retry: 3, ignoreExceptions: true });
    console.timeEnd('speed up');

    console.time('batch');
    const oi = [];
    for (const batch of b) {
        oi.push(...(await Promise.all(
            batch.map((x) => new Promise(resolve => {
                setTimeout(() => {
                    resolve(x)
                }, x);
            }))
        )));
    }
    console.timeEnd('batch');

    // console.log(g);
})();