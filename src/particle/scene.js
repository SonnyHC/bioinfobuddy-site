/* BioInfoBuddy particle scene. Uses Particle Sculpture by LIghtJUNction.
 * SPDX-License-Identifier: AGPL-3.0-or-later; see web/public/particle/LICENSE and NOTICE. */
import { Shape, rotate, smooth, TAU } from './runtime/geometry.js';
import { mountSculpture } from './runtime/motion.js';
import { createRenderer } from './runtime/renderer.js';
import { createMolecularRenderer } from './runtime/molecular-renderer.js';

// A stylized double helix, not a molecular-scale structural model.
export function makeHelix() {
  const shape = new Shape();
  const path = (t, phase) => [Math.cos(t * TAU * 2.3 + phase) * .63, (t - .5) * 2.85, Math.sin(t * TAU * 2.3 + phase) * .63];
  for (let strand = 0; strand < 2; strand++) shape.tube(t => path(t, strand * Math.PI), .085, [77, 153, 139], strand, 440, 14);
  for (let i = 1; i < 31; i++) {
    const t = i / 31, a = path(t, 0), b = path(t, Math.PI), mid = a.map((v,j)=>(v+b[j])/2);
    shape.line(a, mid, .035, [125, 168, 157], 2, 24);
    shape.line(mid, b, .035, [191, 156, 108], 3, 24);
  }
  for (const point of shape.points) {
    point.material = point.part === 0 ? 'primary' : point.part === 1 ? 'secondary' : point.part === 2 ? 'primary' : 'accent';
    point.shade = .70 + .30 * (point.color[1] / 168);
  }
  return {id:'double-helix', ...shape.model(time => {
    const turn = rotate(1, time * .14 + .3), tilt = rotate(2, -.35);
    const lift = Math.sin(time * .42) * .025;
    return (point, scratch) => {turn(point,scratch); tilt(point,scratch); scratch[1] += lift;};
  }, [.12,-.06])};
}

// An illustrative protein fold: three alpha-helical ribbons around a pleated
// beta sheet, joined by loops. This is not a model of a particular molecule.
export function makeProtein() {
  const shape = new Shape();
  const teal = [77, 153, 139], pale = [125, 168, 157], gold = [191, 156, 108];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const normalize = v => { const length = Math.hypot(...v); return v.map(x => x / length); };
  const helix = (start, end, phase, part) => {
    const direction = end.map((v, i) => v - start[i]);
    const tangent = normalize(direction);
    const normal = normalize(cross(tangent, Math.abs(tangent[1]) < .9 ? [0,1,0] : [1,0,0]));
    const binormal = cross(tangent, normal);
    const path = (t, width = 0) => {
      const angle = t * TAU * 3.3 + phase, radius = .19 + width;
      return start.map((v, i) => v + direction[i]*t + radius*(normal[i]*Math.cos(angle) + binormal[i]*Math.sin(angle)));
    };
    shape.surface(220, 10, (t, u) => path(t, (u-.5)*.19), part === 1 ? pale : teal, part);
    for (const side of [-1,1]) shape.tube(t => path(t, side*.095), .018, teal, part, 140, 5);
    return [path(0), path(1)];
  };
  const left = helix([-.72,-.77,-.12], [-.57,.77,-.24], .3, 0);
  const right = helix([.74,.66,-.09], [.59,-.78,-.18], 1.2, 1);
  const back = helix([-.58,.15,-.64], [.59,.35,-.51], .7, 0);
  const ends = [];
  for (let strand = 0; strand < 4; strand++) {
    const direction = strand % 2 ? -1 : 1;
    const path = t => [(strand-1.5)*.235, direction*(t-.5)*1.47, .33 + .085*Math.sin(t*TAU*4) + .11*Math.cos((t-.5)*Math.PI)];
    shape.surface(110, 11, (t, u) => {
      const p = path(t), width = t < .78 ? .155 : .285*(1-t)/.22;
      p[0] += (u-.5)*width; return p;
    }, strand % 2 ? pale : gold, 2);
    ends.push([path(0), path(1)]);
  }
  const loop = (start, end, bend, part = 3) => {
    const a = start.map((v,i) => v + bend[i]);
    const b = end.map((v,i) => v + bend[i]);
    shape.tube(t => start.map((v,i) => (1-t)**3*v + 3*(1-t)**2*t*a[i] + 3*(1-t)*t*t*b[i] + t**3*end[i]), .035, pale, part, 100, 8);
  };
  loop(left[1], back[0], [0,.32,-.12]);
  loop(back[1], right[0], [.15,.2,.15]);
  loop(right[1], ends[0][0], [0,-.3,.18]);
  for (let i = 0; i < ends.length-1; i++) loop(ends[i][1], ends[i+1][0], [0, i % 2 ? -.23 : .23, .03]);
  loop(ends[3][1], left[0], [-.14,-.24,0]);
  for (const point of shape.points) {
    point.material = point.part === 0 ? 'primary' : point.part === 2 ? 'accent' : 'secondary';
    point.shade = .78 + .22*(point.color[1]/168);
  }
  return {id:'protein', ...shape.model(time => {
    const turn = rotate(1, time*.14+.3), tilt = rotate(2,-.17);
    const lift = Math.sin(time*.42)*.025;
    return (point, scratch) => {turn(point,scratch); tilt(point,scratch); scratch[1] += lift;};
  }, [.12,-.06])};
}

// Keep pose time continuous while click transitions can reverse from the exact
// current shape. Only the existing motion owner advances this clock.
export function createBiologyTimeline(scenes = [makeHelix(), makeProtein()], {hold = 3, morph = 1.15} = {}) {
  if (scenes.length !== 2 || !Number.isFinite(hold) || !Number.isFinite(morph) || hold <= 0 || morph <= 0) {
    throw new RangeError('Two scenes and positive finite hold/morph durations are required.');
  }
  let source = 0, target = 0, started = 0, duration = 0;
  const current = seconds => {
    const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const elapsed = Math.max(0, time-started);
    if (elapsed < duration) return {mix:source+(target-source)*smooth(elapsed/duration), target};
    const age = elapsed-duration;
    if (age < hold) return {mix:target, target};
    const cycle = age-hold, index = Math.floor(cycle/(hold+morph));
    const phase = cycle % (hold+morph), from = index % 2 ? 1-target : target, to = 1-from;
    return {mix:from+(to-from)*smooth(Math.min(1,phase/morph)), target:to};
  };
  return {
    scenes, duration:hold+morph, transition:'morph',
    at(seconds, selected = null, position = null) {
      const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      const explicit = position ?? selected;
      const mix = explicit === null ? current(time).mix : Math.max(0, Math.min(1, explicit));
      return {from:scenes[0], to:scenes[1], age:time, nextAge:time, mix, transition:'morph'};
    },
    next(time, immediate = false) {
      const value = current(time);
      source = value.mix; target = immediate ? 1-Math.round(value.mix) : 1-value.target; started = time;
      duration = immediate ? 0 : morph*Math.abs(target-source);
    },
    snap(time) {
      source = target = Math.round(current(time).mix); started = time; duration = 0;
    },
  };
}

export const themes = {
  light: {primary:[79,70,214],secondary:[32,159,205],accent:[232,111,105]},
  dark: {primary:[151,142,255],secondary:[76,207,234],accent:[255,148,135]},
};
export const HELIX_ZOOM = .79;
export function mountHelix(canvas, {theme = 'light', onState, onScene} = {}) {
  let announced;
  const owner = mountSculpture(canvas, createBiologyTimeline(), {
    rendererFactory: (surface, timeline, ready, options) => createMolecularRenderer(surface, timeline, ready, options)
      ?? createRenderer(surface, timeline, ready, {...options, zoom:HELIX_ZOOM}),
    onState,
    onFrame({scene}) {
      if (scene && scene !== announced) { announced = scene; onScene?.(scene); }
    },
    render:{projection:'perspective', zoom:1, spacing:1.3, brush:1.1, materials:themes[theme]},
  });
  if (!owner) return null;
  const click = event => { if (event.button === 0) owner.next(); };
  canvas.addEventListener('click', click);
  return {...owner, dispose() {canvas.removeEventListener('click', click); owner.dispose();}};
}
