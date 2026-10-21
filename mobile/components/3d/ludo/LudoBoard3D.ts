import * as THREE from 'three';
import { LudoColor } from '../../../../shared/types';
import { LUDO_COLOR_HEX } from './LudoToken3D';

export const LUDO_SPACING = 0.54;

export function ludoRCToCoords(r: number, c: number, spacing: number = LUDO_SPACING): { x: number; z: number } {
  return {
    x: (c - 7) * spacing,
    z: (r - 7) * spacing,
  };
}

export function createLudoBoard3D(spacing: number = LUDO_SPACING): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ludo_board_3d';

  const boardSize = 15 * spacing + 0.5;

  // 1. Base Pedestal
  const baseGeo = new THREE.BoxGeometry(boardSize, 0.4, boardSize);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0a1024,
    roughness: 0.5,
    metalness: 0.25,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -0.2;
  base.receiveShadow = true;
  group.add(base);

  // Outer border rim
  const rimGeo = new THREE.BoxGeometry(boardSize + 0.08, 0.08, boardSize + 0.08);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x00d5f5 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = -0.01;
  group.add(rim);

  // 2. 4 Corner Large Player Bases (6x6 cells each)
  const baseWidth = 6 * spacing;
  const yardGeo = new THREE.BoxGeometry(baseWidth, 0.12, baseWidth);

  const yardConfigs: { color: LudoColor; centerR: number; centerC: number }[] = [
    { color: 'red', centerR: 2.5, centerC: 2.5 },
    { color: 'green', centerR: 2.5, centerC: 11.5 },
    { color: 'yellow', centerR: 11.5, centerC: 11.5 },
    { color: 'blue', centerR: 11.5, centerC: 2.5 },
  ];

  yardConfigs.forEach(({ color, centerR, centerC }) => {
    const coords = ludoRCToCoords(centerR, centerC, spacing);
    const yMat = new THREE.MeshStandardMaterial({
      color: LUDO_COLOR_HEX[color],
      roughness: 0.35,
      metalness: 0.2,
    });
    const yMesh = new THREE.Mesh(yardGeo, yMat);
    yMesh.position.set(coords.x, 0.06, coords.z);
    yMesh.receiveShadow = true;
    group.add(yMesh);

    // Inner white yard plate
    const innerGeo = new THREE.BoxGeometry(baseWidth * 0.72, 0.02, baseWidth * 0.72);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(coords.x, 0.12, coords.z);
    group.add(inner);
  });

  // 3. Track Cells & Safe Squares
  const cellGeo = new THREE.BoxGeometry(spacing * 0.94, 0.08, spacing * 0.94);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
  const safeStarMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  // Draw 15x15 cells that belong to the cross track (excluding the 4 yards)
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const inYard =
        (r < 6 && c < 6) ||
        (r < 6 && c >= 9) ||
        (r >= 9 && c >= 9) ||
        (r >= 9 && c < 6);

      if (inYard) continue;

      const coords = ludoRCToCoords(r, c, spacing);

      // Color home stretches
      let cellMat = whiteMat;
      if (r === 7 && c >= 1 && c <= 6) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.red, roughness: 0.3 });
      } else if (c === 7 && r >= 1 && r <= 6) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.green, roughness: 0.3 });
      } else if (r === 7 && c >= 8 && c <= 13) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.yellow, roughness: 0.3 });
      } else if (c === 7 && r >= 8 && r <= 13) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.blue, roughness: 0.3 });
      } else if (r === 6 && c === 1) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.red, roughness: 0.3 });
      } else if (r === 1 && c === 8) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.green, roughness: 0.3 });
      } else if (r === 8 && c === 13) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.yellow, roughness: 0.3 });
      } else if (r === 13 && c === 6) {
        cellMat = new THREE.MeshStandardMaterial({ color: LUDO_COLOR_HEX.blue, roughness: 0.3 });
      }

      const cellMesh = new THREE.Mesh(cellGeo, cellMat);
      cellMesh.position.set(coords.x, 0.04, coords.z);
      cellMesh.receiveShadow = true;
      group.add(cellMesh);

      // Star on Safe Squares (e.g. [8,2], [2,6], [6,12], [12,8])
      const isStarSafe =
        (r === 8 && c === 2) ||
        (r === 2 && c === 6) ||
        (r === 6 && c === 12) ||
        (r === 12 && c === 8);

      if (isStarSafe) {
        const starGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 5);
        const star = new THREE.Mesh(starGeo, safeStarMat);
        star.position.set(coords.x, 0.09, coords.z);
        group.add(star);
      }
    }
  }

  // 4. Center Home Finish Pyramid
  const centerGeo = new THREE.CylinderGeometry(0, spacing * 1.8, 0.35, 4);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.7,
    roughness: 0.2,
  });
  const centerPyramid = new THREE.Mesh(centerGeo, centerMat);
  centerPyramid.rotation.y = Math.PI / 4;
  centerPyramid.position.set(0, 0.18, 0);
  group.add(centerPyramid);

  return group;
}
