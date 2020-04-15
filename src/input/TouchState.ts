/**
 * Just to track changes for a single touch event, we create this state:
 */
export class TouchState {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  id: any;
  createdAt: number;

  constructor(touch) {
    this.x = touch.clientX;
    this.y = touch.clientY;
    this.lastX = this.x;
    this.lastY = this.y;
    this.id = touch.identifier;
    this.createdAt = Date.now();
  }

  move(touch) {
    this.lastX = this.x;
    this.lastY = this.y;
    this.x = touch.clientX;
    this.y = touch.clientY;
  }
}


// When two fingers touch the scene we want to "lock" interaction to either rotation
// or scaling. When locked to rotation, we also allow scaling. When Locked to scaling
// only scaling is allowed
const UNKNOWN = 0; // here we don't know yet. Collect more input to make a decision
const SCALE = 1; // Locked to scaling.
const ROTATE = 2; // Locked to rotation.
const INCLINE = 3; // Locked to inclination.

/**
 * This state is used to detect gestures. It answers the questions:
 * - Should we scale with this gesture?
 * - Should we rotate with this gesture?
 * - Should we change incline with this gesture?
 */
export class MultiTouchState {
  allowRotation: any;
  state: number;
  canRotate: boolean;
  canScale: boolean;
  canIncline: boolean;
  first: any;
  second: any;
  stateChanged: boolean;

  constructor(allowRotation) {
    this.allowRotation = allowRotation;
    this.state = UNKNOWN;
    this.canRotate = false;
    this.canScale = false;
    this.canIncline = false;
    this.first = undefined;
    this.second = undefined;
  }

  reset() {
    this.state = UNKNOWN;
    this.canRotate = false;
    this.canScale = false;
    this.canIncline = false;
    this.first = undefined;
    this.second = undefined;
  }

  isUnknown() {
    return this.state === UNKNOWN;
  }

  track(first, second) {
    this.stateChanged = false;

    if (this.state !== UNKNOWN) return; // Already resolved the state.

    if (!(this.first && this.second)) {
      this.first = {
        id: first.id,
        x: first.x,
        y: first.y
      };
      this.second = {
        id: second.id,
        x: second.x,
        y: second.y
      };
      // we are not ready yet to process anything. Wait for more data:
      return;
    }

    // Make sure we have the same first/second touches:
    let originalFirst = this.first;
    let originalSecond = this.second;
    if (first.id === originalSecond.id && second.id === originalFirst.id) {
      let t = originalFirst;
      originalFirst = originalSecond;
      originalSecond = t;
    }

    // Now let's figure out what gesture we are dealing with...
    let dfy = originalFirst.y - originalSecond.y;
    let dfx = originalFirst.x - originalSecond.x;

    let dcy = first.y - second.y;
    let dcx = first.x - second.x;

    // We compare how much the distance has changed between first two touches and
    // current two touches:
    let scaleChange = Math.abs(Math.hypot(dfy, dfx) - Math.hypot(dcy, dcx));
    // Also compare how much the angle has changed:
    let initialAngle = Math.atan2(dfy, dfx);
    let angleChange = Math.abs(initialAngle - Math.atan2(dcy, dcx));

    // Now let's see if this is incline change:
    initialAngle = (Math.abs(initialAngle) * 180) / Math.PI;
    // Two fingers have to be roughly on the horizontal line
    let horizontalAngleInDegrees = 60;
    let isHorizontalLine =
      initialAngle < horizontalAngleInDegrees ||
      180 - initialAngle < horizontalAngleInDegrees;
    if (
      isHorizontalLine &&
      this.allowRotation &&
      Math.abs(first.createdAt - second.createdAt) < 100
    ) {
      // we take a sum of two vectors:
      // direction of the first finger + direction of the second finger
      // In case of incline change we want them to move either up or down
      // which means X change should be small, why Y change should be large
      let vx = first.x - originalFirst.x + second.x - originalSecond.x;
      let vy = first.y - originalFirst.y + second.y - originalSecond.y;
      if (Math.abs(vx) < 10 && Math.abs(vy) > 42) {
        this.canIncline = true;
      }
    }

    if (this.canIncline) {
      this.canRotate = false;
      this.canScale = false;
      this.canIncline = true;
      this.state = INCLINE;
    } else if (angleChange > 0.1 && this.allowRotation) {
      // When we are rotating we want to be able to scale too:
      this.canRotate = true;
      this.canScale = true;
      this.canIncline = false;
      this.state = ROTATE;
    } else if (scaleChange > 15) {
      // But when we are scaling, only scaling should be allowed
      // (otherwise it's too annoying):
      this.canRotate = false;
      this.canScale = true;
      this.canIncline = false;
      this.state = SCALE;
    }

    this.stateChanged = true;
  }
}

