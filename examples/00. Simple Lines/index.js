const {createScene, WireCollection} = window.wgl;

let scene = createScene(document.querySelector('canvas'));

// let's draw a grid:
let lines = new WireCollection(22,{ width:4 });
for (let row = 0; row <= 100; ++row) {
  lines.add({
    from: {x: 0, y: row},
    to: {x: 100, y: row}
  });
}
for (let col = 0; col <= 100; ++col) {
  lines.add({
    from: {x: col, y: 0},
    to: {x: col, y: 100}
  });
}
scene.appendChild(lines);

// and lets bring it into the view:
scene.setViewBox({
  left: 0,
  top: 10,
  right: 10,
  bottom: 0 
})
