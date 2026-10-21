import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import { GameCanvas3D, Scene3DContext } from './GameCanvas3D';
import { createSceneLighting } from './SceneLighting';
import { useGraphicsStore, THEMES } from '../../store/graphicsStore';
import { GameType } from '../../../shared/types';

interface HubScene3DProps {
  selectedGame: GameType;
  onSelectGame: (game: GameType) => void;
  onOpenPlayModal: (game: GameType) => void;
}

export function HubScene3D({
  selectedGame,
  onSelectGame,
  onOpenPlayModal,
}: HubScene3DProps) {
  const themeId = useGraphicsStore((s) => s.themeId);
  const quality = useGraphicsStore((s) => s.quality);
  const reduceMotion = useGraphicsStore((s) => s.reduceMotion);
  const theme = THEMES[themeId] || THEMES['midnight-neon'];

  const bingoGroupRef = useRef<THREE.Group | null>(null);
  const chessGroupRef = useRef<THREE.Group | null>(null);
  const ludoGroupRef = useRef<THREE.Group | null>(null);
  const diceMeshRef = useRef<THREE.Mesh | null>(null);
  const chessPieceRef = useRef<THREE.Mesh | null>(null);

  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Update camera focus based on selected game
  useEffect(() => {
    if (selectedGame === 'bingo') {
      cameraTargetRef.current.set(-4.2, 0.4, 0);
    } else if (selectedGame === 'chess') {
      cameraTargetRef.current.set(0, 0.5, 0);
    } else if (selectedGame === 'ludo') {
      cameraTargetRef.current.set(4.2, 0.4, 0);
    }
  }, [selectedGame]);

  const handleSceneReady = (ctx: Scene3DContext) => {
    const { scene } = ctx;

    // 1. Lighting
    createSceneLighting(scene, { themeId, quality });

    // 2. Base Ground Grid
    if (quality !== 'low') {
      const grid = new THREE.GridHelper(24, 24, theme.primaryHexNumber, theme.boardDark);
      grid.position.y = -0.6;
      (grid.material as THREE.Material).opacity = 0.25;
      (grid.material as THREE.Material).transparent = true;
      scene.add(grid);
    }

    // -------------------------------------------------------------
    // PLATFORM 1: BINGO (Left: x = -4.2)
    // -------------------------------------------------------------
    const bingoGroup = new THREE.Group();
    bingoGroup.position.set(-4.2, 0, 0);
    bingoGroup.name = 'bingo_platform';

    // Base pedestal
    const p1Geo = new THREE.CylinderGeometry(2.3, 2.5, 0.35, quality === 'low' ? 18 : 32);
    const p1Mat = new THREE.MeshStandardMaterial({
      color: 0x2e1065,
      roughness: 0.5,
      metalness: 0.3,
    });
    const p1 = new THREE.Mesh(p1Geo, p1Mat);
    p1.position.y = -0.2;
    p1.name = 'bingo_base';
    bingoGroup.add(p1);

    // Bingo 5x5 miniature grid
    const tileGeo = new THREE.BoxGeometry(0.32, 0.12, 0.32);
    const tileMatDark = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.4 });
    const tileMatMarked = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.2, metalness: 0.7 });

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const isMarked = (r === c) || (r + c === 4);
        const tile = new THREE.Mesh(tileGeo, isMarked ? tileMatMarked : tileMatDark);
        tile.position.set((c - 2) * 0.38, 0.06, (r - 2) * 0.38);
        tile.name = 'bingo_tile';
        bingoGroup.add(tile);
      }
    }

    scene.add(bingoGroup);
    bingoGroupRef.current = bingoGroup;

    // -------------------------------------------------------------
    // PLATFORM 2: CHESS (Center: x = 0)
    // -------------------------------------------------------------
    const chessGroup = new THREE.Group();
    chessGroup.position.set(0, 0, 0);
    chessGroup.name = 'chess_platform';

    // Base pedestal
    const p2Geo = new THREE.CylinderGeometry(2.5, 2.7, 0.4, quality === 'low' ? 18 : 32);
    const p2Mat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.4,
    });
    const p2 = new THREE.Mesh(p2Geo, p2Mat);
    p2.position.y = -0.2;
    p2.name = 'chess_base';
    chessGroup.add(p2);

    // 8x8 Mini Chessboard
    const squareGeo = new THREE.BoxGeometry(0.25, 0.08, 0.25);
    const darkSqMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const lightSqMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const sq = new THREE.Mesh(squareGeo, isLight ? lightSqMat : darkSqMat);
        sq.position.set((c - 3.5) * 0.27, 0.04, (r - 3.5) * 0.27);
        sq.name = 'chess_square';
        chessGroup.add(sq);
      }
    }

    // Centered King / Knight Piece
    const kingBaseGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.65, 16);
    const kingHeadGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const pieceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.15,
    });
    const kingPiece = new THREE.Group();
    const kBody = new THREE.Mesh(kingBaseGeo, pieceMat);
    kBody.position.y = 0.35;
    const kHead = new THREE.Mesh(kingHeadGeo, pieceMat);
    kHead.position.y = 0.75;
    kingPiece.add(kBody);
    kingPiece.add(kHead);
    kingPiece.position.set(0, 0.1, 0);
    kingPiece.name = 'chess_piece';
    chessGroup.add(kingPiece);
    chessPieceRef.current = kingPiece as any;

    scene.add(chessGroup);
    chessGroupRef.current = chessGroup;

    // -------------------------------------------------------------
    // PLATFORM 3: LUDO (Right: x = 4.2)
    // -------------------------------------------------------------
    const ludoGroup = new THREE.Group();
    ludoGroup.position.set(4.2, 0, 0);
    ludoGroup.name = 'ludo_platform';

    // Base pedestal
    const p3Geo = new THREE.CylinderGeometry(2.3, 2.5, 0.35, quality === 'low' ? 18 : 32);
    const p3Mat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.5,
      metalness: 0.3,
    });
    const p3 = new THREE.Mesh(p3Geo, p3Mat);
    p3.position.y = -0.2;
    p3.name = 'ludo_base';
    ludoGroup.add(p3);

    // 4 Colored Quadrant Bases
    const quadGeo = new THREE.BoxGeometry(0.8, 0.08, 0.8);
    const colors = [0xef4444, 0x10b981, 0xf59e0b, 0x3b82f6]; // Red, Green, Yellow, Blue
    const offsets = [
      [-0.55, -0.55],
      [0.55, -0.55],
      [0.55, 0.55],
      [-0.55, 0.55],
    ];

    colors.forEach((col, idx) => {
      const qMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3 });
      const qMesh = new THREE.Mesh(quadGeo, qMat);
      qMesh.position.set(offsets[idx][0], 0.05, offsets[idx][1]);
      qMesh.name = 'ludo_quad';
      ludoGroup.add(qMesh);

      // Mini Token
      const tokGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.3, 12);
      const tok = new THREE.Mesh(tokGeo, qMat);
      tok.position.set(offsets[idx][0], 0.22, offsets[idx][1]);
      tok.name = 'ludo_token';
      ludoGroup.add(tok);
    });

    // 3D Rotating Dice at Center of Ludo platform
    const diceGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const diceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.5,
    });
    const dice = new THREE.Mesh(diceGeo, diceMat);
    dice.position.set(0, 0.45, 0);
    dice.name = 'ludo_dice';
    ludoGroup.add(dice);
    diceMeshRef.current = dice;

    scene.add(ludoGroup);
    ludoGroupRef.current = ludoGroup;
  };

  const handleSceneUpdate = (ctx: Scene3DContext, delta: number) => {
    const { camera } = ctx;

    // Smoothly interpolate camera focus toward selected platform
    camera.lookAt(cameraTargetRef.current);

    if (reduceMotion) return;

    // Subtle idle rotations
    if (bingoGroupRef.current) {
      bingoGroupRef.current.rotation.y += delta * 0.3;
    }
    if (chessPieceRef.current) {
      chessPieceRef.current.rotation.y += delta * 0.7;
    }
    if (diceMeshRef.current) {
      diceMeshRef.current.rotation.x += delta * 1.0;
      diceMeshRef.current.rotation.y += delta * 1.4;
    }
  };

  const handleTapMesh = (intersection: THREE.Intersection) => {
    let obj: THREE.Object3D | null = intersection.object;
    while (obj && obj.parent && !obj.name.includes('_platform')) {
      obj = obj.parent;
    }

    if (obj) {
      if (obj.name === 'bingo_platform') {
        onSelectGame('bingo');
        onOpenPlayModal('bingo');
      } else if (obj.name === 'chess_platform') {
        onSelectGame('chess');
        onOpenPlayModal('chess');
      } else if (obj.name === 'ludo_platform') {
        onSelectGame('ludo');
        onOpenPlayModal('ludo');
      }
    }
  };

  return (
    <View style={styles.container}>
      <GameCanvas3D
        cameraPosition={[0, 4.8, 8.2]}
        cameraTarget={[0, 0.2, 0]}
        cameraFov={48}
        minDistance={5}
        maxDistance={14}
        enableOrbit={true}
        enableZoom={true}
        onSceneReady={handleSceneReady}
        onSceneUpdate={handleSceneUpdate}
        onTapMesh={handleTapMesh}
      />

      {/* 3D Game Selector Bar */}
      <View style={styles.selectorBar}>
        <TouchableOpacity
          style={[
            styles.selectBtn,
            selectedGame === 'bingo' && {
              borderColor: '#00e5ff',
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
            },
          ]}
          onPress={() => {
            onSelectGame('bingo');
            onOpenPlayModal('bingo');
          }}
        >
          <Text
            style={[
              styles.btnLabel,
              selectedGame === 'bingo' && { color: '#00e5ff', fontWeight: '800' },
            ]}
          >
            Bingo 3D
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectBtn,
            selectedGame === 'chess' && {
              borderColor: '#00e5ff',
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
            },
          ]}
          onPress={() => {
            onSelectGame('chess');
            onOpenPlayModal('chess');
          }}
        >
          <Text
            style={[
              styles.btnLabel,
              selectedGame === 'chess' && { color: '#00e5ff', fontWeight: '800' },
            ]}
          >
            Chess 3D
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectBtn,
            selectedGame === 'ludo' && {
              borderColor: '#00e5ff',
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
            },
          ]}
          onPress={() => {
            onSelectGame('ludo');
            onOpenPlayModal('ludo');
          }}
        >
          <Text
            style={[
              styles.btnLabel,
              selectedGame === 'ludo' && { color: '#00e5ff', fontWeight: '800' },
            ]}
          >
            Ludo 3D
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 310,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0a102b',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    position: 'relative',
    marginVertical: 10,
  },
  selectorBar: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
});
