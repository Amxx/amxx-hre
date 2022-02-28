// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";

library Deque {
    error Empty();
    error OutOfBounds();

    struct Bytes32Deque {
        int128 _begin;
        int128 _end;
        mapping(int128 => bytes32) _data;
    }

    function pushBack(Bytes32Deque storage deque, bytes32 value) internal {
        unchecked {
            deque._data[deque._end++] = value;
        }
    }

    function pushFront(Bytes32Deque storage deque, bytes32 value) internal {
        unchecked {
            deque._data[--deque._begin] = value;
        }
    }

    function popBack(Bytes32Deque storage deque) internal returns (bytes32 value) {
        if (empty(deque)) revert Empty();
        unchecked {
            int128 idx = --deque._end;
            value = deque._data[idx];
            delete deque._data[idx];
        }
    }

    function popFront(Bytes32Deque storage deque) internal returns (bytes32 value) {
        if (empty(deque)) revert Empty();
        unchecked {
            int128 idx = deque._begin++;
            value = deque._data[idx];
            delete deque._data[idx];
        }
    }

    function front(Bytes32Deque storage deque) internal view returns (bytes32 value) {
        if (empty(deque)) revert Empty();
        return deque._data[deque._begin];
    }

    function back(Bytes32Deque storage deque) internal view returns (bytes32 value) {
        if (empty(deque)) revert Empty();
        unchecked {
            return deque._data[deque._end - 1];
        }
    }

    function at(Bytes32Deque storage deque, uint256 index) internal view returns (bytes32 value) {
        // int256(deque._begin) is a safe upcast
        int128 idx = SafeCast.toInt128(int256(deque._begin) + SafeCast.toInt256(index));
        if (idx >= deque._end) revert OutOfBounds();
        return deque._data[idx];
    }

    function clear(Bytes32Deque storage deque) internal {
        deque._begin = 0;
        deque._end = 0;
    }

    function length(Bytes32Deque storage deque) internal view returns (uint256) {
        unchecked {
            return uint256(int256(deque._end) - int256(deque._begin));
        }
    }

    function empty(Bytes32Deque storage deque) internal view returns (bool) {
        return deque._end <= deque._begin;
    }
}
