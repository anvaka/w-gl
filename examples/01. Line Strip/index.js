const {createScene, LineStripCollection, PointCollection} = window.wgl;

let scene = createScene(document.querySelector('canvas'));

// Line strip is a connected line, that if over-draws capacity
// starts drawing again from the start (like a cyclic buffer)
let count = 42;
let circle = new LineStripCollection(count + 1);
let points = new PointCollection(count + 1);

let r = 1000;
for (let i = 0; i <= count * 2; ++i) {
  let angle = 2 * Math.PI * i / count;
  circle.add({
    x: r * Math.cos(angle), 
    y: r * Math.sin(angle), 
    z: 0,
    color: 0xffffffff
  });
  points.add({
    x: (r + 1) * Math.cos(angle),
    y: (r + 1) * Math.sin(angle),
    z: 0,
    color: 0xffffffff
  })
}
scene.appendChild(circle);
scene.appendChild(points);

scene.setViewBox({
  left: -r,
  top: r,
  right: 2 * r,
  bottom: -2 * r
})
