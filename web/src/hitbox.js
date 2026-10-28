// 옆모습 2D 판정. 공격 순간 생성한 도형과 몸 피격 도형을 직접 겹침 검사.
// 쿼터뷰의 바닥 깊이 띠는 사용하지 않음. 선은 양끝이 둥근 캡슐.
export const GRACE = { atk: 4, hurt: 3, player: 2 };
export const rect = (x0, x1, top, bot) => ({ kind: 'rect', x0: Math.min(x0, x1), x1: Math.max(x0, x1), top: Math.min(top, bot), bot: Math.max(top, bot) });
export const body = (x, y, hw, height) => rect(x - hw, x + hw, y - height, y);
export const area = (x, y, r) => ({ kind: 'circle', x, y, r });
export const foot = (x, y, r = GRACE.player) => area(x, y - r, r);
export const line = (x0, y0, x1, y1, width) => ({ kind: 'line', x0, y0, x1, y1, r: width / 2 });
export const ring = (x, y, r, width) => ({ kind: 'ring', x, y, r, width });
export function wedge(x, y, r, angle, half) {
  const n = Math.max(4, Math.ceil(half * 24));
  const points = [[x, y]];
  for (let i = 0; i <= n; i++) {
    const a = angle - half + i / n * half * 2;
    points.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return { kind: 'polygon', points };
}
export const grow = (b, n) => b.kind === 'rect' ? rect(b.x0 - n, b.x1 + n, b.top - n, b.bot + n) : b.kind === 'circle' || b.kind === 'line' ? { ...b, r: b.r + n } : b;
const sq = x => x * x;
const distance2 = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return sq(p[0] - a[0] - dx * u) + sq(p[1] - a[1] - dy * u);
};
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function contains(P, p) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i], b = P[j];
    if (distance2(p, a, b) < 1e-10) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function segmentsTouch(a, b, c, d) {
  const ab0 = cross(a, b, c), ab1 = cross(a, b, d), cd0 = cross(c, d, a), cd1 = cross(c, d, b);
  if (ab0 * ab1 < 0 && cd0 * cd1 < 0) return true;
  return distance2(a, c, d) < 1e-10 || distance2(b, c, d) < 1e-10 || distance2(c, a, b) < 1e-10 || distance2(d, a, b) < 1e-10;
}
const points = b => b.kind === 'rect' ? [[b.x0, b.top], [b.x1, b.top], [b.x1, b.bot], [b.x0, b.bot]] : b.points;
const segment = b => b.kind === 'line' ? [[b.x0, b.y0], [b.x1, b.y1]] : [[b.x, b.y], [b.x, b.y]];
function polyDistance2(P, p) {
  if (contains(P, p)) return 0;
  return Math.min(...P.map((a, i) => distance2(p, a, P[(i + 1) % P.length])));
}
export function touches(a, b) {
  if (!a || !b) return false;
  if (a.kind === 'ring' || b.kind === 'ring') {
    if (b.kind === 'ring') [a, b] = [b, a];
    const p = [a.x, a.y], P = points(b);
    const inner = Math.max(0, a.r - a.width / 2), outer = a.r + a.width / 2;
    if (P) return polyDistance2(P, p) <= outer * outer && Math.max(...P.map(q => Math.hypot(q[0] - a.x, q[1] - a.y))) >= inner;
    if (b.kind === 'ring') {
      const d = Math.hypot(a.x - b.x, a.y - b.y), bi = Math.max(0, b.r - b.width / 2), bo = b.r + b.width / 2;
      return d <= outer + bo && d + outer >= bi && d + bo >= inner;
    }
    const [s, e] = segment(b);
    return Math.sqrt(distance2(p, s, e)) <= outer + b.r && Math.max(Math.hypot(s[0] - a.x, s[1] - a.y), Math.hypot(e[0] - a.x, e[1] - a.y)) + b.r >= inner;
  }
  const A = points(a), B = points(b);
  if (A && B) {
    if (contains(A, B[0]) || contains(B, A[0])) return true;
    return A.some((p, i) => B.some((q, j) => segmentsTouch(p, A[(i + 1) % A.length], q, B[(j + 1) % B.length])));
  }
  if (A || B) {
    if (B) return touches(b, a);
    const [s, e] = segment(b);
    if (contains(A, s) || contains(A, e)) return true;
    return A.some((p, i) => {
      const q = A[(i + 1) % A.length];
      return segmentsTouch(s, e, p, q) || Math.min(distance2(s, p, q), distance2(e, p, q), distance2(p, s, e), distance2(q, s, e)) <= b.r * b.r;
    });
  }
  const [s, e] = segment(a), [p, q] = segment(b), r = a.r + b.r;
  return segmentsTouch(s, e, p, q) || Math.min(distance2(s, p, q), distance2(e, p, q), distance2(p, s, e), distance2(q, s, e)) <= r * r;
}
export const hitsFoot = touches;
export function drawBox(c, b, color = '#ff5d73') {
  c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.5; c.beginPath();
  const P = points(b);
  if (P) { c.moveTo(...P[0]); for (const p of P.slice(1)) c.lineTo(...p); c.closePath(); }
  else if (b.kind === 'line') {
    c.lineWidth = b.r * 2; c.lineCap = 'round'; c.moveTo(b.x0, b.y0); c.lineTo(b.x1, b.y1); c.globalAlpha = 0.3; c.stroke(); c.restore(); return;
  } else if (b.kind === 'ring') {
    c.arc(b.x, b.y, b.r + b.width / 2, 0, Math.PI * 2); c.moveTo(b.x + Math.max(0, b.r - b.width / 2), b.y); c.arc(b.x, b.y, Math.max(0, b.r - b.width / 2), 0, Math.PI * 2, true);
  } else c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  c.globalAlpha = 0.15; c.fill(); c.globalAlpha = 0.85; c.stroke(); c.restore();
}
