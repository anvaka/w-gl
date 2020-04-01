const {createScene, LineStripCollection, PointCollection} = window.wgl;

let scene = createScene(document.querySelector('canvas'));

// Line strip is a connected line, that if over-draws capacity
// starts drawing again from the start (like a cyclic buffer)
let count = 42;
let circle = new LineStripCollection(count + 1);
let points = new PointCollection(count + 1);

let r = 1;
for (let i = 0; i <= count; ++i) {
  let angle = 2 * Math.PI * i / count;
  circle.add(r * Math.cos(angle), r * Math.sin(angle))
  points.add({
    x: (r + 1) * Math.cos(angle),
    y: (r + 1) * Math.sin(angle),
    color: 0xffffffff
  })
}
scene.appendChild(circle);
scene.appendChild(points);

scene.setViewBox({
  left: -2,
  top: 2,
  right: 2,
  bottom: -2 
})
