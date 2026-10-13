export function serializePublicJson(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function applyStructuredData(id, data, doc = globalThis.document) {
  if (!id || !data || !doc) return () => {};
  let element = doc.getElementById(id);
  if (!element) {
    element = doc.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    doc.head.appendChild(element);
  }
  element.textContent = serializePublicJson(data);
  return () => element.remove();
}
