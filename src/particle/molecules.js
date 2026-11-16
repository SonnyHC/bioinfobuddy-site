import { BufferGeometry, Float32BufferAttribute, Color } from 'three';

// Sampling surfaces for particle-only molecular illustrations. Ribbons, sheet
// arrows and connecting loops define the point clouds and their transitions.
const TAU = Math.PI * 2;
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, k) => a.map(v => v * k);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = v => mul(v, 1 / (Math.hypot(...v) || 1));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t*t*(3-2*t); };

// Three.js vertex attributes use linear RGB; the renderer converts to sRGB once.
const stops = [
  [0, new Color('#6642d4').toArray()],
  [.25, new Color('#304fd2').toArray()],
  [.5, new Color('#009bbf').toArray()],
  [.74, new Color('#226fc8').toArray()],
  [1, new Color('#6742d4').toArray()],
];
const coral = new Color('#e85d59').toArray();
function chainColor(value, accent = true) {
  const t = clamp(value);
  let color = stops.at(-1)[1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [a, ca] = stops[i-1], [b, cb] = stops[i];
      color = mix(ca, cb, (t-a)/(b-a)); break;
    }
  }
  return accent ? mix(color, coral, .9 * Math.exp(-(((t-.66)/.032)**2))) : color;
}

class SurfaceBuilder {
  positions = [];
  colors = [];
  indices = [];
  parts = [];

  vertex(position, color) {
    this.positions.push(...position); this.colors.push(...color);
    return this.positions.length / 3 - 1;
  }

  // A closed swept cross-section gives both broad ribbon faces and rounded edges.
  // Parallel transport keeps round connecting tubes free of abrupt frame flips.
  sweep(path, {
    steps = 100, sides = 12, width = .1, thickness = width,
    widthDirection, color = t => chainColor(t), ribbon = false, kind = 'loop',
  } = {}) {
    const base = this.positions.length / 3, firstIndex = this.indices.length;
    let previousWidth;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, center = path(t);
      const tangent = unit(sub(path(Math.min(1, t+.0001)), path(Math.max(0, t-.0001))));
      let lateral = widthDirection ? widthDirection(t, tangent) : previousWidth;
      if (!lateral) lateral = Math.abs(tangent[1]) < .85 ? [0,1,0] : [1,0,0];
      lateral = sub(lateral, mul(tangent, dot(lateral, tangent)));
      if (Math.hypot(...lateral) < .00001) lateral = cross(tangent, [0,0,1]);
      lateral = unit(lateral); previousWidth = lateral;
      const normal = unit(cross(tangent, lateral));
      const w = typeof width === 'function' ? width(t) : width;
      const h = typeof thickness === 'function' ? thickness(t) : thickness;
      const rgb = color(t);
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * TAU, cosine = Math.cos(angle), sine = Math.sin(angle);
        // A superellipse is flat across the broad face and soft around its rim.
        const x = ribbon ? Math.sign(cosine)*Math.abs(cosine)**.35 : cosine;
        const y = ribbon ? Math.sign(sine)*Math.abs(sine)**.35 : sine;
        this.vertex(add(center, add(mul(lateral, x*w/2), mul(normal, y*h/2))), rgb);
      }
    }
    for (let row = 0; row < steps; row++) for (let side = 0; side < sides; side++) {
      const a = base + row*sides+side, d = base+row*sides+(side+1)%sides;
      const b = a+sides, c = d+sides;
      this.indices.push(a, d, b, d, c, b);
    }
    const start = this.vertex(path(0), color(0)), end = this.vertex(path(1), color(1));
    for (let side = 0; side < sides; side++) {
      this.indices.push(start, base+(side+1)%sides, base+side);
      this.indices.push(end, base+steps*sides+side, base+steps*sides+(side+1)%sides);
    }
    this.parts.push({kind, triangles:(this.indices.length-firstIndex)/3});
    return {start:path(0), end:path(1)};
  }

  finish(id, samples) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = box.min.clone().add(box.max).multiplyScalar(.5);
    const size = box.max.clone().sub(box.min);
    const scale = 3.6 / Math.max(size.x, size.y, size.z);
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    geometry.userData.parts = this.parts;
    geometry.userData.id = id;
    const {positions, colors} = sampleSurface(geometry, samples);
    return {
      id, geometry, positions, colors,
      bounds: {
        min:geometry.boundingBox.min.toArray(), max:geometry.boundingBox.max.toArray(),
        radius:geometry.boundingSphere.radius,
      },
    };
  }
}

function sampleSurface(geometry, count) {
  const vertices = geometry.attributes.position.array, paint = geometry.attributes.color.array;
  const indices = geometry.index.array, areas = new Float64Array(indices.length/3);
  let total = 0;
  for (let triangle = 0; triangle < areas.length; triangle++) {
    const a = indices[triangle*3]*3, b = indices[triangle*3+1]*3, c = indices[triangle*3+2]*3;
    const ab = [vertices[b]-vertices[a],vertices[b+1]-vertices[a+1],vertices[b+2]-vertices[a+2]];
    const ac = [vertices[c]-vertices[a],vertices[c+1]-vertices[a+1],vertices[c+2]-vertices[a+2]];
    total += Math.hypot(...cross(ab,ac))*.5;
    areas[triangle] = total;
  }
  const positions = new Float32Array(count*3), colors = new Float32Array(count*3);
  for (let i = 0; i < count; i++) {
    const area = (i+.5)/count*total;
    let low = 0, high = areas.length-1;
    while (low < high) { const middle = (low+high)>>>1; if (areas[middle] < area) low = middle+1; else high = middle; }
    const root = Math.sqrt((i*.7548776662466927+.23)%1), v = (i*.5698402909980532+.61)%1;
    const weights = [1-root,root*(1-v),root*v];
    for (let channel = 0; channel < 3; channel++) {
      let coordinate = 0, color = 0;
      for (let vertex = 0; vertex < 3; vertex++) {
        const index = indices[low*3+vertex]*3+channel;
        coordinate += vertices[index]*weights[vertex]; color += paint[index]*weights[vertex];
      }
      positions[i*3+channel] = coordinate; colors[i*3+channel] = color;
    }
  }
  // The renderer reduces its point budget by drawing a prefix on small screens.
  // Shuffle matched position/color tuples so that prefix still spans every part.
  let seed = 0x9e3779b9;
  for (let i = count-1; i > 0; i--) {
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    const other = Math.floor(seed/4294967296*(i+1));
    for (let channel = 0; channel < 3; channel++) {
      const a = i*3+channel, b = other*3+channel;
      [positions[a],positions[b]] = [positions[b],positions[a]];
      [colors[a],colors[b]] = [colors[b],colors[a]];
    }
  }
  return {positions, colors};
}

function dna(samples) {
  const surface = new SurfaceBuilder();
  const axis = unit([.42,1,0]), across = unit([1,-.42,0]), depth = [0,0,1];
  const path = (t, phase) => {
    const angle = t*TAU*2.05+phase;
    return add(mul(axis,(t-.5)*3.35),add(mul(across,.83*Math.cos(angle)),mul(depth,.83*Math.sin(angle))));
  };
  for (let strand = 0; strand < 2; strand++) surface.sweep(t => path(t,strand*Math.PI), {
    steps:300, sides:16, width:.235, kind:'backbone',
    color:t => chainColor(strand ? .31+.65*t : .02+.65*t, false),
  });
  for (let rung = 1; rung <= 23; rung++) {
    const t = rung/24, start = path(t,0), end = path(t,Math.PI);
    surface.sweep(u => mix(start,end,u), {
      steps:8, sides:10, width:.065, kind:'base-pair',
      color:u => chainColor(.05+t*.88+Math.sin(u*Math.PI)*.04),
    });
  }
  return surface.finish('double-helix',samples);
}

function protein(samples) {
  const surface = new SurfaceBuilder();
  const helix = (start, end, turns, phase, colorStart, colorEnd, radius = .22) => {
    const direction = sub(end,start), axis = unit(direction);
    const reference = Math.abs(axis[1]) < .85 ? [0,1,0] : [1,0,0];
    const radial = unit(cross(axis,reference)), side = cross(axis,radial);
    const path = t => add(mix(start,end,t),add(mul(radial,radius*Math.cos(t*TAU*turns+phase)),mul(side,radius*Math.sin(t*TAU*turns+phase))));
    return surface.sweep(path, {
      steps:Math.ceil(turns*58), sides:12, ribbon:true, kind:'alpha-helix',
      width:t => .31*(.76+.24*Math.sin(Math.PI*t)**.6), thickness:.032,
      widthDirection:() => axis,
      color:t => chainColor(colorStart+(colorEnd-colorStart)*t),
    });
  };
  const helices = [
    helix([-1.32,.12,-.03],[-.89,1.23,.12],2.65,.3,.01,.17,.235),
    helix([.55,1.22,-.24],[1.30,.66,-.16],2.2,1.1,.20,.29,.215),
    helix([1.33,.14,.12],[1.09,-.91,.32],2.65,.6,.32,.45,.24),
    helix([.62,-1.18,-.30],[-.62,-1.26,-.08],2.8,1.5,.48,.59,.22),
    helix([-1.12,-.92,.27],[-1.39,-.12,-.18],2.1,.7,.62,.70,.205),
    helix([-.58,.78,-.74],[.57,-.25,-.80],2.55,1.9,.73,.83,.205),
  ];
  const arrows = [];
  for (let strand = 0; strand < 4; strand++) {
    const direction = strand%2 ? -1 : 1, x = (strand-1.5)*.325;
    const path = t => [x+.035*Math.sin(t*Math.PI),direction*(t-.5)*1.63,.40+.07*Math.sin(t*TAU*3)+.11*Math.sin(t*Math.PI)];
    arrows.push(surface.sweep(path, {
      steps:96, sides:12, ribbon:true, kind:'beta-sheet', thickness:.035,
      width:t => t < .73 ? .225 : t < .76 ? .225+(.46-.225)*smooth((t-.73)/.03) : .46*(1-smooth((t-.76)/.24))+.008,
      widthDirection:t => [1,0,.15*Math.sin(t*Math.PI)],
      color:t => chainColor(.24+strand*.09+t*.11,false),
    }));
  }
  const loop = (start, end, controlA, controlB, startColor, endColor) => {
    const path = t => add(add(mul(start,(1-t)**3),mul(controlA,3*(1-t)**2*t)),add(mul(controlB,3*(1-t)*t*t),mul(end,t**3)));
    surface.sweep(path, {steps:72,sides:8,width:.055,kind:'connecting-loop',color:t => chainColor(startColor+(endColor-startColor)*t)});
  };
  loop(helices[0].end,helices[1].start,[-.65,1.69,.37],[.28,1.62,-.03],.17,.20);
  loop(helices[1].end,helices[2].start,[1.68,.75,.37],[1.71,.32,.51],.29,.32);
  loop(helices[2].end,helices[3].start,[1.47,-1.48,.47],[.91,-1.62,-.06],.45,.48);
  loop(helices[3].end,helices[4].start,[-.88,-1.65,.17],[-1.53,-1.30,.39],.59,.62);
  loop(helices[4].end,helices[5].start,[-1.72,.29,-.52],[-1.21,.91,-.99],.70,.73);
  loop(helices[5].end,arrows[0].start,[.71,-.68,-.85],[-.64,-1.15,-.43],.83,.24);
  for (let i = 0; i < arrows.length-1; i++) {
    const side = i%2 ? -1 : 1;
    const a = arrows[i].end, b = arrows[i+1].start;
    loop(a,b,add(a,[.03,side*.32,.17]),add(b,[-.03,side*.32,.17]),.35+i*.09,.33+i*.09);
  }
  return surface.finish('protein',samples);
}

export function createMolecules({samples = 10000} = {}) {
  if (!Number.isInteger(samples) || samples < 1 || samples > 100000) throw new RangeError('Particle samples must be an integer from 1 to 100000.');
  return [dna(samples),protein(samples)];
}
