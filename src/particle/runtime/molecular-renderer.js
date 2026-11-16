// Persistent molecular point clouds, driven by the host's single RAF.
import * as THREE from 'three';
import { createMolecules } from '../molecules.js';
import { fitMolecule, MOLECULE_CAMERA } from './molecular-fit.js';
import { createParticleBrush } from './molecular-brush.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const defaults = { projection: 'perspective', zoom: 1, brush: 1.1, materials: {} };
function settings(value) {
  const next = { ...defaults, ...value };
  if (!['perspective', 'orthographic'].includes(next.projection)) throw new RangeError('Unknown projection');
  if (!Number.isFinite(next.brush) || next.brush < 0 || next.brush > 2) throw new RangeError('brush must be between 0 and 2');
  if (!Number.isFinite(next.zoom) || next.zoom < .25 || next.zoom > 2) throw new RangeError('zoom must be between .25 and 2');
  return next;
}

const pointVertex = `
  attribute vec3 destination;
  attribute vec3 destinationColor;
  attribute vec3 scatter;
  attribute vec2 brushOffset;
  uniform float uMix, uScaleFrom, uScaleTo, uPointSize, uPixelRatio, uDark;
  uniform vec2 uResolution;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float spread = pow(sin(3.14159265 * uMix), 2.0);
    vec3 p = mix(position * uScaleFrom, destination * uScaleTo, uMix);
    p = p * (1.0 - spread * 0.13) + scatter * spread * 0.48;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // The brush integrates CSS-pixel springs on the CPU, independently of projection.
    gl_Position.xy += vec2(brushOffset.x, -brushOffset.y) * 2.0 / uResolution * gl_Position.w;
    float depth = 1.0 - smoothstep(6.0, 10.0, -mvPosition.z);
    gl_PointSize = uPointSize * uPixelRatio * (0.85 + 0.3 * (scatter.z * 0.5 + 0.5)) * clamp(8.0 / -mvPosition.z, 0.8, 1.6);
    vec3 baseColor = mix(color, destinationColor, uMix);
    vColor = mix(baseColor * (0.65 + depth * 0.35), mix(baseColor, vec3(0.9), 0.35), uDark);
    vOpacity = 0.9 + depth * 0.1;
  }
`;
const pointFragment = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float alpha = (1.0 - smoothstep(0.4, 0.5, distanceToCenter)) * vOpacity;
    if (alpha < 0.025) discard;
    gl_FragColor = vec4(vColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createMolecularRenderer(canvas, timeline, onReady = () => {}, configuration = {}) {
  let options = settings(configuration);
  let context;
  try { context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' }); }
  catch { return null; }
  if (!context || typeof context.getParameter !== 'function' || typeof context.createShader !== 'function') return null;

  let renderer, models, pointsGeometry, pointMaterial;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    models = createMolecules({ samples: 10000 });
  } catch {
    renderer?.dispose();
    return null;
  }

  try {
  const scene = new THREE.Scene();
  const body = new THREE.Group();
  scene.add(body);
  const count = Math.min(models[0].positions.length, models[1].positions.length) / 3;
  // The geometry builder deterministically shuffles samples so the smaller
  // mobile prefix covers all ribbons, sheets and connecting loops.
  pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(models[0].positions, 3));
  pointsGeometry.setAttribute('destination', new THREE.BufferAttribute(models[1].positions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(models[0].colors, 3));
  pointsGeometry.setAttribute('destinationColor', new THREE.BufferAttribute(models[1].colors, 3));
  const scatter = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phase = i * 2.3999632297, z = 2 * ((i * .61803398875) % 1) - 1;
    const radius = Math.sqrt(1 - z * z);
    scatter[i * 3] = Math.cos(phase) * radius;
    scatter[i * 3 + 1] = Math.sin(phase) * radius;
    scatter[i * 3 + 2] = z;
  }
  pointsGeometry.setAttribute('scatter', new THREE.BufferAttribute(scatter, 3));
  const brush = createParticleBrush(count);
  const brushAttribute = new THREE.BufferAttribute(brush.offsets, 2).setUsage(THREE.DynamicDrawUsage);
  pointsGeometry.setAttribute('brushOffset', brushAttribute);
  const clipMatrix = new THREE.Matrix4();
  const brushFrame = { positions: models[0].positions, destination: models[1].positions, scatter };
  const uniforms = {
    uMix: { value: 0 }, uScaleFrom: { value: 1 }, uScaleTo: { value: 1 },
    uPointSize: { value: 1.9 }, uPixelRatio: { value: 1 }, uDark: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  };
  pointMaterial = new THREE.ShaderMaterial({
    uniforms, vertexShader: pointVertex, fragmentShader: pointFragment,
    vertexColors: true, transparent: true, depthWrite: true, depthTest: true,
  });
  const particles = new THREE.Points(pointsGeometry, pointMaterial);
  particles.frustumCulled = false;
  body.add(particles);

  const perspective = new THREE.PerspectiveCamera(MOLECULE_CAMERA.fov, 1, .1, 50);
  const orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50);
  perspective.position.z = orthographic.position.z = MOLECULE_CAMERA.distance;
  let width = 0, height = 0, ratio = 1, ready = false, disposed = false, contextLost = false;
  let themeDirty = true, fittingDirty = true, dark = false, tiltX = 0, tiltY = 0;
  const scales = [1, 1];
  const stats = { frames: 0, points: count, maxOffset: 0, time: 0, scene: '', phase: 'particles', renderer: 'webgl' };
  function refreshTheme() {
    if (!themeDirty) return;
    themeDirty = false;
    const ground = getComputedStyle(canvas).getPropertyValue('--poster-ground').trim();
    const background = new THREE.Color(/^#[\da-f]{6}$/i.test(ground) ? ground : '#fafbfe');
    dark = background.r + background.g + background.b < .8;
    renderer.setClearColor(background, 1);
    uniforms.uDark.value = dark ? 1 : 0;
  }
  const onLost = event => { event.preventDefault(); contextLost = true; canvas.dataset.ready = 'false'; };
  const onRestored = () => {
    contextLost = false; themeDirty = fittingDirty = true;
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  canvas.dataset.renderMode = 'webgl';

  return {
    configure(value = {}) { options = settings({ ...options, ...value }); fittingDirty = themeDirty = true; },
    invalidateTheme() { themeDirty = true; },
    draw(time, pointer, delta, still = false, selected = null, scenePosition = null) {
      if (disposed || contextLost) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const nextRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      if (width !== w || height !== h || ratio !== nextRatio) {
        width = w; height = h; ratio = nextRatio;
        renderer.setPixelRatio(ratio); renderer.setSize(w, h, false);
        perspective.aspect = w / h; perspective.updateProjectionMatrix();
        const halfHeight = MOLECULE_CAMERA.distance * Math.tan(MOLECULE_CAMERA.fov * Math.PI / 360);
        orthographic.left = -halfHeight * w / h; orthographic.right = halfHeight * w / h;
        orthographic.top = halfHeight; orthographic.bottom = -halfHeight; orthographic.updateProjectionMatrix();
        uniforms.uResolution.value.set(w, h); uniforms.uPixelRatio.value = ratio;
        brush.reset();
        pointsGeometry.setDrawRange(0, w < 480 ? Math.min(count, 6500) : count);
        fittingDirty = true;
      }
      if (fittingDirty) {
        for (let i = 0; i < models.length; i++) {
          scales[i] = fitMolecule(models[i].bounds, w, h, options, models[i].geometry.attributes.position.array);
        }
        uniforms.uScaleFrom.value = scales[0]; uniforms.uScaleTo.value = scales[1];
        fittingDirty = false;
      }
      refreshTheme();
      uniforms.uPointSize.value = (w < 480 ? 1.6 : 1.9) + (dark ? .2 : 0);
      const frame = timeline.at(time, selected, scenePosition), mix = clamp(frame.mix, 0, 1);
      // The same point cloud remains visible at both endpoints and throughout
      // morphs, including paused and reduced-motion frames. No surface meshes.
      uniforms.uMix.value = mix;
      const interaction = !still && pointer.active && options.brush > 0;
      const px = (pointer.x / w * 2 - 1), py = 1 - pointer.y / h * 2;
      const blend = still ? 1 : 1 - Math.exp(-Math.min(.08, Math.max(0, delta)) * 7);
      tiltX += ((interaction ? clamp(-py * .07, -.07, .07) : 0) - tiltX) * blend;
      tiltY += ((interaction ? clamp(px * .1, -.1, .1) : 0) - tiltY) * blend;
      body.rotation.set(Math.sin(time * .19) * .07 - .02 + tiltX, .18 + Math.sin(time * .14) * .18 + tiltY, 0);
      body.position.y = Math.sin(time * .3) * .015;
      const camera = options.projection === 'orthographic' ? orthographic : perspective;
      body.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      clipMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(body.matrixWorld);
      const maxOffset = brush.update(Object.assign(brushFrame, {
        mix, scaleFrom: scales[0], scaleTo: scales[1], matrix: clipMatrix.elements,
        width: w, height: h, pointer, delta, still, brush: options.brush,
        drawCount: pointsGeometry.drawRange.count,
      }));
      brushAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      canvas.dataset.sculpture = mix < .5 ? models[0].id : models[1].id;
      canvas.dataset.phase = 'particles';
      canvas.dataset.ready = 'true';
      Object.assign(stats, { frames: stats.frames + 1, time, scene: canvas.dataset.sculpture,
        phase: canvas.dataset.phase, mix, maxOffset, points: pointsGeometry.drawRange.count,
        drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      });
      if (!ready) { ready = true; onReady(); }
    },
    inspect() { return { ...stats, ready, contextLost, scales: [...scales] }; },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      for (const model of models) model.geometry.dispose();
      pointsGeometry.dispose(); pointMaterial.dispose();
      // React can mount a fresh owner on the same canvas during a hot update.
      // Dispose GPU resources while leaving that reusable context healthy.
      renderer.dispose();
      scene.clear();
      canvas.width = canvas.height = 0;
      for (const attribute of ['ready', 'sculpture', 'renderMode', 'phase']) delete canvas.dataset[attribute];
    },
  };
  } catch {
    for (const model of models ?? []) model.geometry.dispose();
    pointsGeometry?.dispose(); pointMaterial?.dispose();
    renderer?.dispose();
    return null;
  }
}
