# w-gl

A simple renderer. I use this project to learn more about WebGL apps architecture.

It was mostly inspired by [WebGL Insights](http://www.webglinsights.com/) book,
and ~~is not really meant to be a reusable library~~ I use it for most of my 2D and 3D webgl rendering. I should probably document this more.

You can find its application in these repositories:

* https://github.com/anvaka/graph-start
* https://github.com/anvaka/ngraph.path.demo

# Basic usage

``` js
import {createScene, WireCollection} from 'w-gl';

// Scene needs a canvas element
let scene = createScene(document.querySelector('canvas'));

// let's draw a grid:
let lines = new WireCollection(22);
for (let row = 0; row <= 10; ++row) {
  lines.add({
    from: {x: 0, y: row},
    to: {x: 10, y: row}
  });
}
for (let col = 0; col <= 10; ++col) {
  lines.add({
    from: {x: col, y: 0},
    to: {x: col, y: 10}
  });
}
scene.appendChild(lines);

// Lets bring the grid into the view:
scene.setViewBox({
  left: 0,
  top: 10,
  right: 10,
  bottom: 0 
})
```

You can also install from CDN:

```html
    <script src='https://cdn.jsdelivr.net/npm/w-gl@0.21.1/build/wgl.min.js'></script>
```

This will make library available under global `wgl` name, and the rest remains the same:

```
const {createScene, WireCollection} = wgl;
```


# license

MIT
