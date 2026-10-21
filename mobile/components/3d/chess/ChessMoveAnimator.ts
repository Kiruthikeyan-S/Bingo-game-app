import * as THREE from 'three';

export interface ActiveMoveAnimation {
  mesh: THREE.Group;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  duration: number;
  arcHeight: number;
  onComplete?: () => void;
}

export class ChessMoveAnimator {
  private activeAnimations: ActiveMoveAnimation[] = [];

  public startAnimation(
    mesh: THREE.Group,
    targetX: number,
    targetZ: number,
    duration: number = 0.22,
    arcHeight: number = 0.5,
    onComplete?: () => void
  ) {
    const startPos = mesh.position.clone();
    const targetPos = new THREE.Vector3(targetX, startPos.y, targetZ);

    this.activeAnimations.push({
      mesh,
      startPos,
      targetPos,
      progress: 0,
      duration: Math.max(0.08, duration),
      arcHeight,
      onComplete,
    });
  }

  public update(delta: number) {
    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeAnimations[i];
      anim.progress += delta / anim.duration;

      if (anim.progress >= 1) {
        anim.mesh.position.copy(anim.targetPos);
        if (anim.onComplete) {
          anim.onComplete();
        }
        this.activeAnimations.splice(i, 1);
      } else {
        const t = anim.progress;
        // Ease out quad
        const ease = t * (2 - t);
        anim.mesh.position.x = THREE.MathUtils.lerp(anim.startPos.x, anim.targetPos.x, ease);
        anim.mesh.position.z = THREE.MathUtils.lerp(anim.startPos.z, anim.targetPos.z, ease);
        anim.mesh.position.y = anim.startPos.y + Math.sin(Math.PI * t) * anim.arcHeight;
      }
    }
  }

  public isAnimating(): boolean {
    return this.activeAnimations.length > 0;
  }

  public clear() {
    this.activeAnimations = [];
  }
}
