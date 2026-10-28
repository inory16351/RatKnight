// 코드 셰이더: 명암 없이 뽑은 플랫 부위 그림에 명암을 얹는다.
// 부위 실루엣(알파)로 '쿠션' 높이를 만들고 → 법선 → 빛 방향과 내적 → 2단(그림자 1톤 + 하이라이트 1톤)으로 끊어 셀 셰이딩.
// 부위는 리그에서 계속 돌아가니 빛 방향(부위 기준)을 ANGLES 개로 나눠 미리 구워 두고, 그릴 때 가장 가까운 것을 고른다.

export const ANGLES = 24;

// 셰이더 값 (디버그 패널에서 바꾸면 다시 구움)
export const SHADE = {
  on: true,
  lightZ: 0.55,       // 빛이 화면 쪽으로 나온 정도 (클수록 그림자가 가장자리로 밀림)
  cushion: 0.42,      // 쿠션 반경 = 부위 짧은 변 × 이 값 (클수록 둥글게 넓은 명암)
  shadowAt: 0.38,     // 이 밝기 밑은 그림자 톤
  lightAt: 0.86,      // 이 밝기 위는 하이라이트 톤
  soft: 0.06,         // 경계 부드러움 (0 = 칼같은 셀)
  shadowCol: [46, 38, 96], shadowA: 0.34,   // 그림자: 남보라 곱하기
  lightCol: [255, 246, 220], lightA: 0.22,  // 하이라이트: 따뜻한 흰색 덧칠
  rimCol: [140, 190, 255], rimA: 0.0,       // 역광 테두리 (기본 끔 — 필요할 때)
  halftone: true, dot: 7,                    // 팝아트 망점: 그림자를 45도 격자 점으로 (점 크기 = 그림자 세기)
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6))); return t * t * (3 - 2 * t); };

// 실루엣 안쪽 거리 (체스판 거리 2패스 근사)
function distanceIn(alpha, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = alpha[i] > 127 ? INF : 0;
  const D1 = 1, D2 = 1.4142;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + D1); else v = Math.min(v, D1);
    if (y > 0) { v = Math.min(v, d[i - w] + D1); if (x > 0) v = Math.min(v, d[i - w - 1] + D2); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2); } else v = Math.min(v, D1);
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!d[i]) continue;
    let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + D1); else v = Math.min(v, D1);
    if (y < h - 1) { v = Math.min(v, d[i + w] + D1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2); if (x > 0) v = Math.min(v, d[i + w - 1] + D2); } else v = Math.min(v, D1);
    d[i] = v;
  }
  return d;
}

// 부위 하나의 법선맵 (한 번만 계산)
function normals(src) {
  const w = src.width, h = src.height;
  const px = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
  const a = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) a[i] = px.data[i * 4 + 3];
  const dist = distanceIn(a, w, h);
  const R = Math.max(2, Math.min(w, h) * SHADE.cushion * 0.5);
  // 높이: 가장자리 0 → 안쪽 R 에서 1 (원호 단면 = 쿠션)
  const H = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { const t = Math.min(1, dist[i] / R); H[i] = Math.sqrt(1 - (1 - t) * (1 - t)); }
  const N = new Float32Array(w * h * 3);
  const at = (x, y) => H[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (a[i] < 8) continue;
    const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -gx * R * 0.25, ny = -gy * R * 0.25, nz = 1;
    const l = Math.hypot(nx, ny, nz); N[i * 3] = nx / l; N[i * 3 + 1] = ny / l; N[i * 3 + 2] = nz / l;
  }
  return { w, h, base: px, a, N };
}

// 빛 각도(부위 기준, 라디안)마다 명암을 얹은 캔버스
function bakeOne(n, ang) {
  const S = SHADE, { w, h, base, a, N } = n;
  const lz = S.lightZ, lx = Math.cos(ang) * Math.sqrt(1 - lz * lz), ly = Math.sin(ang) * Math.sqrt(1 - lz * lz);
  const out = new ImageData(new Uint8ClampedArray(base.data), w, h), d = out.data;
  for (let i = 0; i < w * h; i++) {
    if (a[i] < 8) continue;
    const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    const lam = nx * lx + ny * ly + nz * lz;
    const sh = 1 - smooth(S.shadowAt - S.soft, S.shadowAt + S.soft, lam);
    const hi = smooth(S.lightAt - S.soft, S.lightAt + S.soft, lam);
    const rim = S.rimA ? smooth(0.55, 0.75, -(nx * lx + ny * ly)) * (1 - nz) : 0;
    let r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    // 그림자 = 곱하기 (원래 색의 채도를 살리며 남보라 쪽으로)
    // 망점: 45도 돌린 격자에서 가장 가까운 점 중심까지 거리 < 그림자 세기만큼 커지는 반지름 → 점 안은 진하게, 밖은 옅게
    let k = sh * S.shadowA;
    if (S.halftone && sh > 0.02) {
      const x = i % w, y = (i / w) | 0, D = S.dot;
      const u = (x + y) / Math.SQRT2 / D, v = (x - y) / Math.SQRT2 / D;
      const du = u - Math.round(u), dv = v - Math.round(v), r = Math.hypot(du, dv);
      const R = 0.62 * Math.sqrt(sh);
      k = S.shadowA * (r < R ? 1.7 : 0.45) * Math.min(1, sh * 1.6);
    }
    r = r * (1 - k) + r * S.shadowCol[0] / 255 * k; g = g * (1 - k) + g * S.shadowCol[1] / 255 * k; b = b * (1 - k) + b * S.shadowCol[2] / 255 * k;
    const q = hi * S.lightA; r += (S.lightCol[0] - r) * q; g += (S.lightCol[1] - g) * q; b += (S.lightCol[2] - b) * q;
    const e = rim * S.rimA; r += (S.rimCol[0] - r) * e; g += (S.rimCol[1] - g) * e; b += (S.rimCol[2] - b) * e;
    d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b;
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(out, 0, 0);
  return c;
}

export function bakePart(img) {
  const n = img.__n || (img.__n = normals(img));
  const v = [];
  for (let k = 0; k < ANGLES; k++) v.push(bakeOne(n, (k / ANGLES) * Math.PI * 2));
  return v;
}

// 화면 기준 빛 방향(라디안, 빛이 '가는' 쪽의 반대 = 빛이 오는 쪽)을 지금 변환의 부위 기준으로 바꿔 변형 번호를 고름
export function variantFor(ctx, worldAng) {
  const m = ctx.getTransform();
  // 선형 부분의 역변환으로 화면 벡터를 부위 기준으로 (크기는 무시)
  const det = m.a * m.d - m.b * m.c;
  const vx = Math.cos(worldAng), vy = Math.sin(worldAng);
  const lx = (m.d * vx - m.c * vy) / det, ly = (-m.b * vx + m.a * vy) / det;
  let ang = Math.atan2(ly, lx); if (ang < 0) ang += Math.PI * 2;
  return Math.round((ang / (Math.PI * 2)) * ANGLES) % ANGLES;
}

// 거의 돌지 않는 큰 부위(보스 등): 빛 각도 하나로만 명암을 구움
export function bakeLit(img, ang) {
  const n = img.__n || (img.__n = normals(img));
  return bakeOne(n, ang);
}

// 플랫하게 뽑은 그림을 코드로 픽셀화: cell 배 작게 줄여(평균색) 색을 step 단위로 끊고, 그릴 때 최근접으로 키움. 불러올 때 한 번만 굽는다
export function pixelate(im, cell, step = 24) {
  if (!im) return null;
  const w = Math.max(1, Math.round(im.width / cell)), h = Math.max(1, Math.round(im.height / cell));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 128) { p[i + 3] = 0; continue; }
    p[i + 3] = 255;
    for (let k = 0; k < 3; k++) p[i + k] = Math.round(p[i + k] / step) * step;
  }
  x.putImageData(d, 0, 0);
  return c;
}
