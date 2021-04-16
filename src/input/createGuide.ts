import WireCollection from "../lines/WireCollection";
import { WglScene } from "src/createScene";
import WireAccessor from "src/lines/WireAccessor";
import { vec3 } from 'gl-matrix';

interface GuidOptions {
  /**
   * A color for the grid lines 0xRRGGBBAA
   */
  lineColor?: number;
  /**
   * Maximum alpha transparency that can be used for the grid lines
   */
  maxAlpha?: number;

  /**
   * Cursor color 0xRRGGBBAA
   */
  cursorColor?: number;

  /**
   * If set to false, the cursor is not rendered
   */
  showCursor?: boolean;

  /**
   * If set to false, the grid is not rendered
   */
  showGrid?: boolean;
}

export default function createGuide(scene: WglScene, options: GuidOptions = {}) {
  let camera = scene.getCameraController();
  const nullElement = {
      redraw: Function.prototype,
      dispose: Function.prototype
    }

  // TODO: Move these to options.
  let lineColor = options.lineColor || 0x0bb1b122;
  let maxAlpha = options.maxAlpha || 0xff;
  let grid = createGrid(lineColor);
  let cursor = createCursor(options.cursorColor || 0xffffffff);
  scene.on('transform', update);

  return {
    dispose,
    update
  }

  function dispose() {
    scene.off('transform', update);
    grid.dispose();
    cursor.dispose();
  }

  function update() {
    grid.redraw();
    cursor.redraw();
  }

  function createGrid(color: number) {
    if (options.showGrid === false) return nullElement; 
    let count = 32*2;
    let levelUp = new WireCollection(2*(count + 1), {width: 2.5, is3D: true, allowColors: true})
    levelUp['svgInvisible'] = true;

    let levelDown = new WireCollection(2*(count + 1), {width: 1.5, is3D: true, allowColors: true})
    levelDown['svgInvisible'] = true;
    const drawContext = scene.getDrawContext();
    let center = drawContext.view.center;

    redraw();

    scene.appendChild(levelDown);
    scene.appendChild(levelUp);

    return {redraw, dispose};

    function dispose() {
      scene.removeChild(levelDown);
      scene.removeChild(levelUp);
    }

    function getAlpha(x: number) {
      return 1 - (x - Math.floor(x));
    }

    function redraw() {
      let cameraPosition = scene.getDrawContext().view.position;
      let dx = cameraPosition[0] - center[0];
      let dy = cameraPosition[1] - center[1];
      let dz = cameraPosition[2] - center[2];
      let r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      let size = r * Math.tan(drawContext.fov / 2);
      let l = Math.log10( size)
      let step = Math.pow(10, Math.floor(l));
      let t = getAlpha(l);
      let alpha = Math.round(t * maxAlpha);

      let left = Math.floor((center[0])/step) * step - Math.floor(count * step/2);
      let top = Math.floor((center[1])/step) * step - Math.floor(count * step/2)
      let right = left + step * count;
      let bottom = top + step * count;
      drawLevel(levelDown, left, top, right, bottom, step, alpha);
      drawLevel(levelUp, left, top, right, bottom, step * 10, maxAlpha - alpha);
    }

    function drawLevel(geometry, left, top, right, bottom, step, alpha) {
      geometry.model[14] = center[2];
      geometry.worldTransformNeedsUpdate = true;
      geometry.count = 0;

      let gridColor = (color & 0xffffff00) | alpha;

      let stepTop = Math.ceil(top/step) * step;
      for (let i = stepTop; i <= bottom; i += step) {
        geometry.add({
          from: { x: left, y: i, color: gridColor },
          to: { x: right, y: i, color: gridColor}
        });
      }
      let stepLeft = Math.ceil(left/step) * step;
      for (let i = stepLeft; i <= right; i += step) {
        geometry.add({
          from: { x: i, y: top, color: gridColor },
          to: { x: i, y: bottom, color: gridColor}
        });
      }
    }
  }

  function createCursor(color: number) {
    if (options.showCursor === false) return nullElement; 

    let count = 360;
    let center = scene.getDrawContext().view.center;
    let cameraPosition = scene.getDrawContext().view.position;
    let geometry = new WireCollection(count + 1 , {width: 3, is3D: true, allowColors: true})
    geometry['svgInvisible'] = true

    let prevPoint;
    let points: WireAccessor[] = [];
    for (let i = 0; i <= count; ++i) {
      // This doesn't really matter, we redraw later anyway:
      points.push(
        geometry.add({
          from: {x: 0, y: 0, color},
          to: {x: i, y: i, color},
        })
      );
    }

    scene.appendChild(geometry);
    redraw();

    return {redraw, dispose};

    function dispose() {
      scene.removeChild(geometry)
    }

    function redraw() {
      
      let dx = cameraPosition[0] - center[0];
      let dy = cameraPosition[1] - center[1];
      let dz = cameraPosition[2] - center[2];
      let r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      r *= 0.025;

      for (let i = 0; i <= count + 1; ++i) {
        let alpha = i/count * 2 * Math.PI;
        if (i === 0) {
          prevPoint = {
            x: r * Math.cos(alpha),
            y: r * Math.sin(alpha),
            color
          };
          continue;
        }
        let nextPoint = {
            x: r * Math.cos(alpha),
            y: r * Math.sin(alpha),
            color
        };

        points[i - 1].update(prevPoint, nextPoint);
        prevPoint = nextPoint;
      }

      geometry.model[12] = center[0];
      geometry.model[13] = center[1];
      geometry.model[14] = center[2];
      geometry.worldTransformNeedsUpdate = true;
    }
  }
}