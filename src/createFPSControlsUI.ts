import {INPUT_COMMANDS} from "./createFPSControls";

export default function createFPSControlsUI(parent: Element, inputControls: any) {
  //  <div class='navigation-controls'>
  const className = 'navigation-controls';
  let container = document.createElement('div')
  container.classList.add(className);
  container.innerHTML = getMarkup();

  let style = document.createElement('style');
  style.appendChild(document.createTextNode(getStyle(className)));
  (document.querySelector('head') as any).appendChild(style);

  parent.appendChild(container);
  let buttons = Array.from(container.querySelectorAll('a.navigation-btn'));
  let disposeList = buttons.map(createHandler);
  inputControls.on('move', updateTransforms);

  // Mouse capture handlers
  let captureMouse = container.querySelector('#capture-mouse') as HTMLInputElement;
  if (inputControls.getMouseCapture()) {
    captureMouse.checked = true;
  }
  captureMouse.addEventListener('change', onCaptureMouseChangedFromUI);
  inputControls.on('mouse-capture', onCaptureMouseChangedFromControls);

  // device orientation handlers
  let deviceOrientation = container.querySelector('#device-orientation') as HTMLInputElement;
  if (deviceOrientation) {
    deviceOrientation.checked = inputControls.isDeviceOrientationEnabled();
    deviceOrientation.addEventListener('change', onDeviceOrientationChangedFromUI);
  }
  inputControls.on('device-orientation', onDeviceOrientationChangedFromControls);

  return {dispose}

  function createHandler(el) {
    let command = getMoveCommand(el);
    return createPressListener(el, isDown => {
      inputControls.handleCommand(command, isDown ? 1 : 0);
    });
  }

  function onCaptureMouseChangedFromUI(e) {
    inputControls.enableMouseCapture(captureMouse.checked);
  }

  function onCaptureMouseChangedFromControls(isCaptured) {
    captureMouse.checked = isCaptured;
  }

  function onDeviceOrientationChangedFromUI() {
    inputControls.enableDeviceOrientation(deviceOrientation.checked);
  }

  function onDeviceOrientationChangedFromControls(isEnabled) {
    if (deviceOrientation) deviceOrientation.checked = isEnabled;
  }

  function updateTransforms(e) {
    buttons.forEach(btn => {
      if (e[getMoveCommand(btn)]) {
        btn.classList.add('down');
      } else {
        btn.classList.remove('down');
      }
    })
  }

  function getMoveCommand(el) {
    return Number.parseInt(el.getAttribute('data-command') as any, 10);
  }

  function dispose() {
    inputControls.off('move', updateTransforms);
    inputControls.off('mouse-capture', onCaptureMouseChangedFromControls);
    disposeList.forEach(x => x());
    if (container.parentElement) container.parentElement.removeChild(container);
    if (style.parentElement) style.parentElement.removeChild(style);
  }
}

function getMarkup() {
  return `
  <div class='navigation-row padded'>
    <div class='item'>
      <a href="#" class='navigation-btn secondary' data-command='${INPUT_COMMANDS.TURN_LEFT}'>
        <svg viewBox="0 0 1024 1024">
        <path d="m884.6 622.6v192c0 11.333-3.834 20.833-11.5 28.5-7.667 7.666-17 11.5-28 11.5s-20.5-3.834-28.5-11.5c-8-7.667-12-17.167-12-28.5v-192c0-61.334-21.667-113.67-65-157-43.334-43.334-95.667-65-157-65h-340l113 112c7.333 8 11 17.5 11 28.5s-3.834 20.333-11.5 28c-7.667 7.666-17 11.5-28 11.5s-20.5-4-28.5-12l-178-178c-8-8-12-17.5-12-28.5s4-20.5 12-28.5l183-183c8-8 17.5-12 28.5-12s20.5 3.833 28.5 11.5c8 7.666 12 17 12 28s-4 20.5-12 28.5l-114 114h336c83.333 0 154.5 29.5 213.5 88.5s88.5 130.17 88.5 213.5z"/>
        </svg>
        <div class='nav-key-legend'>Q</div>
      </a>
    </div>
    <a href='#' class='item navigation-btn' data-command='${INPUT_COMMANDS.MOVE_FORWARD}'>
      <svg viewBox="0 0 100 100"><path d="M10,80 50,30 90,80z"></path></svg>
      <div class='nav-key-legend'>W</div>
    </a>
    <a href="#" class='item navigation-btn secondary' data-command='${INPUT_COMMANDS.TURN_RIGHT}'>
      <svg viewBox="0 0 1024 1024">
        <path d="m108.6 622.6v192c0 11.333 3.833 20.833 11.5 28.5 7.666 7.666 17 11.5 28 11.5s20.5-3.834 28.5-11.5c8-7.667 12-17.167 12-28.5v-192c0-61.334 21.666-113.67 65-157 43.333-43.334 95.666-65 157-65h340l-113 112c-7.334 8-11 17.5-11 28.5s3.833 20.333 11.5 28c7.666 7.666 17 11.5 28 11.5s20.5-4 28.5-12l178-178c8-8 12-17.5 12-28.5s-4-20.5-12-28.5l-183-183c-8-8-17.5-12-28.5-12s-20.5 3.833-28.5 11.5c-8 7.666-12 17-12 28s4 20.5 12 28.5l114 114h-336c-83.334 0-154.5 29.5-213.5 88.5s-88.5 130.17-88.5 213.5z"/>
      </svg>
      <div class='nav-key-legend'>E</div>
    </a>
  </div>
  <div class='navigation-row padded'>
    <a href='#' class='item navigation-btn' data-command='${INPUT_COMMANDS.MOVE_LEFT}'>
      <svg viewBox="0 0 100 100" ><path d="M80,10 80,90 30,50z"></path></svg>
      <div class='nav-key-legend'>A</div>
    </a>
    <a href='#' class='item navigation-btn' data-command='${INPUT_COMMANDS.MOVE_BACKWARD}'>
      <svg viewBox="0 0 100 100"><path d="M10,30 50,80 90,30z"></path></svg>
      <div class='nav-key-legend'>S</div>
    </a>
    <a href='#' class='item navigation-btn' data-command='${INPUT_COMMANDS.MOVE_RIGHT}'>
      <svg viewBox="0 0 100 100" ><path d="M30,10 30,90 80,50z"></path></svg>
      <div class='nav-key-legend'>D</div>
    </a>
  </div>
  <div class='navigation-row'>
    <a href='#'  class='item navigation-btn wide' data-command='${INPUT_COMMANDS.MOVE_DOWN}'>
      <svg width="100%" height="100%" viewBox="0 0 1024 1024">
          <path d="M364,666L522,824C528,830 535.5,833 544.5,833C553.5,833 561,830 567,824L725,666C731.667,659.333 735,651.667 735,643C735,634.333 731.667,626.667 725,620C719,614 711.5,611 702.5,611C693.5,611 686,614 680,620L576,724L576,32C576,23.333 573,15.833 567,9.5C561,3.167 553.333,0 544,0C535.333,0 527.833,3.167 521.5,9.5C515.167,15.833 512,23.333 512,32L512,724L409,620C403,614 395.5,611 386.5,611C377.5,611 370,614 364,620C358,626.667 355,634.333 355,643C355,651.667 358,659.333 364,666ZM1024,992C1024,1000.67 1020.83,1008.17 1014.5,1014.5C1008.17,1020.83 1000.67,1024 992,1024L32,1024C23.333,1024 15.833,1020.83 9.5,1014.5C3.167,1008.17 0,1000.67 0,992C0,983.333 3.167,975.833 9.5,969.5C15.833,963.167 23.333,960 32,960L992,960C1000.67,960 1008.17,963.167 1014.5,969.5C1020.83,975.833 1024,983.333 1024,992Z" style="fill-rule:nonzero;"/>
      </svg>
      <div class='nav-key-legend'>shift</div>
    </a>
    <a href='#' class='item navigation-btn wide' data-command='${INPUT_COMMANDS.MOVE_UP}'>
      <svg viewBox="0 0 1024 1024"><path d="M726 167L568 9q-9-9-22.5-9T523 9L365 167q-10 10-10 23t10 23q9 9 22.5 9t22.5-9l104-104v692q0 13 9 22.5t23 9.5q13 0 22.5-9.5T578 801V109l103 104q9 9 22.5 9t22.5-9q9-10 9-23t-9-23zm298 825q0 13-9.5 22.5T992 1024H32q-13 0-22.5-9.5T0 992t9.5-22.5T32 960h960q13 0 22.5 9.5t9.5 22.5z"></path></svg>
      <div class='nav-key-legend'>space</div>
    </a>
</div>
  <div class='cursor-legend'>
    <input type='checkbox' id='capture-mouse' name="capture-mouse">
    <label for='capture-mouse'>Capture mouse cursor</label>
  </div>
  ${deviceOrientationBlock()}
</div>`;
}

function deviceOrientationBlock() {
  if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
    return `<div class='device-orientation-legend'>
    <input type='checkbox' id='device-orientation' name="device-orientation">
    <label for='device-orientation'>Use device orientation</label>
  </div>`;
  }
  return '';
}

function getStyle(className: string) {
  // TODO: this should really be part of a build tool.
  const prefix = `.${className}`;
  return `
${prefix} {
  position: fixed;
  bottom: 8px;
  left: 8px;
  font-family: 'Avenir', Helvetica, Arial, sans-serif
}
${prefix} * {
  box-sizing: border-box;
}
${prefix} label {
  color: white;
}
${prefix} .nav-key-legend {
  text-align: center;
  font-size: 14px;
}
${prefix} .navigation-row {
  display: flex;
}
${prefix} .item {
  width: 42px;
  height: 42px;
  margin: 2px;
}
${prefix} .navigation-btn {
  background: rgba(0,0,0,0.2);
  box-shadow: 0 2px 4px #000, 0 -1px 0 rgb(0 0 0 / 5%);
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  text-decoration: none;
  display: flex;
  width: 42px;
  flex-direction: column;
  color: #cecece;
}
${prefix} .navigation-btn.down {
  background: rgba(250,250,250,.2);
}
${prefix} .padded {
  margin-left: 10px;
}
${prefix} .navigation-btn.secondary {
  width: 42px;
  height: 42px;
  transform: scale(0.70);
}

${prefix} .navigation-btn.secondary svg {
  padding: 4px;
}
${prefix} .navigation-btn.secondary .nav-key-legend {
  color: #aaa;
}
${prefix} .navigation-btn.secondary.left {
  transform-origin: right bottom;
}
${prefix} .navigation-btn.secondary.right {
  transform-origin: left bottom;
}
${prefix} .navigation-btn.wide {
  width: 75px;
}
${prefix} .navigation-btn svg {
  fill: white;
  padding-top: 4px;
}
${prefix} .cursor-legend {
  margin-top: 8px;
  display: none;
}

@media (pointer: fine) {
  ${prefix} .cursor-legend {
    display: block;
  }
}`
}

function createPressListener(el, handler, repeatFrequency = 15) {
  let handle;
  el.addEventListener('mousedown', onDown);
  el.addEventListener('touchstart', onDown);
  el.addEventListener('keydown', onKeyDown);
  el.addEventListener('keyup', onKeyUp);

  return dispose;

  function dispose() {
    el.removeEventListener('mousedown', onDown);
    el.removeEventListener('touchstart', onDown);
    el.removeEventListener('keydown', onKeyDown);
    el.removeEventListener('keyup', onKeyUp);

    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);
    clearTimeout(handle);
  }

  function onDown(e) {
    e.preventDefault();
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    processLoop();
  }

  function processLoop() {
    handler(1);
    handle = setTimeout(processLoop, repeatFrequency);
  }

  function onMouseUp() {
    stopLoop();
  }

  function onKeyDown(e) {
    if(e.which === 13) { // return
      handler(1); e.preventDefault();
    }
  }
  function onKeyUp(e) {
    if(e.which === 13) { // return
      handler(0); e.preventDefault();
    }
  }

  function onTouchEnd() {
    stopLoop();
  }

  function stopLoop() {
    clearTimeout(handle);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);
    handler(0);
  }
}