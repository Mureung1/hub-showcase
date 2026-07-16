import { timingSafeEqual } from 'node:crypto';
export function authorizeCron(authorization: string | null, secret: string): boolean { if (!authorization?.startsWith('Bearer ') || !secret) return false; const supplied = Buffer.from(authorization.slice(7)); const expected = Buffer.from(secret); return supplied.length === expected.length && timingSafeEqual(supplied, expected); }
