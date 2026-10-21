import * as THREE from 'three';
import { ChessPieceSymbol, ChessColor } from '../../../../shared/types';

export interface ChessPieceMaterials {
  whitePiece: THREE.Material;
  blackPiece: THREE.Material;
}

export function createChessPieceMaterials(): ChessPieceMaterials {
  const whitePiece = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.35,
  });

  const blackPiece = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.65,
  });

  return { whitePiece, blackPiece };
}

export function createChessPieceMesh(
  type: ChessPieceSymbol,
  color: ChessColor,
  materials: ChessPieceMaterials
): THREE.Group {
  const group = new THREE.Group();
  const mat = color === 'w' ? materials.whitePiece : materials.blackPiece;
  group.name = `chess_piece_${color}_${type}`;
  group.userData = { type, color };

  // Common circular pedestal base for all pieces
  const baseGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.14, 16);
  const baseMesh = new THREE.Mesh(baseGeo, mat);
  baseMesh.position.y = 0.07;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  if (type === 'p') {
    // PAWN
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.45, 14);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.18, 14, 14);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 0.65;
    head.castShadow = true;
    group.add(head);
  } else if (type === 'r') {
    // ROOK (Castle)
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.29, 0.55, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Castle battlements
    const topGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.2, 16);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.y = 0.72;
    top.castShadow = true;
    group.add(top);
  } else if (type === 'n') {
    // KNIGHT (Horse)
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.5, 14);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.36;
    body.castShadow = true;
    group.add(body);

    // Horse head block
    const headGeo = new THREE.BoxGeometry(0.25, 0.35, 0.38);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 0.72, 0.06);
    head.rotation.x = 0.2;
    head.castShadow = true;
    group.add(head);

    // Mane / ears
    const earGeo = new THREE.ConeGeometry(0.08, 0.16, 6);
    const ear1 = new THREE.Mesh(earGeo, mat);
    ear1.position.set(-0.08, 0.94, -0.04);
    const ear2 = new THREE.Mesh(earGeo, mat);
    ear2.position.set(0.08, 0.94, -0.04);
    group.add(ear1);
    group.add(ear2);
  } else if (type === 'b') {
    // BISHOP
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.65, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.44;
    body.castShadow = true;
    group.add(body);

    const mitreGeo = new THREE.ConeGeometry(0.2, 0.35, 14);
    const mitre = new THREE.Mesh(mitreGeo, mat);
    mitre.position.y = 0.88;
    mitre.castShadow = true;
    group.add(mitre);

    const crossDot = new THREE.SphereGeometry(0.06, 8, 8);
    const dot = new THREE.Mesh(crossDot, mat);
    dot.position.y = 1.08;
    group.add(dot);
  } else if (type === 'q') {
    // QUEEN
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.3, 0.75, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);

    // Coronet crown
    const crownGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.22, 16);
    const crown = new THREE.Mesh(crownGeo, mat);
    crown.position.y = 0.92;
    crown.castShadow = true;
    group.add(crown);

    const jewel = new THREE.SphereGeometry(0.09, 12, 12);
    const jMesh = new THREE.Mesh(jewel, mat);
    jMesh.position.y = 1.08;
    group.add(jMesh);
  } else if (type === 'k') {
    // KING
    const bodyGeo = new THREE.CylinderGeometry(0.23, 0.32, 0.82, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.52;
    body.castShadow = true;
    group.add(body);

    const crownGeo = new THREE.CylinderGeometry(0.32, 0.23, 0.25, 16);
    const crown = new THREE.Mesh(crownGeo, mat);
    crown.position.y = 0.98;
    crown.castShadow = true;
    group.add(crown);

    // King's 3D Cross Finial
    const vCross = new THREE.BoxGeometry(0.08, 0.24, 0.08);
    const hCross = new THREE.BoxGeometry(0.2, 0.08, 0.08);
    const c1 = new THREE.Mesh(vCross, mat);
    c1.position.y = 1.2;
    const c2 = new THREE.Mesh(hCross, mat);
    c2.position.y = 1.22;
    group.add(c1);
    group.add(c2);
  }

  return group;
}
