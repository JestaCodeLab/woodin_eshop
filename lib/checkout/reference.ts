/**
 * Payment reference format: WD-<orderId>-<hex nonce>. The ONE definition, shared by the server
 * (confirm route, finalize) and the browser (confirmation page). New references carry 24 hex
 * characters; 8 is still accepted so orders started before the longer nonce keep working.
 * Safe for client and server code (no imports).
 */
export const REFERENCE_PATTERN = /^WD-(\d+)-([a-f0-9]{8,32})$/;

export const isReference = (value: string): boolean => REFERENCE_PATTERN.test(value);
