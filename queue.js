class Queue {
    _first;
    _last;
    _size;

    constructor() {
        this._first = null;
        this._last = null;
        this._size = 0;
    }

    get size() { return this._size };

    enqueue(element) {
        const node = {
            element,
            next: null
        }

        if (!this._first)
            this._first = node;
        else
            this._last.next = node;

        this._last = node;

        this._size++;
    }

    dequeue() {
        const removed = this._first;
        
        this._first = removed.next;
        this._size--;

        return removed.element;
    }
}

module.exports = {
    Queue
};