import * as THREE from 'three';
import { THEMES, ThemeId, QualityLevel } from '../../store/graphicsStore';

export function createGameEnvironment(
  scene: THREE.Scene,
  themeId: ThemeId = 'midnight-neon',
  quality: QualityLevel = 'high'
) {
  const theme = THEMES[themeId] || THEMES['midnight-neon'];
  const group = new THREE.Group();

  // 1. Pedestal / Floating Platform
  const pedestalGeo = new THREE.CylinderGeometry(8.5, 9.2, 0.45, quality === 'low' ? 24 : 48);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: theme.boardDark,
    roughness: 0.6,
    metalness: 0.25,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = -0.25;
  pedestal.receiveShadow = quality !== 'low';
  group.add(pedestal);

  // 2. Pedestal Glowing Edge Ring
  const ringGeo = new THREE.TorusGeometry(8.52, 0.08, 8, quality === 'low' ? 32 : 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: theme.primaryHexNumber,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.02;
  group.add(ring);

  // 3. Grid Helper
  if (quality !== 'low') {
    const grid = new THREE.GridHelper(16, 16, theme.primaryHexNumber, theme.boardLight);
    grid.position.y = -0.01;
    (grid.material as THREE.Material).opacity = 0.22;
    (grid.material as THREE.Material).transparent = true;
    group.add(grid);
  }

  scene.add(group);
  return group;
}
