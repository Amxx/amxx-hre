// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library Deque {
    error OutOfBound();

    type Iterator is uint32; // not more than 128 so previous and next are in the same slot

    struct Node {
        Iterator previous;
        Iterator next;
        bytes32 data;
    }

    struct Bytes32Deque {
        Node[] _data;
    }

    function isNull(Iterator it) internal pure returns (bool) {
        return Iterator.unwrap(it) == 0;
    }

    function begin(Bytes32Deque storage deque) internal view returns (Iterator) {
        return deque._data.length == 0 ? Iterator.wrap(0) : deque._data[0].next;
    }

    function end(Bytes32Deque storage deque) internal view returns (Iterator) {
        return deque._data.length == 0 ? Iterator.wrap(0) : deque._data[0].previous;
    }

    function next(Bytes32Deque storage deque, Iterator it) internal view returns (Iterator) {
        if (isNull(it)) revert OutOfBound();
        return deque._data[Iterator.unwrap(it)].next;
    }

    function previous(Bytes32Deque storage deque, Iterator it) internal view returns (Iterator) {
        if (isNull(it)) revert OutOfBound();
        return deque._data[Iterator.unwrap(it)].previous;
    }

    function get(Bytes32Deque storage deque, Iterator it) internal view returns (bytes32) {
        if (isNull(it)) revert OutOfBound();
        return deque._data[Iterator.unwrap(it)].data;
    }

    function set(Bytes32Deque storage deque, Iterator it, bytes32 data) internal {
        if (isNull(it)) revert OutOfBound();
        deque._data[Iterator.unwrap(it)].data = data;
    }

    function front(Bytes32Deque storage deque) internal view returns (bytes32) {
        return get(deque, begin(deque));
    }

    function back(Bytes32Deque storage deque) internal view returns (bytes32) {
        return get(deque, end(deque));
    }

    function pushFront(Bytes32Deque storage deque, bytes32 data) internal {
        insertBefore(deque, begin(deque), data);
    }

    function pushBack(Bytes32Deque storage deque, bytes32 data) internal {
        insertAfter(deque, end(deque), data);
    }

    function popBack(Bytes32Deque storage deque) internal returns (bytes32) {
        return remove(deque, end(deque));
    }

    function popFront(Bytes32Deque storage deque) internal returns (bytes32) {
        return remove(deque, begin(deque));
    }

    function initialize(Bytes32Deque storage deque, bool reset) internal {
        if (deque._data.length == 0) {
            deque._data.push();
        } else if (reset) {
            Node[] storage items = deque._data;

            // reset begin and end.
            delete items[0];
            // reset length to reuse dirty storage
            assembly {
                sstore(items.slot, 0x01)
            }
        }
    }

    function insertBefore(Bytes32Deque storage deque, Iterator it, bytes32 data) internal {
        initialize(deque, false);

        Iterator other = deque._data[Iterator.unwrap(it)].previous;

        deque._data.push(Node({
            previous: other,
            next: it,
            data: data
        }));

        deque._data[Iterator.unwrap(it)].previous = deque._data[Iterator.unwrap(other)].next = Iterator.wrap(uint32(deque._data.length - 1));
    }

    function insertAfter(Bytes32Deque storage deque, Iterator it, bytes32 data) internal {
        initialize(deque, false);

        Iterator other = deque._data[Iterator.unwrap(it)].next;

        deque._data.push(Node({
            previous: it,
            next: other,
            data: data
        }));

        deque._data[Iterator.unwrap(it)].next = deque._data[Iterator.unwrap(other)].previous = Iterator.wrap(uint32(deque._data.length - 1));
    }

    function remove(Bytes32Deque storage deque, Iterator it) internal returns (bytes32) {
        require(!isNull(it), "invalid item");
        Node memory n = deque._data[Iterator.unwrap(it)];
        deque._data[Iterator.unwrap(n.previous)].next = n.next;
        deque._data[Iterator.unwrap(n.next)].previous = n.previous;
        delete deque._data[Iterator.unwrap(it)];
        return n.data;
    }
}
