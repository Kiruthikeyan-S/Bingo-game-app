import * as THREE from 'three';

// 7-segment patterns: [a, b, c, d, e, f, g]
// a: top, b: top-right, c: bottom-right, d: bottom, e: bottom-left, f: top-left, g: middle
const SEGMENT_PATTERNS: Record<number, boolean[]> = {
  0: [true, true, true, true, true, true, false],
  1: [false, true, true, false, false, false, false],
  2: [true, true, false, true, true, false, true],
  3: [true, true, true, true, false, false, true],
  4: [false, true, true, false, false, true, true],
  5: [true, false, true, true, false, true, true],
  6: [true, false, true, true, true, true, true],
  7: [true, true, true, false, false, false, false],
  8: [true, true, true, true, true, true, true],
  9: [true, true, true, true, false, true, true],
};

export function create3DDigitMesh(
  digit: number,
  size: number = 0.5,
  material: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const pattern = SEGMENT_PATTERNS[digit] || SEGMENT_PATTERNS[0];

  const w = size * 0.45; // digit width
  const h = size * 0.9;  // digit height
  const thick = size * 0.09;
  const depth = size * 0.08;

  const hGeo = new THREE.BoxGeometry(w - thick * 0.8, depth, thick);
  const vGeo = new THREE.BoxGeometry(thick, depth, (h / 2) - thick * 0.8);

  const halfH = h / 2;
  const halfW = w / 2;

  // Segment a: Top horizontal
  if (pattern[0]) {
    const m = new THREE.Mesh(hGeo, material);
    m.position.set(0, depth / 2, -halfH + thick / 2);
    group.add(m);
  }
  // Segment b: Top-right vertical
  if (pattern[1]) {
    const m = new THREE.Mesh(vGeo, material);
    m.position.set(halfW - thick / 2, depth / 2, -halfH / 2);
    group.add(m);
  }
  // Segment c: Bottom-right vertical
  if (pattern[2]) {
    const m = new THREE.Mesh(vGeo, material);
    m.position.set(halfW - thick / 2, depth / 2, halfH / 2);
    group.add(m);
  }
  // Segment d: Bottom horizontal
  if (pattern[3]) {
    const m = new THREE.Mesh(hGeo, material);
    m.position.set(0, depth / 2, halfH - thick / 2);
    group.add(m);
  }
  // Segment e: Bottom-left vertical
  if (pattern[4]) {
    const m = new THREE.Mesh(vGeo, material);
    m.position.set(-halfW + thick / 2, depth / 2, halfH / 2);
    group.add(m);
  }
  // Segment f: Top-left vertical
  if (pattern[5]) {
    const m = new THREE.Mesh(vGeo, material);
    m.position.set(-halfW + thick / 2, depth / 2, -halfH / 2);
    group.add(m);
  }
  // Segment g: Middle horizontal
  if (pattern[6]) {
    const m = new THREE.Mesh(hGeo, material);
    m.position.set(0, depth / 2, 0);
    group.add(m);
  }

  return group;
}

export function create3DNumberMesh(
  num: number,
  size: number = 0.5,
  material: THREE.Material
): THREE.Group {
  const container = new THREE.Group();

  if (num < 10) {
    // Single digit centered
    const dMesh = create3DDigitMesh(num, size, material);
    container.add(dMesh);
  } else {
    // Two digits side by side
    const d1 = Math.floor(num / 10);
    const d2 = num % 10;
    const spacing = size * 0.35;

    const m1 = create3DDigitMesh(d1, size, material);
    m1.position.x = -spacing;
    container.add(m1);

    const m2 = create3DDigitMesh(d2, size, material);
    m2.position.x = spacing;
    container.add(m2);
  }

  return container;
}
