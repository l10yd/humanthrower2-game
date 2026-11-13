export interface Vec3 { x: number; y: number; z: number }
export interface Quat { x: number; y: number; z: number; w: number }
export const vec = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => vec(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => vec(a.x - b.x, a.y - b.y, a.z - b.z);
export const mul = (a: Vec3, k: number): Vec3 => vec(a.x * k, a.y * k, a.z * k);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const length = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const normalize = (a: Vec3): Vec3 => mul(a, 1 / (length(a) || 1));
export const conjugate = (q: Quat): Quat => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
export function rotate(v: Vec3, q: Quat): Vec3 {
  const u = vec(q.x, q.y, q.z); return add(v, add(mul(cross(u, v), 2 * q.w), mul(cross(u, cross(u, v)), 2)));
}
export function axisAngle(axis: Vec3, angle: number): Quat {
  const s = Math.sin(angle / 2); const n = normalize(axis); return { x: n.x * s, y: n.y * s, z: n.z * s, w: Math.cos(angle / 2) };
}
export const identity: Quat = { x: 0, y: 0, z: 0, w: 1 };
export function pointVelocity(v: Vec3, omega: Vec3, point: Vec3, com: Vec3): Vec3 { return add(v, cross(omega, sub(point, com))); }
