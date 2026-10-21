import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react-native';
import { GameCanvas3D, Scene3DContext } from '../GameCanvas3D';
import { createSceneLighting } from '../SceneLighting';
import { createLudoBoard3D, ludoRCToCoords, LUDO_SPACING } from './LudoBoard3D';
import { createLudoToken3D } from './LudoToken3D';
import { createDice3D, Dice3DController } from './Dice3D';
import { LudoMoveAnimator } from './LudoMoveAnimator';
import { useGraphicsStore, THEMES } from '../../../store/graphicsStore';
import { LudoColor, LudoState, LudoToken } from '../../../../shared/types';
import {
  HOME_STEP,
  LAST_MAIN_TRACK_STEP,
} from '../../../engines/ludo/rules';

interface LudoScene3DProps {
  activeState: LudoState;
  myColor: LudoColor;
  movableTokenIds: number[];
  selectedTokenId: number | null;
  canRoll: boolean;
  onTokenPress: (color: LudoColor, tokenId: number) => void;
  onRollDice: () => void;
  isWinner?: boolean;
  style?: any;
}

// Coordinate mapping helpers
const GLOBAL_TRACK_COORDS: Array<[number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const HOME_STRETCH_COORDS: Record<LudoColor, Array<[number, number]>> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

const HOME_FINISH_COORD: Record<LudoColor, [number, number]> = {
  red: [7, 6],
  green: [6, 7],
  yellow: [7, 8],
  blue: [8, 7],
};

const YARD_SLOT_COORDS: Record<LudoColor, Array<[number, number]>> = {
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
  blue: [[10, 1], [10, 4], [13, 1], [13, 4]],
};

function getTokenRC(token: LudoToken): [number, number] {
  if (token.step === -1) {
    return YARD_SLOT_COORDS[token.color][token.id];
  }
  if (token.step === HOME_STEP) {
    return HOME_FINISH_COORD[token.color];
  }
  if (token.step > LAST_MAIN_TRACK_STEP) {
    const idx = token.step - 51;
    return HOME_STRETCH_COORDS[token.color][idx] || HOME_FINISH_COORD[token.color];
  }
  return GLOBAL_TRACK_COORDS[token.step] || [7, 7];
}

export function LudoScene3D({
  activeState,
  myColor,
  movableTokenIds,
  selectedTokenId,
  canRoll,
  onTokenPress,
  onRollDice,
  isWinner = false,
  style,
}: LudoScene3DProps) {
  const themeId = useGraphicsStore((s) => s.themeId);
  const quality = useGraphicsStore((s) => s.quality);

  const sceneCtxRef = useRef<Scene3DContext | null>(null);
  const tokensGroupRef = useRef<THREE.Group | null>(null);
  const diceControllerRef = useRef<Dice3DController | null>(null);
  const animatorRef = useRef<LudoMoveAnimator>(new LudoMoveAnimator());
  const prevDiceRef = useRef<number | null>(null);

  const [cameraKey, setCameraKey] = useState(0);

  // Sync 3D tokens
  const syncTokens = () => {
    if (!tokensGroupRef.current) return;
    const tokensGroup = tokensGroupRef.current;

    while (tokensGroup.children.length > 0) {
      tokensGroup.remove(tokensGroup.children[0]);
    }

    activeState.activeColors.forEach((color) => {
      const tokenList = activeState.tokens[color] || [];
      tokenList.forEach((token) => {
        const rc = getTokenRC(token);
        const coords = ludoRCToCoords(rc[0], rc[1], LUDO_SPACING);

        const isMovable =
          color === activeState.currentTurnColor &&
          movableTokenIds.includes(token.id);
        const isSelected =
          color === activeState.currentTurnColor &&
          selectedTokenId === token.id;

        const token3D = createLudoToken3D(token, isSelected, isMovable);
        token3D.position.set(coords.x, isSelected ? 0.25 : 0.08, coords.z);

        tokensGroup.add(token3D);
      });
    });
  };

  useEffect(() => {
    syncTokens();
  }, [activeState.tokens, activeState.currentTurnColor, movableTokenIds, selectedTokenId]);

  // Roll dice animation when activeState.diceValue updates
  useEffect(() => {
    if (activeState.diceValue !== null && activeState.diceValue !== prevDiceRef.current) {
      prevDiceRef.current = activeState.diceValue;
      if (diceControllerRef.current) {
        diceControllerRef.current.rollTo(activeState.diceValue);
      }
    }
  }, [activeState.diceValue]);

  const handleSceneReady = (ctx: Scene3DContext) => {
    sceneCtxRef.current = ctx;
    const { scene } = ctx;

    // 1. Lighting
    createSceneLighting(scene, { themeId, quality });

    // 2. 15x15 3D Ludo Board
    const boardMesh = createLudoBoard3D(LUDO_SPACING);
    scene.add(boardMesh);

    // 3. Tokens Group
    const tokensGroup = new THREE.Group();
    tokensGroup.name = 'ludo_tokens_container';
    scene.add(tokensGroup);
    tokensGroupRef.current = tokensGroup;

    // 4. Center 3D Rolling Dice
    const dice = createDice3D(0.68);
    dice.mesh.position.set(0, 0.45, 0);
    scene.add(dice.mesh);
    diceControllerRef.current = dice;

    syncTokens();
  };

  const handleSceneUpdate = (ctx: Scene3DContext, delta: number) => {
    if (diceControllerRef.current) {
      diceControllerRef.current.update(delta);
    }
    animatorRef.current.update(delta);
  };

  const handleTapMesh = (intersection: THREE.Intersection) => {
    let obj: THREE.Object3D | null = intersection.object;
    while (obj && obj.parent && !obj.name.startsWith('ludo_token_') && obj.name !== 'ludo_dice_3d') {
      obj = obj.parent;
    }

    if (obj) {
      if (obj.name === 'ludo_dice_3d' && canRoll) {
        onRollDice();
      } else if (obj.name.startsWith('ludo_token_') && obj.userData) {
        const { color, id } = obj.userData;
        onTokenPress(color, id);
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      <GameCanvas3D
        key={`ludo_canvas_${cameraKey}`}
        cameraPosition={[0, 8.4, 7.8]}
        cameraTarget={[0, 0, 0]}
        cameraFov={48}
        minDistance={5}
        maxDistance={16}
        enableOrbit={true}
        enableZoom={true}
        onSceneReady={handleSceneReady}
        onSceneUpdate={handleSceneUpdate}
        onTapMesh={handleTapMesh}
      />

      {/* Floating Controls */}
      <View style={styles.topControls}>
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
