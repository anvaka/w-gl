export default function isWebGLEnabled(canvas: HTMLCanvasElement) {
  try {
    if (!window.WebGLRenderingContext) return false;
    if (!canvas) canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
}
