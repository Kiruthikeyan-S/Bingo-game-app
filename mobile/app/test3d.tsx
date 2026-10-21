import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as THREE from 'three';
import { ArrowLeft, Sparkles, Box } from 'lucide-react-native';
import { GameCanvas3D, Scene3DContext } from '../components/3d/GameCanvas3D';
import { createSceneLighting } from '../components/3d/SceneLighting';
import { createGameEnvironment } from '../components/3d/GameEnvironment';
import { useGraphicsStore, THEMES } from '../store/graphicsStore';

export default function Test3DScreen() {
  const router = useRouter();
  const themeId = useGraphicsStore((s) => s.themeId);
  const theme = THEMES[themeId] || THEMES['midnight-neon'];
  const [tapCount, setTapCount] = useState(0);
  const [lastTapped, setLastTapped] = useState('None');
  const cubeRef = useRef<THREE.Mesh | null>(null);

  const handleSceneReady = (ctx: Scene3DContext) => {
    const { scene } = ctx;

    // 1. Lighting
    createSceneLighting(scene, { themeId });

    // 2. Pedestal Environment
    createGameEnvironment(scene, themeId);

    // 3. Test Interactive 3D Cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: theme.primaryHexNumber,
      roughness: 0.3,
      metalness: 0.8,
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 1.5, 0);
    cube.name = 'TestCube3D';
    cube.castShadow = true;
    scene.add(cube);
    cubeRef.current = cube;
  };

  const handleSceneUpdate = (ctx: Scene3DContext, delta: number) => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += delta * 0.8;
      cubeRef.current.rotation.y += delta * 1.2;
    }
  };

  const handleTapMesh = (intersection: THREE.Intersection) => {
    const obj = intersection.object as THREE.Mesh;
    setTapCount((c) => c + 1);
    setLastTapped(obj.name || 'Object');

    // Visual pop animation
    if (obj.material && (obj.material as THREE.MeshStandardMaterial).color) {
      (obj.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
      setTimeout(() => {
        if (obj.material) {
          (obj.material as THREE.MeshStandardMaterial).color.setHex(theme.primaryHexNumber);
        }
      }, 150);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>3D Engine Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <GameCanvas3D
          cameraPosition={[0, 4, 7]}
          cameraTarget={[0, 1.2, 0]}
          onSceneReady={handleSceneReady}
          onSceneUpdate={handleSceneUpdate}
          onTapMesh={handleTapMesh}
        />
      </View>

      {/* Diagnostics Overlay */}
      <View style={styles.overlay}>
        <Text style={[styles.statusText, { color: theme.primary }]}>
          GPU Render Status: Active
        </Text>
        <Text style={styles.detailText}>
          Taps Detected: {tapCount} (Mesh: {lastTapped})
        </Text>
        <Text style={styles.instructionText}>
          Drag to orbit camera | Pinch to zoom | Tap cube to interact
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#11183c',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  canvasContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
});
