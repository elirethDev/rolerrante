// jsdom 30 does not implement Range.getClientRects or Range.getBoundingClientRect.
// ProseMirror-view uses these for coordinate-based operations.
// Stub returns: empty rect list + zero rect — sufficient for EditorView init + basic editing.

Range.prototype.getClientRects = function getClientRects(): DOMRectList {
  return {
    length: 0,
    item(_index: number) {
      return null;
    },
    [Symbol.iterator]() {
      return [][Symbol.iterator]();
    },
  } as unknown as DOMRectList;
};

Range.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON() {
      return {};
    },
  } as unknown as DOMRect;
};

// jsdom does not implement document.elementFromPoint, which ProseMirror-view
// calls from posAtCoords on mousedown. Stub returns null so PM's coordinate
// lookup degrades gracefully instead of throwing an unhandled exception.
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = function elementFromPoint(): Element | null {
    return null;
  };
}
