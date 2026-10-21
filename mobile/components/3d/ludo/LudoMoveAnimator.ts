import * as THREE from 'three';

export interface ActiveTokenAnimation {
  mesh: THREE.Group;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  duration: number;
  arcHeight: number;
  onComplete?: () => void;
}

export class LudoMoveAnimator {
  private activeAnims: ActiveTokenAnimation[] = [];

  public startHopAnimation(
    mesh: THREE.Group,
    targetX: number,
    targetZ: number,
    duration: number = 0.16,
    arcHeight: number = 0.35,
    onComplete?: () => void
  ) {
    const startPos = mesh.position.clone();
    const targetPos = new THREE.Vector3(targetX, 0.06, targetZ);

    this.activeAnims.push({
      mesh,
      startPos,
      targetPos,
      progress: 0,
      duration: Math.max(0.06, duration),
      arcHeight,
      onComplete,
    });
  }

  public update(delta: number) {
    for (let i = this.activeAnims.length - 1; i >= 0; i--) {
      const anim = this.activeAnims[i];
      anim.progress += delta / anim.duration;

      if (anim.progress >= 1) {
        anim.mesh.position.copy(anim.targetPos);
        if (anim.onComplete) anim.onComplete();
        this.activeAnims.splice(i, 1);
      } else {
        const t = anim.progress;
        const ease = t * (2 - t);
        anim.mesh.position.x = THREE.MathUtils.lerp(anim.startPos.x, anim.targetPos.x, ease);
        anim.mesh.position.z = THREE.MathUtils.lerp(anim.startPos.z, anim.targetPos.z, ease);
        anim.mesh.position.y = 0.06 + Math.sin(Math.PI * t) * anim.arcHeight;
      }
    }
  }

  public isAnimating(): boolean {
    return this.activeAnims.length > 0;
  }
}
