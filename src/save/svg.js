import {mat4, vec4} from 'gl-matrix';
import createGraph from 'ngraph.graph';

export default function svg(scene, settings) {
  settings = settings || {};
  let renderers = initRenderers();
  const sceneRoot = scene.getRoot();
  sceneRoot.updateWorldTransform();
  let out = [];
  let context = Object.assign({
    background: toHexColor(scene.getClearColor()),
    write,
    scene
  }, scene.getDrawContext());

  printHeader(context, settings);
  draw(sceneRoot.children);
  closeDocument(context, settings);

  return out.join('\n');

  function write(str) {
    out.push(str);
  }

  function draw(children) {
    let layerSettings = {
      beforeWrite: settings.beforeWrite || yes,
      round: settings.round === undefined ? undefined: settings.round
    };

    for (var i = 0; i < children.length; ++i) {
      const child = children[i];
      const renderer = renderers.get(child.type);
      if (renderer) renderer(child, context, layerSettings);

      draw(child.children);
    }
  }
}

function yes() { return true; }

function printHeader(context, settings) {
  const viewBox = `0 0 ${context.width} ${context.height}`;
  context.write('<?xml version="1.0" encoding="utf-8"?>');

  if (settings.open) {
    context.write(settings.open());
  }

  context.write(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    viewBox="${viewBox}">
<style>
  path {
   vector-effect: non-scaling-stroke;
  }
</style>
`)
  if (context.background) {
    context.write(
`<rect id="background" fill="${context.background}" x="0" y="0" width="${context.width}" height="${context.height}"></rect>`
    );
  }
}

function closeDocument(context, settings) {
  if (settings.close) {
    context.write(settings.close());
  }
  context.write('</svg>');
}

function initRenderers() {
  let renderers = new Map();
  renderers.set('WireCollection', wireRenderer);
  return renderers;
}

function wireRenderer(element, context, settings) {
  if (!element.scene) return;
  let {beforeWrite, round} = settings;

  let elementGraph = createGraph();

  let project = getProjector(element, context, round)
  element.forEachLine((from, to) => {
    let f = project(from.x, from.y, from.z);
    let t = project(to.x, to.y, to.z);
    if (f.isBehind || t.isBehind) return; // Not quite accurate.
    if (clipToViewPort(f, t, context.width, context.height)) {
      let stroke = toHexColor(getColor(element, from, to))
      let fromId = `${f.x}|${f.y}`;
      let toId = `${t.x}|${t.y}`;

      if (!elementGraph.getNode(fromId)) elementGraph.addNode(fromId, f);
      if (!elementGraph.getNode(toId)) elementGraph.addNode(toId, t);
      if (!elementGraph.hasLink(fromId, toId)) elementGraph.addLink(fromId, toId, { stroke })
    }
  });

  if (elementGraph.getLinksCount() === 0) return; // all outside

  const strokeColor = toHexColor(getColor(element));
  const strokeWidth = 1 / element.scene.getPixelRatio();
  let style = `fill="none" stroke-width="${strokeWidth}" stroke="${strokeColor}"`
  let openTag = element.id ? `<g id="${element.id}" ${style}>` : `<g ${style}>`
  context.write(openTag);

  let globalOrder = getGlobalOrder(elementGraph);
  let lastNode = null;
  let lastPath = null;
  globalOrder.forEach(link => {
    let {from, to} = link;
    if (from !== lastNode) {
      if (to === lastNode) {
        // Swap them so that we can keep the path going.
        let temp = from;
        from = to;
        to = temp;
      } else {
        commitLastPath();
        lastPath = [];
      }
    }
    lastPath.push(from, to);
    lastNode = to;
  });
  commitLastPath();

  context.write('</g>');

  function commitLastPath() {
    if (!lastPath) return;
    lastPath = lastPath.map(x => elementGraph.getNode(x).data);
    if (!beforeWrite(lastPath)) {
      return;
    }

    let d = `M${lastPath[0].x} ${lastPath[0].y} L` + lastPath.slice(1).map(p => `${p.x} ${p.y}`).join(',');
    context.write(`<path d="${d}"/>`)
  }
}

function getGlobalOrder(graph) {
  let visited = new Set();
  let globalOrder = [];
  let stack = [];

  graph.forEachNode(node => {
    if (visited.has(node.id)) return;
    stack.push({to: node.id});
    runDFS();
  });

  return globalOrder;

  function runDFS() {
    while (stack.length) {
      let fromTo = stack.pop();
      if (fromTo.to && fromTo.from) {
        globalOrder.push({from: fromTo.from, to: fromTo.to});
      }

      if (visited.has(fromTo.to)) continue;
      visited.add(fromTo.to);

      graph.forEachLinkedNode(fromTo.to, function(other) {
        if (!visited.has(other.id)) stack.push({from: fromTo.to, to: other.id});
      });
    }
  }
}

function getColor(el, from, to) {
  if (el.allowColors && from && from.color && to && to.color) {
    return mixUint32Color(from.color, to.color);
  }
  return [
    el.color.r,
    el.color.g,
    el.color.b,
    el.color.a,
  ]
}

function mixUint32Color(c0, c1, t = 0.5) {
  let a = toRgba(c0);
  let b = toRgba(c1);

  return [
    a[0] * t + (1 - t) * b[0],
    a[1] * t + (1 - t) * b[1],
    a[2] * t + (1 - t) * b[2],
    a[3] * t + (1 - t) * b[3],
  ]
}

function toRgba(x) {
  return [
    (x >> 24) & 0xff / 255,
    (x >> 16) & 0xff / 255,
    (x >> 8) & 0xff / 255,
    (x) & 0xff / 255
  ];
}

function toHexColor(c) {
  let r = hexString(c[0]);
  let g = hexString(c[1])
  let b = hexString(c[2])
  return `#${r}${g}${b}`;
}

function hexString(x) {
  let v = Math.floor(x * 255).toString(16);
  return (v.length === 1) ? '0' + v : v;
}

function getProjector(element, context, roundFactor) {
  const {width, height, camera, view} = context;
  const mvp = mat4.multiply(mat4.create(), camera, view)
  mat4.multiply(mvp, mvp, element.worldModel);

  const rounder = makeRounder(roundFactor);

  return function(sceneX, sceneY, sceneZ) {
    const coordinate = vec4.transformMat4([], [sceneX, sceneY, sceneZ, 1], mvp);
    var x = rounder(width * (coordinate[0]/coordinate[3] + 1) * 0.5);
    var y = rounder(height * (1 - (coordinate[1]/coordinate[3] + 1) * 0.5));
    return {x, y, isBehind: coordinate[3] <= 0};
  }
}

function id(x) {
  return x;
}

function makeRounder(roundFactor) {
  if (roundFactor === undefined) return id;
  if (roundFactor === true || roundFactor === 0) {
    return Math.round;
  }
  return function(x) {
    return Math.round(x * roundFactor) / roundFactor;
  }
}

/**
 * Clips line to the screen rect
 */
function clipToViewPort(from, to, width, height) {
  return clipToPlane(from, to, {x: 0, y: 0}, {x: 0, y: 1}) &&
      clipToPlane(from, to, {x: 0, y: 0}, {x: 1, y: 0}) &&
      clipToPlane(from, to, {x: 0, y: height}, {x: 0, y: -1}) &&
      clipToPlane(from, to, {x: width, y: 0}, {x: -1, y: 0});
}

function clipToPlane(q1, q2, p, n) {
  let d1 = getDotNorm(q1, p, n);
  let d2 = getDotNorm(q2, p, n);
  if (d1 <= 0 && d2 <= 0) return false; // they are both out (or degenerative case)
  if (d1 > 0 && d2 > 0) return true; // they are entirely in, no need to clip

  // This means one is out, the other one is in.
  // see https://www.youtube.com/watch?v=og7hOFypKpQ&list=PL_w_qWAQZtAZhtzPI5pkAtcUVgmzdAP8g&index=6
  let t = d1 / (d1 - d2);
  let x = q1.x + t * (q2.x - q1.x);
  let y = q1.y + t * (q2.y - q1.y);
  if (d1 <= 0) {
    q1.x = x; q1.y = y;
  } else {
    q2.x = x; q2.y = y;
  }
  return true;
}

function getDotNorm(q, p, n) {
  return (q.x - p.x) * n.x + (q.y - p.y) * n.y;
}