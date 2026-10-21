import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react-native';
import { GameCanvas3D, Scene3DContext } from '../GameCanvas3D';
import { createSceneLighting } from '../SceneLighting';
import { createGameEnvironment } from '../GameEnvironment';
import { createBingoTile3D, BingoTileState } from './BingoTile3D';
import { createBingoWinEffect, BingoWinEffectController } from './BingoWinEffect';
import { calculateCompletedLines } from '../../../utils/bingo';
import { useGraphicsStore, THEMES } from '../../../store/graphicsStore';
import { BoardArray } from '../../../../shared/types';

interface BingoScene3DProps {
  board: BoardArray;
  calledNumbers?: number[];
  lastCalledNumber?: number | null;
  selectedSwapIndex?: number | null;
  disabled?: boolean;
  isWinner?: boolean;
  onCellPress: (number: number, index: number) => void;
  style?: any;
}

export function BingoScene3D({
  board,
  calledNumbers = [],
  lastCalledNumber = null,
  selectedSwapIndex = null,
  disabled = false,
  isWinner = false,
  onCellPress,
  style,
}: BingoScene3DProps) {
  const themeId = useGraphicsStore((s) => s.themeId);
  const quality = useGraphicsStore((s) => s.quality);
  const reduceMotion = useGraphicsStore((s) => s.reduceMotion);
  const theme = THEMES[themeId] || THEMES['midnight-neon'];

  const sceneContextRef = useRef<Scene3DContext | null>(null);
  const boardGroupRef = useRef<THREE.Group | null>(null);
  const winEffectRef = useRef<BingoWinEffectController | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  // Precalculate completed lines
  const { highlightedIndices } = useMemo(() => {
    return calculateCompletedLines(board, calledNumbers);
  }, [board, calledNumbers]);

  // Shared Geometries and Materials for 60fps performance
  const materials = useMemo(() => {
    return {
      tileBaseGeo: new THREE.BoxGeometry(0.88, 0.22, 0.88),
      uncalledTile: new THREE.MeshStandardMaterial({
        color: 0x111c44,
        roughness: 0.45,
        metalness: 0.3,
      }),
      calledTile: new THREE.MeshStandardMaterial({
        color: 0x00838f,
        roughness: 0.25,
        metalness: 0.65,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.25,
      }),
      lastCalledTile: new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.5,
      }),
      completedTile: new THREE.MeshStandardMaterial({
        color: 0x065f46,
        roughness: 0.2,
        metalness: 0.75,
        emissive: 0x10b981,
        emissiveIntensity: 0.45,
      }),
      swapTile: new THREE.MeshStandardMaterial({
        color: 0x4f46e5,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x818cf8,
        emissiveIntensity: 0.55,
      }),
      numDefault: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.3,
        metalness: 0.7,
      }),
      numCalled: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.6,
      }),
      numHighlight: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0xffd700,
        emissiveIntensity: 0.8,
      }),
    };
  }, [themeId]);

  // Build / update 3D board tiles
  const updateBoardTiles = () => {
    if (!sceneContextRef.current || !boardGroupRef.current) return;
    const boardGroup = boardGroupRef.current;

    // Clear previous tile meshes
    while (boardGroup.children.length > 0) {
      const child = boardGroup.children[0];
      boardGroup.remove(child);
    }

    const spacing = 1.02;
    const offset = (5 - 1) * spacing * 0.5;

    board.forEach((number, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;

      const isCalled = calledNumbers.includes(number);
      const isLastCalled = lastCalledNumber === number;
      const isInCompletedLine = highlightedIndices.has(index);
      const isSelectedForSwap = selectedSwapIndex === index;

      const state: BingoTileState = {
        number,
        index,
        isCalled,
        isLastCalled,
        isInCompletedLine,
        isSelectedForSwap,
      };

      const tile3D = createBingoTile3D(state, materials.tileBaseGeo, materials);
      tile3D.position.x = col * spacing - offset;
      tile3D.position.z = row * spacing - offset;

      boardGroup.add(tile3D);
    });
  };

  useEffect(() => {
    updateBoardTiles();
  }, [board, calledNumbers, lastCalledNumber, selectedSwapIndex, highlightedIndices]);

  // Handle Win Effect
  useEffect(() => {
    if (!sceneContextRef.current) return;
    const { scene } = sceneContextRef.current;

    if (isWinner && !winEffectRef.current) {
      winEffectRef.current = createBingoWinEffect(scene);
    } else if (!isWinner && winEffectRef.current) {
      winEffectRef.current.dispose();
      winEffectRef.current = null;
    }
  }, [isWinner]);

  const handleSceneReady = (ctx: Scene3DContext) => {
    sceneContextRef.current = ctx;
    const { scene } = ctx;

    // 1. Lighting
    createSceneLighting(scene, { themeId, quality });

    // 2. Pedestal Platform
    const boardBaseGeo = new THREE.BoxGeometry(5.7, 0.45, 5.7);
    const boardBaseMat = new THREE.MeshStandardMaterial({
      color: 0x070d24,
      roughness: 0.6,
      metalness: 0.2,
    });
    const boardBase = new THREE.Mesh(boardBaseGeo, boardBaseMat);
    boardBase.position.y = -0.22;
    boardBase.receiveShadow = true;
    scene.add(boardBase);

    // Glowing Board Border Frame
    const frameGeo = new THREE.BoxGeometry(5.82, 0.12, 5.82);
    const frameMat = new THREE.MeshBasicMaterial({ color: theme.primaryHexNumber });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = -0.04;
    scene.add(frame);

    // 3. Tile Group
    const boardGroup = new THREE.Group();
    boardGroup.name = 'bingo_board_group';
    scene.add(boardGroup);
    boardGroupRef.current = boardGroup;

    updateBoardTiles();
  };

  const handleSceneUpdate = (ctx: Scene3DContext, delta: number) => {
    if (winEffectRef.current && !reduceMotion) {
      winEffectRef.current.update(delta);
    }
  };

  const handleTapMesh = (intersection: THREE.Intersection) => {
    if (disabled) return;

    let obj: THREE.Object3D | null = intersection.object;
    while (obj && obj.parent && !obj.name.startsWith('bingo_tile_')) {
      obj = obj.parent;
    }

    if (obj && obj.userData && typeof obj.userData.number === 'number') {
      const { number, index } = obj.userData;
      onCellPress(number, index);
    }
  };

  const handleResetCamera = () => {
    setCameraKey((k) => k + 1);
  };

  return (
    <View style={[styles.container, style]}>
      <GameCanvas3D
        key={`bingo_canvas_${cameraKey}`}
        cameraPosition={[0, 6.5, 5.5]}
        cameraTarget={[0, 0, 0]}
        cameraFov={45}
        minDistance={4}
        maxDistance={12}
        enableOrbit={true}
        enableZoom={true}
        onSceneReady={handleSceneReady}
        onSceneUpdate={handleSceneUpdate}
        onTapMesh={handleTapMesh}
      />

      {/* Floating Camera Reset Button */}
      <TouchableOpacity
        style={styles.resetBtn}
        activeOpacity={0.8}
        onPress={handleResetCamera}
      >
        <RotateCcw size={16} color="#00e5ff" />
        <Text style={styles.resetBtnText}>Reset Camera</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 380,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#070b1e',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    position: 'relative',
  },
  resetBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resetBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
});
