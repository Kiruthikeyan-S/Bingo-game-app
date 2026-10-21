import * as THREE from 'three';
import { THEMES, ThemeId, QualityLevel } from '../../store/graphicsStore';

export interface SceneLightingOptions {
  themeId?: ThemeId;
  quality?: QualityLevel;
  shadows?: boolean;
}

export function createSceneLighting(
  scene: THREE.Scene,
  options: SceneLightingOptions = {}
) {
  const theme = THEMES[options.themeId || 'midnight-neon'] || THEMES['midnight-neon'];
  const quality = options.quality || 'high';
  const shadows = options.shadows ?? (quality !== 'low');

  // Ambient light for base visibility
  const ambientLight = new THREE.AmbientLight(
    theme.ambientLight,
    theme.ambientIntensity
  );
  scene.add(ambientLight);

  // Key Directional Light
  const keyLight = new THREE.DirectionalLight(
    theme.directionalLight,
    theme.directionalIntensity
  );
  keyLight.position.set(6, 12, 8);
  if (shadows && quality === 'high') {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    const d = 8;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.001;
  }
  scene.add(keyLight);

  // Fill Light from opposite angle
  const fillLight = new THREE.DirectionalLight(
    theme.secondaryHexNumber,
    0.45
  );
  fillLight.position.set(-8, 6, -6);
  scene.add(fillLight);

  // Ground accent glow / rim light
  if (quality !== 'low') {
    const rimLight = new THREE.PointLight(theme.accentGlow, 0.75, 20);
    rimLight.position.set(0, 0.2, 0);
    scene.add(rimLight);
  }

  return {
    ambientLight,
    keyLight,
    fillLight,
    updateTheme: (newThemeId: ThemeId) => {
      const next = THEMES[newThemeId] || THEMES['midnight-neon'];
      ambientLight.color.setHex(next.ambientLight);
      ambientLight.intensity = next.ambientIntensity;
      keyLight.color.setHex(next.directionalLight);
      keyLight.intensity = next.directionalIntensity;
      fillLight.color.setHex(next.secondaryHexNumber);
    },
  };
}
