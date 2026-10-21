import * as THREE from 'three';
import { LudoColor, LudoToken } from '../../../../shared/types';

export const LUDO_COLOR_HEX: Record<LudoColor, number> = {
  red: 0xef4444,
  green: 0x10b981,
  yellow: 0xf59e0b,
  blue: 0x3b82f6,
};

export function createLudoToken3D(
  token: LudoToken,
  isSelected: boolean = false,
  isMovable: boolean = false
): THREE.Group {
  const group = new THREE.Group();
  group.name = `ludo_token_${token.color}_${token.id}`;
  group.userData = { id: token.id, color: token.color, step: token.step };

  const colorHex = LUDO_COLOR_HEX[token.color] || 0xef4444;

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.2,
    metalness: 0.6,
    emissive: isMovable ? colorHex : 0x000000,
    emissiveIntensity: isMovable ? 0.35 : 0.0,
  });

  // 1. Wide Base
  const baseGeo = new THREE.CylinderGeometry(0.18, 0.23, 0.12, 16);
  const base = new THREE.Mesh(baseGeo, mat);
  base.position.y = 0.06;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Middle Body
  const bodyGeo = new THREE.CylinderGeometry(0.11, 0.17, 0.28, 14);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.24;
  body.castShadow = true;
  group.add(body);

  // 3. Spherical Head
  const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 0.44;
  head.castShadow = true;
  group.add(head);

  // Selection / Movable Glow Ring
  if (isMovable || isSelected) {
    const ringGeo = new THREE.RingGeometry(0.24, 0.32, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isSelected ? 0xffffff : 0x00e5ff,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);
  }

  group.position.y = isSelected ? 0.2 : 0.06;
  return group;
}
