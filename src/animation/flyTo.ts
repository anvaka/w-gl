import { FlyToOptions } from '../createScene';
import ViewMatrix from '../ViewMatrix';

/**
 * Helper to perform smooth camera animations from one point to another
 */
export default function flyTo(options: FlyToOptions & {
  view: ViewMatrix;
  cameraController?: any;
  renderFrame: (immediate?: boolean) => void;
  cancelFrameToken: () => void;
  requestFrameToken: (callback: () => void) => number;
}) {
  const {
    x, y, z,
    view,
    cameraController,
    renderFrame,
    cancelFrameToken,
    requestFrameToken
  } = options;

  const durationMs = options.durationMs !== undefined ? options.durationMs : 500;
  if (durationMs <= 0) {
    // Immediate movement
    view.position[0] = x;
    view.position[1] = y;
    if (z !== undefined) view.position[2] = z;
    view.update();
    // Update center point for map controls
    if (cameraController && cameraController.setViewBox) {
      cameraController.setViewBox({
        left: x - 0.5,
        right: x + 0.5,
        top: y + 0.5,
        bottom: y - 0.5
      });
    }
    renderFrame();
    if (options.done) options.done();
    return;
  }

  // Store start position for interpolation
  const startX = view.position[0];
  const startY = view.position[1];
  const startZ = view.position[2];
  const endX = x;
  const endY = y;
  const endZ = z !== undefined ? z : startZ;
  
  const easingFn = getEasingFunction(options.easing || 'easeInOutCubic');
  const startTime = Date.now();
  const endTime = startTime + durationMs;
  
  cancelFrameToken();
  
  // Start animation loop
  let frameToken: number;
  animateFrame();
  
  function animateFrame() {
    const now = Date.now();
    if (now >= endTime) {
      // Animation complete
      view.position[0] = endX;
      view.position[1] = endY;
      view.position[2] = endZ;
      view.update();
      
      // Update center point for map controls
      if (cameraController && cameraController.setViewBox) {
        cameraController.setViewBox({
          left: endX - 0.5,
          right: endX + 0.5,
          top: endY + 0.5,
          bottom: endY - 0.5
        });
      }
      
      renderFrame(true);
      if (options.done) options.done();
      return;
    }
    
    // Calculate progress with easing
    const t = easingFn((now - startTime) / durationMs);
    
    // Current position during animation
    const currentX = startX + t * (endX - startX);
    const currentY = startY + t * (endY - startY); 
    const currentZ = startZ + t * (endZ - startZ);
    
    // Update camera position
    view.position[0] = currentX;
    view.position[1] = currentY;
    view.position[2] = currentZ;
    view.update();
    
    // Update center point for map controls during animation
    if (cameraController && cameraController.setViewBox) {
      cameraController.setViewBox({
        left: currentX - 0.5,
        right: currentX + 0.5,
        top: currentY + 0.5,
        bottom: currentY - 0.5
      });
    }
    
    renderFrame(true);
    frameToken = requestFrameToken(animateFrame);
  }
}

/**
 * Returns an easing function based on its name
 */
function getEasingFunction(name: string) {
  const easings = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  };
  
  return easings[name] || easings.easeInOutCubic;
}