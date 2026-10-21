import * as THREE from 'three';
import { THEMES, ThemeId } from '../../../store/graphicsStore';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export interface ChessBoard3DConfig {
  themeId?: ThemeId;
  spacing?: number;
}

export function squareToCoords(
  squareName: string,
  spacing: number = 0.95
): { x: number; z: number } {
  const file = squareName[0];
  const rank = squareName[1];
  const c = FILES.indexOf(file);
  const r = RANKS.indexOf(rank);

  return {
    x: (c - 3.5) * spacing,
    z: (r - 3.5) * spacing,
  };
}

export function coordsToSquare(x: number, z: number, spacing: number = 0.95): string | null {
  const c = Math.round(x / spacing + 3.5);
  const r = Math.round(z / spacing + 3.5);

  if (c >= 0 && c < 8 && r >= 0 && r < 8) {
    return `${FILES[c]}${RANKS[r]}`;
  }
  return null;
}

export function createChessBoard3D(
  config: ChessBoard3DConfig = {}
): {
  group: THREE.Group;
  squareMeshes: Map<string, THREE.Mesh>;
  indicatorGroup: THREE.Group;
  updateSquareHighlights: (options: {
    selectedSquare: string | null;
    legalTargets: { to: string; isCapture: boolean }[];
    lastMove: { from: string; to: string } | null;
    checkSquare: string | null;
  }) => void;
} {
  const spacing = config.spacing || 0.95;
  const group = new THREE.Group();
  group.name = 'chess_board_group';

  // 1. Base Mahogany / Obsidian Pedestal
  const boardSize = spacing * 8 + 0.6;
  const pedestalGeo = new THREE.BoxGeometry(boardSize, 0.4, boardSize);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.25,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = -0.2;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  // Rim accent
  const rimGeo = new THREE.BoxGeometry(boardSize + 0.08, 0.08, boardSize + 0.08);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x00d5f5 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = -0.02;
  group.add(rim);

  // 2. 64 Board Squares
  const squareGeo = new THREE.BoxGeometry(spacing * 0.96, 0.1, spacing * 0.96);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.3,
    metalness: 0.1,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.2,
  });

  const selectedMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.5,
  });

  const lastMoveMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.3,
    metalness: 0.7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.4,
  });

  const checkMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0xef4444,
    emissiveIntensity: 0.6,
  });

  const squareMeshes = new Map<string, THREE.Mesh>();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const squareName = `${FILES[c]}${RANKS[r]}`;
      const isLight = (r + c) % 2 === 0;

      const sq = new THREE.Mesh(squareGeo, isLight ? lightMat : darkMat);
      sq.position.set((c - 3.5) * spacing, 0.05, (r - 3.5) * spacing);
      sq.receiveShadow = true;
      sq.name = `square_${squareName}`;
      sq.userData = { squareName, isLight };

      group.add(sq);
      squareMeshes.set(squareName, sq);
    }
  }

  // 3. Legal move indicators group
  const indicatorGroup = new THREE.Group();
  indicatorGroup.name = 'legal_move_indicators';
  group.add(indicatorGroup);

  const dotGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
  const ringGeo = new THREE.RingGeometry(0.25, 0.38, 16);
  const moveDotMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.8,
  });
  const captureRingMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });

  const updateSquareHighlights = (options: {
    selectedSquare: string | null;
    legalTargets: { to: string; isCapture: boolean }[];
    lastMove: { from: string; to: string } | null;
    checkSquare: string | null;
  }) => {
    // Reset all squares to default light/dark
    squareMeshes.forEach((mesh) => {
      const isLight = mesh.userData.isLight;
      mesh.material = isLight ? lightMat : darkMat;
    });

    // Highlight last move
    if (options.lastMove) {
      const sqFrom = squareMeshes.get(options.lastMove.from);
      const sqTo = squareMeshes.get(options.lastMove.to);
      if (sqFrom) sqFrom.material = lastMoveMat;
      if (sqTo) sqTo.material = lastMoveMat;
    }

    // Highlight selected square
    if (options.selectedSquare) {
      const sel = squareMeshes.get(options.selectedSquare);
      if (sel) sel.material = selectedMat;
    }

    // Highlight King in check
    if (options.checkSquare) {
      const chk = squareMeshes.get(options.checkSquare);
      if (chk) chk.material = checkMat;
    }

    // Clear and rebuild legal move indicators
    while (indicatorGroup.children.length > 0) {
      indicatorGroup.remove(indicatorGroup.children[0]);
    }

    options.legalTargets.forEach((target) => {
      const coords = squareToCoords(target.to, spacing);
      if (target.isCapture) {
        const ring = new THREE.Mesh(ringGeo, captureRingMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(coords.x, 0.12, coords.z);
        ring.name = `target_${target.to}`;
        indicatorGroup.add(ring);
      } else {
        const dot = new THREE.Mesh(dotGeo, moveDotMat);
        dot.position.set(coords.x, 0.12, coords.z);
        dot.name = `target_${target.to}`;
        indicatorGroup.add(dot);
      }
    });
  };

  return {
    group,
    squareMeshes,
    indicatorGroup,
    updateSquareHighlights,
  };
}
