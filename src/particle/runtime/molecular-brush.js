/* Spring integration adapted from Particle Sculpture by LIghtJUNction.
 * SPDX-License-Identifier: AGPL-3.0-or-later; see web/public/particle/NOTICE. */
// Screen-space particle inertia. Offsets are CSS pixels; geometry stays immutable.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smoothstep = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};

export function createParticleBrush(count) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('A positive particle count is required');
  const offsets = new Float32Array(count * 2);
  const velocities = new Float32Array(count * 2);
  let previousDrawCount = count;
  const reset = () => { offsets.fill(0); velocities.fill(0); };

  return {
    offsets,
    reset,
    update({ positions, destination, scatter, mix, scaleFrom, scaleTo, matrix,
      width, height, pointer, delta, still, brush, drawCount = count }) {
      if (still || !(brush > 0) || !(width > 0) || !(height > 0)
        || !Number.isFinite(width + height)) {
        reset();
        return 0;
      }
      const n = clamp(Math.floor(drawCount), 0, count);
      if (n < previousDrawCount) {
        offsets.fill(0, n * 2);
        velocities.fill(0, n * 2);
      }
      previousDrawCount = n;
      const dt = Number.isFinite(delta) ? clamp(delta, 0, .08) : 0;
      const omega = 18, recovery = Math.exp(-omega * dt);
      const amount = clamp(mix, 0, 1);
      const spread = Math.sin(Math.PI * amount) ** 2;
      const shrink = 1 - spread * .13, scatterScale = spread * .48;
      const from = (1 - amount) * scaleFrom, to = amount * scaleTo;
      const vx = Number.isFinite(pointer.vx) ? clamp(pointer.vx, -1600, 1600) : 0;
      const vy = Number.isFinite(pointer.vy) ? clamp(pointer.vy, -1600, 1600) : 0;
      const speed = Math.min(1600, Math.hypot(vx, vy));
      const active = pointer.active && speed > 0
        && Number.isFinite(pointer.x + pointer.y + pointer.previousX + pointer.previousY);
      const segmentX = pointer.x - pointer.previousX, segmentY = pointer.y - pointer.previousY;
      const segmentLength = segmentX * segmentX + segmentY * segmentY;
      const radius = height * .285, limit = Math.min(width, height) * .3;
      let maxOffset = 0;
      for (let i = 0; i < n; i++) {
        const xyz = i * 3, xy = i * 2;
        let fx = 0, fy = 0;
        if (active) {
          const x = (positions[xyz] * from + destination[xyz] * to) * shrink + scatter[xyz] * scatterScale;
          const y = (positions[xyz + 1] * from + destination[xyz + 1] * to) * shrink + scatter[xyz + 1] * scatterScale;
          const z = (positions[xyz + 2] * from + destination[xyz + 2] * to) * shrink + scatter[xyz + 2] * scatterScale;
          const clipW = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
          if (clipW > .00001) {
            const ndcX = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / clipW;
            const ndcY = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / clipW;
            const edgeRoom = 1 - smoothstep(.72, .96, Math.max(Math.abs(ndcX), Math.abs(ndcY)));
            if (edgeRoom > 0) {
              const px = (ndcX + 1) * width * .5, py = (1 - ndcY) * height * .5;
              const along = segmentLength > .00001
                ? clamp(((px - pointer.previousX) * segmentX + (py - pointer.previousY) * segmentY) / segmentLength, 0, 1)
                : 0;
              const distance = Math.hypot(px - pointer.previousX - segmentX * along, py - pointer.previousY - segmentY * along);
              const influence = Math.max(0, 1 - distance / radius) ** 2 * brush * edgeRoom;
              // Symmetric per-particle scatter gives a swept cloud without a
              // persistent radial exclusion zone around a stationary pointer.
              fx = influence * (vx * .16 + scatter[xyz] * speed * .1);
              fy = influence * (vy * .13 + scatter[xyz + 1] * speed * .1);
              const targetLength = Math.hypot(fx, fy);
              if (targetLength > limit) { fx *= limit / targetLength; fy *= limit / targetLength; }
            }
          }
        }
        const gapX = offsets[xy] - fx, gapY = offsets[xy + 1] - fy;
        const springX = velocities[xy] + omega * gapX, springY = velocities[xy + 1] + omega * gapY;
        let x = fx + (gapX + springX * dt) * recovery;
        let y = fy + (gapY + springY * dt) * recovery;
        let dx = (velocities[xy] - omega * springX * dt) * recovery;
        let dy = (velocities[xy + 1] - omega * springY * dt) * recovery;
        const length = Math.hypot(x, y);
        if (length > limit) {
          const ratio = limit / length;
          x *= ratio; y *= ratio; dx *= ratio; dy *= ratio;
        }
        if (!active && Math.abs(x) + Math.abs(y) + Math.abs(dx) + Math.abs(dy) < .00001) {
          x = y = dx = dy = 0;
        }
        offsets[xy] = x; offsets[xy + 1] = y;
        velocities[xy] = dx; velocities[xy + 1] = dy;
        maxOffset = Math.max(maxOffset, Math.hypot(x, y));
      }
      return maxOffset;
    },
  };
}
