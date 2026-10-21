import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import { RotateCcw, ArrowUpDown } from 'lucide-react-native';
import { GameCanvas3D, Scene3DContext } from '../GameCanvas3D';
import { createSceneLighting } from '../SceneLighting';
import {
  createChessBoard3D,
  squareToCoords,
  coordsToSquare,
  FILES,
  RANKS,
} from './ChessBoard3D';
import { createChessPieceMesh, createChessPieceMaterials } from './ChessPiece3D';
import { ChessMoveAnimator } from './ChessMoveAnimator';
import { useGraphicsStore, THEMES } from '../../../store/graphicsStore';
import { ChessColor, ChessPieceSymbol } from '../../../../shared/types';

interface ChessScene3DProps {
  boardMatrix: ({ type: ChessPieceSymbol; color: ChessColor } | null)[][];
  selectedSquare: string | null;
  legalTargets: { to: string; isCapture: boolean }[];
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
  myColor?: ChessColor;
  onSquarePress: (square: string, pieceColor?: ChessColor) => void;
  disabled?: boolean;
  style?: any;
}

export function ChessScene3D({
  boardMatrix,
  selectedSquare,
  legalTargets,
  lastMove = null,
  checkSquare = null,
  myColor = 'w',
  onSquarePress,
  disabled = false,
  style,
}: ChessScene3DProps) {
  const themeId = useGraphicsStore((s) => s.themeId);
  const quality = useGraphicsStore((s) => s.quality);
  const theme = THEMES[themeId] || THEMES['midnight-neon'];

  const sceneCtxRef = useRef<Scene3DContext | null>(null);
  const boardControllerRef = useRef<ReturnType<typeof createChessBoard3D> | null>(null);
  const piecesGroupRef = useRef<THREE.Group | null>(null);
  const pieceMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const moveAnimatorRef = useRef<ChessMoveAnimator>(new ChessMoveAnimator());

  const [flippedCamera, setFlippedCamera] = useState(myColor === 'b');
  const [cameraKey, setCameraKey] = useState(0);

  const materials = useMemo(() => createChessPieceMaterials(), []);
  const spacing = 0.95;

  // Sync pieces on boardMatrix updates
  const syncPieces = () => {
    if (!piecesGroupRef.current) return;
    const piecesGroup = piecesGroupRef.current;
    const oldMap = pieceMeshMapRef.current;
    const newMap = new Map<string, THREE.Group>();

    // Clear previous piece meshes
    while (piecesGroup.children.length > 0) {
      piecesGroup.remove(piecesGroup.children[0]);
    }

    boardMatrix.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        if (!cell) return;
        const squareName = `${FILES[cIdx]}${RANKS[rIdx]}`;
        const coords = squareToCoords(squareName, spacing);

        const pieceMesh = createChessPieceMesh(cell.type, cell.color, materials);
        pieceMesh.position.set(coords.x, 0.1, coords.z);
        pieceMesh.name = `piece_${squareName}_${cell.color}_${cell.type}`;
        pieceMesh.userData = { squareName, type: cell.type, color: cell.color };

        piecesGroup.add(pieceMesh);
        newMap.set(squareName, pieceMesh);
      });
    });

    pieceMeshMapRef.current = newMap;
  };

  useEffect(() => {
    syncPieces();
  }, [boardMatrix]);

  // Update board square highlights
  useEffect(() => {
    if (boardControllerRef.current) {
      boardControllerRef.current.updateSquareHighlights({
        selectedSquare,
        legalTargets,
        lastMove: lastMove || null,
        checkSquare: checkSquare || null,
      });
    }
  }, [selectedSquare, legalTargets, lastMove, checkSquare]);

  const handleSceneReady = (ctx: Scene3DContext) => {
    sceneCtxRef.current = ctx;
    const { scene } = ctx;

    // 1. Lighting
    createSceneLighting(scene, { themeId, quality });

    // 2. 8x8 Board & Highlights
    const boardController = createChessBoard3D({ themeId, spacing });
    scene.add(boardController.group);
    boardControllerRef.current = boardController;

    // 3. Pieces Group
    const piecesGroup = new THREE.Group();
    piecesGroup.name = 'chess_pieces_container';
    scene.add(piecesGroup);
    piecesGroupRef.current = piecesGroup;

    syncPieces();
  };

  const handleSceneUpdate = (ctx: Scene3DContext, delta: number) => {
    moveAnimatorRef.current.update(delta);
  };

  const handleTapMesh = (intersection: THREE.Intersection) => {
    if (disabled) return;

    let obj: THREE.Object3D | null = intersection.object;
    while (obj && obj.parent && !obj.name.startsWith('square_') && !obj.name.startsWith('piece_') && !obj.name.startsWith('target_')) {
      obj = obj.parent;
    }

    if (obj) {
      if (obj.name.startsWith('square_') && obj.userData.squareName) {
        onSquarePress(obj.userData.squareName);
      } else if (obj.name.startsWith('piece_') && obj.userData.squareName) {
        onSquarePress(obj.userData.squareName, obj.userData.color);
      } else if (obj.name.startsWith('target_')) {
        const targetSq = obj.name.replace('target_', '');
        onSquarePress(targetSq);
      }
    }
  };

  const camZ = flippedCamera ? -8.2 : 8.2;

  return (
    <View style={[styles.container, style]}>
      <GameCanvas3D
        key={`chess_canvas_${cameraKey}_${flippedCamera ? 'b' : 'w'}`}
        cameraPosition={[0, 7.8, camZ]}
        cameraTarget={[0, 0.2, 0]}
        cameraFov={46}
        minDistance={5}
        maxDistance={15}
        enableOrbit={true}
        enableZoom={true}
        onSceneReady={handleSceneReady}
        onSceneUpdate={handleSceneUpdate}
        onTapMesh={handleTapMesh}
      />

      {/* Floating Controls: Camera Flip & Reset */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.controlBtn}
          activeOpacity={0.8}
          onPress={() => setFlippedCamera(!flippedCamera)}
        >
          <ArrowUpDown size={15} color="#00e5ff" />
          <Text style={styles.controlText}>
            Side: {flippedCamera ? 'Black' : 'White'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          activeOpacity={0.8}
          onPress={() => setCameraKey((k) => k + 1)}
        >
          <RotateCcw size={15} color="#00e5ff" />
          <Text style={styles.controlText}>Reset View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 390,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#070b1e',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    position: 'relative',
  },
  topControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  controlText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
});
