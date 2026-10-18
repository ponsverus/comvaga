const listeners = new Set();

let activeItem = null;
let pendingItems = [];
let state = createSnapshot();

function createSnapshot() {
  if (!activeItem) {
    return { open: false, payload: null, hasNext: false, hasPrevious: false, isPaged: false };
  }

  if (activeItem.kind === 'messages') {
    const payload = activeItem.pages[activeItem.index];
    return {
      open: true,
      payload,
      hasNext: activeItem.index < activeItem.pages.length - 1,
      hasPrevious: activeItem.index > 0,
      isPaged: activeItem.pages.length > 1,
    };
  }

  return {
    open: true,
    payload: activeItem.payload,
    hasNext: false,
    hasPrevious: false,
    isPaged: false,
  };
}

function publish() {
  state = createSnapshot();
  listeners.forEach((listener) => listener(state));
}

function createItem(payload) {
  return payload?.type === 'message'
    ? { kind: 'messages', pages: [payload], index: 0 }
    : { kind: 'dialog', payload };
}

export function getFeedbackState() {
  return state;
}

export function enqueueFeedback(payload) {
  const item = createItem(payload);

  if (!activeItem) {
    activeItem = item;
  } else if (item.kind === 'messages') {
    const lastPending = pendingItems[pendingItems.length - 1];
    if (activeItem.kind === 'messages' && pendingItems.length === 0) {
      activeItem.pages.push(payload);
    } else if (lastPending?.kind === 'messages') {
      lastPending.pages.push(payload);
    } else {
      pendingItems.push(item);
    }
  } else {
    pendingItems.push(item);
  }

  publish();
}

export function navigateFeedback(direction) {
  if (activeItem?.kind !== 'messages') return;

  const lastIndex = activeItem.pages.length - 1;
  const nextIndex = direction === 'next'
    ? Math.min(activeItem.index + 1, lastIndex)
    : Math.max(activeItem.index - 1, 0);

  if (nextIndex === activeItem.index) return;
  activeItem.index = nextIndex;
  publish();
}

export function dismissFeedback(result) {
  if (!activeItem) return;

  const payload = activeItem.kind === 'messages'
    ? activeItem.pages[activeItem.index]
    : activeItem.payload;
  activeItem = pendingItems.shift() || null;
  publish();

  if (typeof payload?.__resolve === 'function') payload.__resolve(result);
  if (typeof payload?.onClose === 'function') payload.onClose();
}

export function subscribeFeedback(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
