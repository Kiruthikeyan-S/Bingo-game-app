import * as THREE from 'three';

export interface BingoWinEffectController {
  group: THREE.Group;
  update: (delta: number) => void;
  dispose: () => void;
}

export function createBingoWinEffect(scene: THREE.Scene): BingoWinEffectController {
  const group = new THREE.Group();
  group.name = 'bingo_win_effects';

  const particleCount = 45;
  const particles: { mesh: THREE.Mesh; rotSpeed: THREE.Vector3; floatSpeed: number; baseY: number }[] = [];

  const confColors = [0x00e5ff, 0xffd700, 0x10b981, 0xec4899, 0x8b5cf6];
  const confGeo = new THREE.BoxGeometry(0.18, 0.18, 0.04);

  for (let i = 0; i < particleCount; i++) {
    const col = confColors[i % confColors.length];
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.2,
      metalness: 0.8,
    });
    const mesh = new THREE.Mesh(confGeo, mat);

    // Random orbit around the 5x5 board
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.2 + Math.random() * 2.8;
    const y = 0.5 + Math.random() * 3.5;

    mesh.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    group.add(mesh);

    particles.push({
      mesh,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      floatSpeed: 0.8 + Math.random() * 1.2,
      baseY: y,
    });
  }

  scene.add(group);

  let time = 0;
  return {
    group,
    update: (delta: number) => {
      time += delta;
      particles.forEach((p) => {
        p.mesh.rotation.x += p.rotSpeed.x * delta;
        p.mesh.rotation.y += p.rotSpeed.y * delta;
        p.mesh.rotation.z += p.rotSpeed.z * delta;
        p.mesh.position.y = p.baseY + Math.sin(time * p.floatSpeed) * 0.4;
      });
      group.rotation.y += delta * 0.4;
    },
    dispose: () => {
      scene.remove(group);
      confGeo.dispose();
      particles.forEach((p) => {
        (p.mesh.material as THREE.Material).dispose();
      });
    },
  };
}
