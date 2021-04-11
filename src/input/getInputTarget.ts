export default function getInputTarget(requestedTarget: string | HTMLElement | undefined, fallback: HTMLElement) {
  if (typeof requestedTarget === 'string') {
    let result = document.querySelector(requestedTarget);
    if (!result) throw new Error('Cannot resolve input target element: ' + requestedTarget);
    return result as HTMLElement;
  }
  if (requestedTarget) return requestedTarget as HTMLElement;
  return fallback;
}
