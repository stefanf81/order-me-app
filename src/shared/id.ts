/**
 * A standard UUID v4. Uses the Web Crypto API in secure contexts (HTTPS or localhost);
 * falls back to a pseudo-random UUID when testing on a phone over plain HTTP on LAN,
 * where `crypto.randomUUID` is undefined.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
