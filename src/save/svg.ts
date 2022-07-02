import {mat4, vec4} from 'gl-matrix';
import createGraph, {NodeId} from 'ngraph.graph';
import Element from '../Element';
import { WglScene, DrawContext } from 'src/createScene';
import { ColorPoint } from 'src/global';
import {toHexColor} from '../colorUtils';


type StackNode = {
  from?: NodeId,
  to: NodeId
};

type ProjectedPoint = {
  x: number,
  y: number,
  isBehind?: boolean
}

type LineVisitor = (from: ColorPoint, to: ColorPoint) => void;

type LineCollectionTrait = {
  forEachLine: (visitor: LineVisitor) => void;
  getLineColor: (from?: ColorPoint, to?: ColorPoint) => number[];
  width?: number,
  multiColorSegment?: boolean
} & Element;

/**
 * When exporting a collection of wires we want to limit amount of movement of a pen
 * head. For this we construct a graph of all paths, and perform DFS on it. It gives
 * fewer paths overall and a nice order for drawing.
 */
type ExportGraph = import('ngraph.graph').Graph<ProjectedPoint, any> & import('ngraph.events').EventedType

interface SVGRenderingContext extends DrawContext {
  background: string
  write: (s: string) => void
  scene: WglScene
}

interface SVGExportSettings {
  /**
   * Called before a collection of points is printed to the output. If function returns
   * false, then this collection of points is not printed.
   */
  beforeWrite?: (points: ProjectedPoint[]) => boolean;

  /**
   * Allow consumers to write a license information (right between <?xml> and <!doctype..>)
   */
  open?: () => string;

  /**
   * Allow consumers to write any additional elements before closing the </svg> document
   */
  close?: () => string;

  /**
   * When this is boolean `true`, each value is `Math.round()`'ed  before it is printed. If the
   * value is a `number` then it indicates amount of significant digits for the rounding.
   * 
   * `false` by default - values are printed at maximum precision.
   */
  round?: boolean | number;
}

export default function svg(scene: WglScene, settings: SVGExportSettings = {}) {
  const sceneRoot = scene.getRoot();
  sceneRoot.updateWorldTransform();

  let out: string[] = [];
  let context = Object.assign({
    background: toHexColor(scene.getClearColor()),
    write,
    scene
  }, scene.getDrawContext());

  printHeader(context, settings);
  draw(sceneRoot.children);
  closeDocument(context, settings);

  return out.join('\n');

  function write(str: string) {
    out.push(str);
  }

  function draw(children: Element[]) {
    let layerSettings = {
      beforeWrite: settings.beforeWrite || yes,
      round: settings.round === undefined ? undefined: settings.round
    };

    for (var i = 0; i < children.length; ++i) {
      const child = children[i];
      const lineCollection = getLineRenderTrait(child);
      if (lineCollection) renderLinesCollection(lineCollection, context, layerSettings);

      draw(child.children);
    }
  }
}

function getLineRenderTrait(child: any): LineCollectionTrait | undefined {
  if (!child || child['svgInvisible']) return;
  if (child.forEachLine) return child;
}

function yes() { return true; }

function printHeader(context: SVGRenderingContext, settings: SVGExportSettings) {
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

function closeDocument(context: SVGRenderingContext, settings: SVGExportSettings) {
  if (settings.close) {
    context.write(settings.close());
  }
  context.write('</svg>');
}

function renderLinesCollection(element: LineCollectionTrait, context: SVGRenderingContext, settings: SVGExportSettings) {
  if (!element.scene) return;
  let {beforeWrite, round} = settings;

  let elementGraph = createGraph() as ExportGraph;
  let graphsByColor = new Map<string, ExportGraph>();

  let {multiColorSegment} = element;
  let project = getProjector(element, context, round)

  element.forEachLine((from, to) => {
    let f = project(from.x, from.y, from.z);
    let t = project(to.x, to.y, to.z);
    if (f.isBehind || t.isBehind) return; // Not quite accurate.
    if (clipToViewPort(f, t, context.width, context.height)) {
      let stroke = toHexColor(element.getLineColor(from, to))
      let fromId = `${f.x}|${f.y}`;
      let toId = `${t.x}|${t.y}`;

      let targetGraph = elementGraph;

      if (multiColorSegment) {
        targetGraph = graphsByColor.get(stroke) as ExportGraph;
        if (!targetGraph) {
          targetGraph = createGraph() as ExportGraph;
          graphsByColor.set(stroke, targetGraph);
        }
      }

      if (!targetGraph.getNode(fromId)) targetGraph.addNode(fromId, f);
      if (!targetGraph.getNode(toId)) targetGraph.addNode(toId, t);
      if (!targetGraph.hasLink(fromId, toId)) targetGraph.addLink(fromId, toId, { stroke })
    }
  });

  let graphsToVisit: [ExportGraph, string][] = [];
  if (multiColorSegment) {
    graphsByColor.forEach((graph, color) => {
      graphsToVisit.push([graph, color]);
    });

  } else {
    graphsToVisit.push([elementGraph, toHexColor(element.getLineColor())]);
  }

  graphsToVisit.forEach(([elementGraph, strokeColor]) => {
    if (elementGraph.getLinksCount() === 0) return; // all outside

    let elementWidth = element.width === undefined ? 1 : element.width;
    const strokeWidth = elementWidth / (element.scene as WglScene).getPixelRatio();
    let style = `fill="none" stroke-width="${strokeWidth}" stroke="${strokeColor}"`
    let openTag = (element as any).id ? `<g id="${(element as any).id}" ${style}>` : `<g ${style}>`
    context.write(openTag);

    let globalOrder = getGlobalOrder(elementGraph);
    let lastNode: NodeId | null = null;
    let lastPath: NodeId[] | null = null;
    globalOrder.forEach(link => {
      let {from, to} = link;
      if (from !== lastNode) {
        if (to === lastNode) {
          // Swap them so that we can keep the path going.
          let temp = from as NodeId;
          from = to;
          to = temp;
        } else {
          commitLastPath();
          lastPath = [];
        }
      }
      if (lastPath) lastPath.push(from as NodeId, to);
      lastNode = to;
    });
    commitLastPath();

    context.write('</g>');

    function commitLastPath() {
      if (!lastPath) return;
      let points = lastPath.map(x => {
        let node = elementGraph.getNode(x);
        if (node) return node.data;
        throw new Error('Node is found in the path construction, but missing in the graph')
      });

      if (beforeWrite && !beforeWrite(points)) {
        return;
      }

      let d = `M${points[0].x} ${points[0].y} L` + points.slice(1).map(p => `${p.x} ${p.y}`).join(',');
      context.write(`<path d="${d}"/>`)
    }
  })
}

/**
 * Global order performs DFS on the graph, so that if it is a pen-plotter renders
 * an SVG we have a long path. This is not necessarily optimal, but likely better
 * than nothing.
 */
function getGlobalOrder(graph: ExportGraph) {
  let visited = new Set();
  let globalOrder: StackNode[] = [];
  let stack: StackNode[] = [];

  graph.forEachNode(node => {
    if (visited.has(node.id)) return;
    stack.push({to: node.id});
    runDFS();
  });

  return globalOrder;

  function runDFS() {
    while (stack.length) {
      let fromTo = stack.pop() as StackNode;

      if (fromTo.to && fromTo.from) {
        globalOrder.push({from: fromTo.from, to: fromTo.to});
      }

      if (visited.has(fromTo.to)) continue;
      visited.add(fromTo.to);

      graph.forEachLinkedNode(fromTo.to, function(other) {
        if (!visited.has(other.id)) stack.push({from: (fromTo as StackNode).to, to: other.id});
      }, false);
    }
  }
}


function getProjector(element: Element, context: SVGRenderingContext, roundFactor?: number | boolean) {
  const {width, height, projection, view} = context;
  const mvp = mat4.multiply(mat4.create(), projection, view.matrix)
  mat4.multiply(mvp, mvp, element.worldModel);

  const rounder = makeRounder(roundFactor);

  return function(sceneX: number, sceneY: number, sceneZ?: number) {
    const coordinate = vec4.transformMat4([0, 0, 0, 0], [sceneX, sceneY, sceneZ || 0, 1], mvp);
    var x = rounder(width * (coordinate[0]/coordinate[3] + 1) * 0.5);
    var y = rounder(height * (1 - (coordinate[1]/coordinate[3] + 1) * 0.5));
    return {x, y, isBehind: coordinate[3] <= 0} as ProjectedPoint;
  }
}

function id(x) {
  return x;
}

function makeRounder(roundFactor?: number | boolean) {
  if (roundFactor === undefined) return id;
  if (roundFactor === true || roundFactor === 0) {
    return Math.round;
  }
  return function(x: number) {
    return Math.round(x * (roundFactor as number)) / (roundFactor as number);
  }
}

/**
 * Clips line to the screen rect
 */
function clipToViewPort(from: ProjectedPoint, to: ProjectedPoint, width: number, height: number) {
  return clipToPlane(from, to, {x: 0, y: 0}, {x: 0, y: 1}) &&
      clipToPlane(from, to, {x: 0, y: 0}, {x: 1, y: 0}) &&
      clipToPlane(from, to, {x: 0, y: height}, {x: 0, y: -1}) &&
      clipToPlane(from, to, {x: width, y: 0}, {x: -1, y: 0});
}

function clipToPlane(q1: ProjectedPoint, q2: ProjectedPoint, p: ProjectedPoint, n: ProjectedPoint) {
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

function getDotNorm(q: ProjectedPoint, p: ProjectedPoint, n: ProjectedPoint) {
  return (q.x - p.x) * n.x + (q.y - p.y) * n.y;
}