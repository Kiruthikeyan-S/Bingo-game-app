import * as THREE from 'three';

export interface Dice3DController {
  mesh: THREE.Group;
  rollTo: (value: number, onComplete?: () => void) => void;
  update: (delta: number) => void;
}

// Target rotations for each dice value 1-6 to show on the top face
const DICE_ROTATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  6: [Math.PI, 0, 0],
  2: [Math.PI / 2, 0, 0],
  5: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
};

export function createDice3D(size: number = 0.75): Dice3DController {
  const group = new THREE.Group();
  group.name = 'ludo_dice_3d';

  // 1. Rounded-corner dice body
  const bodyGeo = new THREE.BoxGeometry(size, size, size);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.2,
  });
  const diceBody = new THREE.Mesh(bodyGeo, bodyMat);
  diceBody.castShadow = true;
  diceBody.receiveShadow = true;
  group.add(diceBody);

  // 2. Pip dots on faces
  const pipGeo = new THREE.SphereGeometry(size * 0.08, 10, 10);
  const pipMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
  });

  const d = size * 0.26;
  const h = size * 0.505;

  const addPip = (x: number, y: number, z: number) => {
    const p = new THREE.Mesh(pipGeo, pipMat);
    p.position.set(x, y, z);
    group.add(p);
  };

  // Face 1: Top (+y) -> 1 center pip
  addPip(0, h, 0);

  // Face 6: Bottom (-y) -> 6 pips
  [-d, d].forEach((x) => {
    [-d, 0, d].forEach((z) => {
      addPip(x, -h, z);
    });
  });

  // Face 2: Front (+z) -> 2 pips
  addPip(-d, d, h);
  addPip(d, -d, h);

  // Face 5: Back (-z) -> 5 pips
  addPip(-d, d, -h);
  addPip(d, d, -h);
  addPip(0, 0, -h);
  addPip(-d, -d, -h);
  addPip(d, -d, -h);

  // Face 3: Right (+x) -> 3 pips
  addPip(h, d, -d);
  addPip(h, 0, 0);
  addPip(h, -d, d);

  // Face 4: Left (-x) -> 4 pips
  addPip(-h, d, d);
  addPip(-h, d, -d);
  addPip(-h, -d, d);
  addPip(-h, -d, -d);

  // Animation state
  let isRolling = false;
  let rollProgress = 0;
  const rollDuration = 0.45; // 450ms dynamic roll animation
  let startRot = new THREE.Euler();
  let targetRot = new THREE.Euler();
  let extraSpins = new THREE.Vector3();
  let onCompleteCallback: (() => void) | undefined;

  const rollTo = (value: number, onComplete?: () => void) => {
    const val = Math.max(1, Math.min(6, value || 1));
    const targetAngles = DICE_ROTATIONS[val] || [0, 0, 0];

    startRot.copy(group.rotation);
    targetRot.set(targetAngles[0], targetAngles[1], targetAngles[2]);

    // Add full 360-degree tumble spins during flight
    extraSpins.set(
      (Math.floor(Math.random() * 2) + 2) * Math.PI * 2,
      (Math.floor(Math.random() * 2) + 2) * Math.PI * 2,
      (Math.floor(Math.random() * 2) + 2) * Math.PI * 2
    );

    rollProgress = 0;
    isRolling = true;
    onCompleteCallback = onComplete;
  };

  const update = (delta: number) => {
    if (!isRolling) return;

    rollProgress += delta / rollDuration;
    if (rollProgress >= 1) {
      isRolling = false;
      group.rotation.copy(targetRot);
      group.position.y = 0.4;
      if (onCompleteCallback) {
        onCompleteCallback();
        onCompleteCallback = undefined;
      }
    } else {
      const t = rollProgress;
      // Bounce curve
      const bounceHeight = Math.sin(Math.PI * t) * 1.2;
      group.position.y = 0.4 + bounceHeight;

      // Cubic ease out rotation towards exact target
      const ease = 1 - Math.pow(1 - t, 3);
      group.rotation.x = startRot.x + (targetRot.x + extraSpins.x - startRot.x) * ease;
      group.rotation.y = startRot.y + (targetRot.y + extraSpins.y - startRot.y) * ease;
      group.rotation.z = startRot.z + (targetRot.z + extraSpins.z - startRot.z) * ease;
    }
  };

  group.position.y = 0.4;

  return {
    mesh: group,
    rollTo,
    update,
  };
}
