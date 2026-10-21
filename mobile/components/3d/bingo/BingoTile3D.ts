import * as THREE from 'three';
import { create3DNumberMesh } from './NumberGeometry3D';

export interface BingoTileState {
  number: number;
  index: number;
  isCalled: boolean;
  isLastCalled: boolean;
  isInCompletedLine: boolean;
  isSelectedForSwap: boolean;
}

export function createBingoTile3D(
  state: BingoTileState,
  tileBaseGeometry: THREE.BoxGeometry,
  materials: {
    uncalledTile: THREE.Material;
    calledTile: THREE.Material;
    lastCalledTile: THREE.Material;
    completedTile: THREE.Material;
    swapTile: THREE.Material;
    numDefault: THREE.Material;
    numCalled: THREE.Material;
    numHighlight: THREE.Material;
  }
): THREE.Group {
  const group = new THREE.Group();
  group.name = `bingo_tile_${state.index}_${state.number}`;
  group.userData = { ...state };

  // 1. Select appropriate material based on state
  let tileMat = materials.uncalledTile;
  let numMat = materials.numDefault;
  let targetY = 0.1;

  if (state.isSelectedForSwap) {
    tileMat = materials.swapTile;
    numMat = materials.numHighlight;
    targetY = 0.35;
  } else if (state.isInCompletedLine) {
    tileMat = materials.completedTile;
    numMat = materials.numHighlight;
    targetY = 0.16;
  } else if (state.isLastCalled) {
    tileMat = materials.lastCalledTile;
    numMat = materials.numHighlight;
    targetY = 0.22;
  } else if (state.isCalled) {
    tileMat = materials.calledTile;
    numMat = materials.numCalled;
    targetY = 0.02; // depressed
  }

  // 2. Base Tile Mesh
  const tileMesh = new THREE.Mesh(tileBaseGeometry, tileMat);
  tileMesh.castShadow = true;
  tileMesh.receiveShadow = true;
  tileMesh.name = `mesh_tile_${state.index}`;
  group.add(tileMesh);

  // 3. 3D Number Mesh on top face
  const numMesh = create3DNumberMesh(state.number, 0.44, numMat);
  numMesh.position.y = 0.11;
  numMesh.name = `mesh_num_${state.index}`;
  group.add(numMesh);

  group.position.y = targetY;
  return group;
}
