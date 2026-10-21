import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { useGraphicsStore, THEMES } from '../../store/graphicsStore';

export interface Scene3DContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  gl: ExpoWebGLRenderingContext;
  raycaster: THREE.Raycaster;
  width: number;
  height: number;
}

export interface GameCanvas3DProps {
  onSceneReady?: (ctx: Scene3DContext) => void;
  onSceneUpdate?: (ctx: Scene3DContext, delta: number) => void;
  onTapMesh?: (mesh: THREE.Intersection) => void;
  onSceneCleanup?: () => void;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  cameraFov?: number;
  minDistance?: number;
  maxDistance?: number;
  enableOrbit?: boolean;
  enableZoom?: boolean;
  paused?: boolean;
  style?: any;
  children?: React.ReactNode;
}

export function GameCanvas3D({
  onSceneReady,
  onSceneUpdate,
  onTapMesh,
  onSceneCleanup,
  cameraPosition = [0, 8, 10],
  cameraTarget = [0, 0, 0],
  cameraFov = 45,
  minDistance = 4,
  maxDistance = 24,
  enableOrbit = true,
  enableZoom = true,
  paused = false,
  style,
  children,
}: GameCanvas3DProps) {
  const themeId = useGraphicsStore((s) => s.themeId);
  const quality = useGraphicsStore((s) => s.quality);
  const shadowsEnabled = useGraphicsStore((s) => s.shadowsEnabled);
  const cameraRotationSetting = useGraphicsStore((s) => s.cameraRotation);
  const theme = THEMES[themeId] || THEMES['midnight-neon'];

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const dimensionsRef = useRef({ width: 300, height: 300 });
  const animFrameRef = useRef<number | null>(null);
  const sceneCtxRef = useRef<Scene3DContext | null>(null);
  const isDestroyedRef = useRef(false);

  // Orbit spherical coordinates state
  const orbitRef = useRef({
    radius: Math.sqrt(
      cameraPosition[0] * cameraPosition[0] +
      cameraPosition[1] * cameraPosition[1] +
      cameraPosition[2] * cameraPosition[2]
    ) || 12,
    theta: Math.atan2(cameraPosition[0], cameraPosition[2]), // horizontal angle
    phi: Math.acos(Math.max(-1, Math.min(1, cameraPosition[1] / 12))) || 0.8, // vertical angle (pitch)
    target: new THREE.Vector3(...cameraTarget),
    lastTouchTime: 0,
    touchStartPos: { x: 0, y: 0 },
    initialPinchDist: 0,
    initialRadius: 12,
  });

  const updateCameraPosition = useCallback(() => {
    if (!sceneCtxRef.current) return;
    const { camera } = sceneCtxRef.current;
    const { radius, theta, phi, target } = orbitRef.current;

    const clampedPhi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, phi));
    orbitRef.current.phi = clampedPhi;

    const x = target.x + radius * Math.sin(clampedPhi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(clampedPhi);
    const z = target.z + radius * Math.sin(clampedPhi) * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(target);
  }, []);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      dimensionsRef.current = { width, height };
      if (sceneCtxRef.current) {
        const { camera, renderer, gl } = sceneCtxRef.current;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      }
    }
  };

  const handlePointerTap = (x: number, y: number) => {
    if (!sceneCtxRef.current || !onTapMesh) return;
    const { scene, camera, raycaster } = sceneCtxRef.current;
    const { width, height } = dimensionsRef.current;
    if (width <= 0 || height <= 0) return;

    // Convert screen coordinates to Normalized Device Coordinates (-1 to +1)
    const ndcX = (x / width) * 2 - 1;
    const ndcY = -(y / height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      onTapMesh(intersects[0]);
    }
  };

  // PanResponder for Orbit and Pinch-Zoom
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        orbitRef.current.lastTouchTime = Date.now();
        if (touches.length === 1) {
          orbitRef.current.touchStartPos = {
            x: touches[0].locationX,
            y: touches[0].locationY,
          };
        } else if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          orbitRef.current.initialPinchDist = Math.sqrt(dx * dx + dy * dy);
          orbitRef.current.initialRadius = orbitRef.current.radius;
        }
      },
      onPanResponderMove: (
        evt: GestureResponderEvent,
        gesture: PanResponderGestureState
      ) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2 && enableZoom) {
          // Pinch to Zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (orbitRef.current.initialPinchDist > 0) {
            const factor = orbitRef.current.initialPinchDist / dist;
            orbitRef.current.radius = Math.max(
              minDistance,
              Math.min(maxDistance, orbitRef.current.initialRadius * factor)
            );
            updateCameraPosition();
          }
        } else if (touches.length === 1 && enableOrbit && cameraRotationSetting) {
          // Single finger orbit
          const sensitivity = 0.005;
          orbitRef.current.theta -= gesture.vx * 0.05 + (gesture.dx * 0.002);
          orbitRef.current.phi += gesture.vy * 0.03 + (gesture.dy * 0.0015);
          updateCameraPosition();
        }
      },
      onPanResponderRelease: (
        evt: GestureResponderEvent,
        gesture: PanResponderGestureState
      ) => {
        const timeDiff = Date.now() - orbitRef.current.lastTouchTime;
        const totalDist = Math.sqrt(gesture.dx * gesture.dx + gesture.dy * gesture.dy);
        if (timeDiff < 250 && totalDist < 8) {
          // Valid Tap
          handlePointerTap(
            orbitRef.current.touchStartPos.x,
            orbitRef.current.touchStartPos.y
          );
        }
      },
    })
  ).current;

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    try {
      isDestroyedRef.current = false;
      const { width, height } = dimensionsRef.current;
      const pixelWidth = gl.drawingBufferWidth || width;
      const pixelHeight = gl.drawingBufferHeight || height;

      // 1. Create Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(theme.backgroundHexNumber);

      // 2. Create Camera
      const camera = new THREE.PerspectiveCamera(
        cameraFov,
        pixelWidth / pixelHeight,
        0.1,
        100
      );

      // 3. Create WebGLRenderer with Expo GL Context
      const renderer = new THREE.WebGLRenderer({
        canvas: {
          width: pixelWidth,
          height: pixelHeight,
          style: {},
          addEventListener: () => {},
          removeEventListener: () => {},
          clientWidth: width,
          clientHeight: height,
        } as any,
        context: gl,
        antialias: quality !== 'low',
        powerPreference: quality === 'high' ? 'high-performance' : 'default',
      });

      renderer.setSize(pixelWidth, pixelHeight, false);
      if (shadowsEnabled && quality === 'high') {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      const raycaster = new THREE.Raycaster();

      const ctx: Scene3DContext = {
        scene,
        camera,
        renderer,
        gl,
        raycaster,
        width,
        height,
      };

      sceneCtxRef.current = ctx;
      updateCameraPosition();

      // Notify parent scene setup
      if (onSceneReady) {
        onSceneReady(ctx);
      }

      setIsLoading(false);

      // 4. Animation Loop
      let lastTime = Date.now();
      const renderLoop = () => {
        if (isDestroyedRef.current) return;

        const now = Date.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (!paused && sceneCtxRef.current) {
          if (onSceneUpdate) {
            onSceneUpdate(sceneCtxRef.current, delta);
          }
          renderer.render(scene, camera);
          gl.endFrameEXP();
        }

        animFrameRef.current = requestAnimationFrame(renderLoop);
      };

      renderLoop();
    } catch (err: any) {
      console.warn('GameCanvas3D initialization error:', err);
      setHasError(true);
      setErrorMessage(err?.message || 'WebGL initialization failed');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (onSceneCleanup) {
        onSceneCleanup();
      }
      if (sceneCtxRef.current) {
        const { scene, renderer } = sceneCtxRef.current;
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) {
            (obj as THREE.Mesh).geometry.dispose();
          }
          if ((obj as THREE.Mesh).material) {
            const mat = (obj as THREE.Mesh).material;
            if (Array.isArray(mat)) {
              mat.forEach((m) => m.dispose());
            } else {
              mat.dispose();
            }
          }
        });
        renderer.dispose();
        sceneCtxRef.current = null;
      }
    };
  }, []);

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <GLView style={styles.glView} onContextCreate={onContextCreate} />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.primary }]}>
            Loading 3D Engine...
          </Text>
        </View>
      )}

      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>3D Rendering Error</Text>
          <Text style={styles.errorSubtext}>{errorMessage}</Text>
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  glView: {
    ...StyleSheet.absoluteFill,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#070b1e',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 11, 30, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
});
