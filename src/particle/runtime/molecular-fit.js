// Fit each complete molecular silhouette independently, including its viewing sway.
export const MOLECULE_CAMERA = Object.freeze({ distance: 8, fov: 35, yaw: .46, pitch: .18 });

export function rotateForView(point, yaw, pitch) {
  const [x, y, z] = point;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  const rx = x * cy + z * sy, rz = z * cy - x * sy;
  return [rx, y * cx - rz * sx, y * sx + rz * cx];
}

export function fitMolecule(bounds, width, height, { projection = 'perspective', coverage = .92, zoom = 1 } = {}, positions) {
  if (width <= 0 || height <= 0) return 1;
  const { distance, fov, yaw, pitch } = MOLECULE_CAMERA;
  const vertical = Math.tan(fov * Math.PI / 360), horizontal = vertical * width / height;
  const limitX = horizontal * coverage, limitY = vertical * coverage;
  let points = positions;
  if (!points) {
    points = new Float32Array(24);
    for (let corner = 0; corner < 8; corner++) for (let axis = 0; axis < 3; axis++) {
      points[corner * 3 + axis] = corner & (1 << axis) ? bounds.max[axis] : bounds.min[axis];
    }
  }
  let maximumX = 0, maximumY = 0;
  // Actual mesh vertices avoid fitting the empty corners of an open molecule's
  // box. This runs only when layout/projection changes, never during animation.
  // The angular grid extends beyond the renderer's full ambient + pointer sway.
  for (let yi = 0; yi <= 12; yi++) {
    const cy = Math.cos(yaw * (yi / 6 - 1)), sy = Math.sin(yaw * (yi / 6 - 1));
    for (let xi = 0; xi <= 8; xi++) {
      const cx = Math.cos(pitch * (xi / 4 - 1)), sx = Math.sin(pitch * (xi / 4 - 1));
      for (let i = 0; i < points.length; i += 3) {
        const x = points[i], y = points[i + 1], z = points[i + 2];
        const rx = x * cy + z * sy, rz = z * cy - x * sy;
        const ry = y * cx - rz * sx;
        const perspectiveZ = projection === 'perspective' ? y * sx + rz * cx : 0;
        maximumX = Math.max(maximumX, Math.abs(rx) + limitX * perspectiveZ);
        maximumY = Math.max(maximumY, Math.abs(ry) + limitY * perspectiveZ);
      }
    }
  }
  const scale = Math.min(distance * limitX / maximumX, distance * limitY / maximumY);
  // Reserved space absorbs the small floating motion and angle-sampling error.
  return Number.isFinite(scale) && scale > 0 ? scale * .985 * Math.min(1, Math.max(.25, zoom)) : 1;
}
