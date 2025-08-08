# Architecture.md

## Project Overview
w-gl is a simple WebGL renderer written in TypeScript, primarily used for 2D and 3D visualization projects. It provides a scene-based rendering system with collections for points, lines, and other geometric primitives.

## Build Commands
- `npm run build` - Clean build directory and compile TypeScript to JavaScript bundles
- `npm start` - Same as build (development mode)
- `npm test` - No tests configured (returns error)

The build system uses Rollup with TypeScript compilation, outputting both UMD (`build/wgl.js`) and ES module (`build/wgl.module.js`) bundles.

## Core Architecture

### Scene System
The main entry point is `createScene(canvas, options)` which returns a `WglScene` instance. The scene manages:
- WebGL context initialization and configuration (supports both WebGL 1.0 and 2.0)
- Camera controls (map controls by default, with FPS controls available)
- Event handling (mouse, touch, keyboard)
- Render loop and frame scheduling

#### Core Scene Methods
- `appendChild(child: Element, sendToBack?: boolean)` - Add elements to the scene
- `removeChild(child: Element)` - Remove elements from the scene  
- `renderFrame(immediate?: boolean)` - Schedule or immediately execute a render frame
- `getSceneCoordinate(clientX: number, clientY: number): vec3` - Convert mouse/touch coordinates to 3D scene coordinates
- `getClientCoordinate(sceneX: number, sceneY: number, sceneZ?: number): {x: number, y: number}` - Convert 3D scene coordinates to screen coordinates
- `flyTo(options: FlyToOptions)` - Smooth camera animation to target coordinates
- `setViewBox(rect: Rectangle)` - Set camera to view a specific rectangular region
- `getDrawContext(): DrawContext` - Get current rendering context (matrices, dimensions, etc.)
- `getGL(): WebGLRenderingContext` - Access the WebGL rendering context
- `getClearColor(): [number, number, number, number]` / `setClearColor(r: number, g: number, b: number, a: number)` - Manage background color

#### Scene Configuration Options
Key options for `createScene()`:
- `devicePixelRatio` - High-DPI display support
- `size` - Fixed canvas dimensions (otherwise uses CSS size)
- `fov` - Field of view angle in radians (default: 45°)  
- `near/far` - Camera frustum bounds
- `inputTarget` - Element to listen for input events
- Navigation constraints: `allowRotation`, `minPhi/maxPhi`, `minTheta/maxTheta`, `minZoom/maxZoom`
- `wglContextOptions` - WebGL context creation parameters

### Element Hierarchy
- `Element` - Base class for all renderable objects with transform matrix support
- Scene uses a root `Element` that contains all child elements
- Elements can be appended/removed from the scene dynamically

### Collection Types
The collection system is built around `GLCollection`, a powerful base class that bridges high-level rendering with WebGL programs:

#### GLCollection Architecture
`GLCollection` extends `Element` and provides a unified interface for batch rendering:
- **Program Wrapping**: Encapsulates `RenderProgram` instances created by `defineProgram()`
- **Buffer Management**: Delegates vertex data operations (`add`, `remove`, `update`, `get`) to the underlying program
- **Automatic Rendering**: Calls `scene.renderFrame()` when buffer changes occur
- **Uniform Management**: Auto-manages common uniforms (projection, model, view matrices)

#### Built-in Collection Types
- `WireCollection` - For rendering lines and wireframes
- `LineStripCollection` - For continuous line strips  
- `PointCollection` - For rendering point clouds with instancing
- Custom collections can extend `GLCollection` with specialized shaders

#### GLCollection Core Methods
```typescript
// Vertex management (delegates to RenderProgram)
add(vertex: Object): number          // Add vertex, returns ID
update(id: number, vertex: Object)   // Update existing vertex
remove(id: number): number           // Remove vertex, returns new count
get(id: number): Object              // Read vertex data

// Buffer operations
getBuffer(): ArrayBuffer             // Get raw vertex buffer
appendBuffer(data: Uint8Array, offset: number)  // Bulk append data

// Rendering (called automatically by scene)
draw(gl: WebGLRenderingContext, drawContext: DrawContext)
```

### GL Program System
The program system is the foundation for efficient WebGL rendering, automatically generating optimized JavaScript code:

#### defineProgram() - The Core Factory
`defineProgram(structure: ProgramDefinition)` creates `RenderProgram` instances that:
- **Parse GLSL**: Automatically extracts attributes and uniforms from vertex/fragment shaders
- **Generate Buffer Code**: Creates optimized JavaScript for vertex data management  
- **Compile Shaders**: Handles WebGL shader compilation and program linking
- **Type Inference**: Maps GLSL types to JavaScript typed arrays (vec3→Float32Array, etc.)
- **Code Generation**: Produces executable JavaScript with methods like `add()`, `draw()`, `dispose()`

#### Program Configuration Options
```typescript
defineProgram({
  gl: WebGLRenderingContext,           // WebGL context
  vertex: string,                      // GLSL vertex shader source
  fragment: string,                    // GLSL fragment shader source
  capacity?: number,                   // Initial vertex buffer size
  debug?: boolean,                     // Enable code inspection
  
  // Advanced options:
  attributes?: AttributeOverrides,     // Custom attribute types
  instanced?: InstancedAttributes,     // Instancing support
  preDrawHook?: (info) => string,      // Custom draw setup
  postDrawHook?: (info) => string,     // Custom draw cleanup
  sourceBuffer?: RenderProgram         // Shared buffer programs
})
```

#### Generated RenderProgram API
Every `defineProgram()` call returns a `RenderProgram` with these methods:
- `add(vertex: Object): number` - Add vertex matching shader attributes
- `update(id: number, vertex: Object)` - Modify existing vertex  
- `remove(id: number): number` - Remove vertex, returns new count
- `get(id: number): Object` - Read vertex data (creates new object)
- `draw(uniforms: Object)` - Execute WebGL draw call
- `getBuffer(): ArrayBuffer` - Access raw vertex data
- `dispose()` - Clean up WebGL resources

#### Attribute System Classes
- `BaseAttribute` - Foundation for all attribute types
- `ColorAttribute` - Optimized 32-bit color handling (RGBA→single uint32)
- `FloatAttribute`, `NumberAttribute` - Numeric data types
- `InstancedAttribute` - For instanced rendering (geometry replication)

The system automatically handles buffer growth, WebGL state management, and performance optimization.

#### Example: Custom GLCollection
```typescript
class CustomCollection extends GLCollection {
  constructor(gl) {
    const program = defineProgram({
      gl,
      vertex: `
        uniform mat4 modelViewProjection;
        attribute vec3 position;
        attribute vec4 color;
        void main() {
          gl_Position = modelViewProjection * vec4(position, 1.0);
        }`,
      fragment: `
        precision mediump float;
        uniform vec4 color;
        void main() { gl_FragColor = color; }`,
      attributes: {
        color: new ColorAttribute() // Optimized color packing
      }
    });
    super(program);
  }
}

// Usage:
const collection = new CustomCollection(scene.getGL());
const vertexId = collection.add({
  position: [0, 0, 0],
  color: 0xFF0000FF  // Red color as uint32
});
scene.appendChild(collection);
```

### ViewMatrix - Camera Transformation System
The `ViewMatrix` class is the core of w-gl's camera system, managing the camera's position and orientation in 3D space. It maintains both the view transformation matrix and its inverse (camera world matrix).

#### Core Properties
- `matrix: mat4` - The view matrix that transforms world coordinates to camera space
- `cameraWorld: mat4` - Inverse view matrix representing camera's world transformation
- `position: vec3` - Camera position in world coordinates  
- `orientation: quat` - Camera rotation as a quaternion
- `center: vec3` - Point the camera is looking at (used by lookAt method)

#### Key Methods
- `lookAt(eye, center, up)` - Points camera from eye position toward center with given up vector
- `update()` - Reconstructs view matrix from current position and orientation
- `deconstructPositionRotation()` - Extracts position/rotation from the camera world matrix
- `translateOnAxis(axis, distance)` - Moves camera along a local axis direction
- `translateX/Y/Z(distance)` - Convenience methods for axis-aligned movement

#### Matrix Relationship
The ViewMatrix maintains a crucial inverse relationship:
- `view.matrix` transforms world coordinates → camera coordinates (for rendering)
- `view.cameraWorld` transforms camera coordinates → world coordinates (for positioning)

This dual representation enables efficient coordinate conversions and camera manipulation.

### DrawContext - Rendering State Container
The `DrawContext` interface encapsulates all rendering state passed to elements during the draw cycle. It provides essential information for coordinate transformations, projection calculations, and responsive rendering.

#### Core Properties
```typescript
interface DrawContext {
  width: number;              // Canvas width in pixels
  height: number;             // Canvas height in pixels  
  fov: number;                // Field of view angle in radians
  pixelRatio: number;         // Device pixel ratio for high-DPI displays
  canvas: HTMLCanvasElement;  // Reference to the WebGL canvas
  projection: mat4;           // Projection matrix (perspective/orthographic)
  inverseProjection: mat4;    // Inverse projection for coordinate conversion
  view: ViewMatrix;           // Camera view transformation
}
```

#### Usage in Rendering Pipeline
The DrawContext flows through the entire rendering pipeline:

1. **Scene Creation** - Created once during `createScene()` initialization
2. **Resize Updates** - Automatically updated when canvas size changes
3. **Frame Rendering** - Passed to every element's `draw(gl, drawContext)` method
4. **Coordinate Conversion** - Used by `getSceneCoordinate()` and `getClientCoordinate()`

#### Common Usage Patterns
```typescript
// In a custom element's draw method:
draw(gl: WebGLRenderingContext, drawContext: DrawContext) {
  // Access viewport dimensions
  const aspectRatio = drawContext.width / drawContext.height;
  
  // Use projection matrix for MVP calculations  
  const mvp = mat4.multiply(mat4.create(), drawContext.projection, drawContext.view.matrix);
  mat4.multiply(mvp, mvp, this.worldModel);
  
  // Access camera position for distance-based effects
  const cameraDistance = vec3.distance(this.position, drawContext.view.position);
  
  // Responsive sizing based on pixel ratio
  const lineWidth = 2 * drawContext.pixelRatio;
}
```

#### DrawContext in Camera Controls
Camera controllers use DrawContext for responsive navigation:
- **Aspect Ratio Calculations** - `drawContext.width / drawContext.height` for pan/rotation scaling
- **FOV-based Movement** - `Math.tan(drawContext.fov / 2)` for distance-proportional panning  
- **Pixel-Perfect Interaction** - `drawContext.pixelRatio` for high-DPI mouse/touch handling

### Camera and Controls
- `createMapControls()` - Default camera controller (pan, zoom, rotate) with DrawContext-aware navigation
- `createFPSControls()` - First-person camera controls with ViewMatrix manipulation
- `flyTo()` - Smooth camera animation system using ViewMatrix interpolation

### Coordinate Conversion System
Critical for interactive applications, w-gl provides bidirectional coordinate conversion using gl-matrix types:

#### Type Definitions
- `vec3` - 3D vector type from gl-matrix library, represented as `[x, y, z]` number array
- `Rectangle` - Type for rectangular regions: `{left: number, top: number, right: number, bottom: number}`
- `FlyToOptions` - Camera animation options with target coordinates and timing parameters

#### Screen to World Coordinates
`getSceneCoordinate(clientX: number, clientY: number): vec3` converts mouse/touch positions to 3D world coordinates:
- **Parameters**: 
  - `clientX: number` - Mouse X coordinate relative to viewport
  - `clientY: number` - Mouse Y coordinate relative to viewport
- **Returns**: `vec3` - 3D world coordinates as a gl-matrix vec3 array `[x, y, z]`
- **Process**: 
  - Takes client coordinates (relative to viewport)
  - Accounts for device pixel ratio and canvas positioning
  - Performs inverse projection transformation and ray casting
  - Projects ray onto target Z plane (default: z=0)
- **Usage**: Essential for mouse picking, 3D interactions, and event handling

#### World to Screen Coordinates  
`getClientCoordinate(sceneX: number, sceneY: number, sceneZ?: number): {x: number, y: number}` converts 3D world positions to screen coordinates:
- **Parameters**:
  - `sceneX: number` - World X coordinate
  - `sceneY: number` - World Y coordinate  
  - `sceneZ?: number` - World Z coordinate (optional, defaults to 0)
- **Returns**: `{x: number, y: number}` - Screen coordinates as an object with x,y properties
- **Process**:
  - Applies model-view-projection transformation
  - Performs perspective division
  - Accounts for device pixel ratio
- **Usage**: Positioning tooltips, overlays, and 2D UI elements over 3D objects

These methods enable mouse picking, tooltips, and interactive overlays.

### Input System
Modular input handling through:
- `createMouseController()`
- `createTouchController()`  
- `createKeyboardController()`
- Event delegation system that only activates when listeners are registered

#### Scene Events System
W-gl provides a powerful event system that allows library users to respond to user interactions and scene changes. The scene implements the EventedType interface from ngraph.events, providing standard event handling capabilities.

##### Core Event Types

**Interaction Events**
- `'click'` - Fired on mouse clicks or touch taps
  - **Event Data**: `{x: number, y: number, z: number, originalEvent: MouseEvent | Touch}`
  - **Coordinates**: Automatically converted from screen coordinates to 3D world coordinates using `getSceneCoordinate()`
  - **Lazy Activation**: Only processes mouse events when listeners are registered

- `'mousemove'` - Fired during mouse movement over the canvas
  - **Event Data**: `{x: number, y: number, z: number, originalEvent: MouseEvent}`
  - **Performance**: Automatically throttled and only active when listeners exist
  - **3D Conversion**: Real-time conversion from mouse position to 3D scene coordinates using `getSceneCoordinate()`

**Scene Hierarchy Events**
- `'append-child'` - Fired when elements are added to the scene
  - **Event Data**: The `Element` instance being added
  - **Timing**: Triggered after successful appendChild operation

- `'remove-child'` - Fired when elements are removed from the scene
  - **Event Data**: The `Element` instance being removed
  - **Timing**: Triggered after successful removeChild operation

**Camera Transform Events**
- `'transform'` - Fired by camera controllers during navigation
  - **Event Data**: `TransformEvent` object containing `drawContext` and `updated` flag
  - **Usage**: Allows custom logic to respond to camera movements
  - **Control Flow**: Setting `transformEvent.updated = true` can trigger additional redraws

##### Event Usage Patterns

**Basic Event Listening**
```javascript
// Listen for mouse clicks with 3D coordinates
scene.on('click', (eventData) => {
  console.log(`Clicked at 3D position: ${eventData.x}, ${eventData.y}, ${eventData.z}`);
  console.log('Original DOM event:', eventData.originalEvent);
});

// Track mouse movement in 3D space
scene.on('mousemove', (eventData) => {
  updateTooltip(eventData.x, eventData.y, eventData.z);
});
```

**Scene Hierarchy Monitoring**
```javascript
// Track elements being added/removed
scene.on('append-child', (element) => {
  console.log('New element added:', element);
  updateElementCount();
});

scene.on('remove-child', (element) => {
  console.log('Element removed:', element);
  cleanupElementReferences(element);
});
```

**Camera State Tracking**
```javascript
// Monitor camera transformations
scene.on('transform', (transformEvent) => {
  const { view, width, height } = transformEvent.drawContext;
  updateMinimap(view.position, view.orientation);
  
  // Force additional redraw if needed
  if (needsExtraProcessing) {
    transformEvent.updated = true;
  }
});
```

**Advanced Event Handling**
```javascript
// Object picking and selection
scene.on('click', (eventData) => {
  const clickedObject = findObjectAt(eventData.x, eventData.y, eventData.z);
  if (clickedObject) {
    selectObject(clickedObject);
    highlightObject(clickedObject);
  }
});

// Distance-based interactions
scene.on('mousemove', (eventData) => {
  const cameraPos = scene.getDrawContext().view.position;
  const distance = calculateDistance(cameraPos, [eventData.x, eventData.y, eventData.z]);
  
  if (distance < INTERACTION_THRESHOLD) {
    showInteractionHint(eventData.x, eventData.y, eventData.z);
  }
});
```

##### Controller-Specific Events

**FPS Controls Events**
FPS camera controllers fire additional events for advanced UI integration:

- `'move'` - Fired during camera movement with command state
  - **Event Data**: Object mapping movement commands to boolean states
  - **Usage**: Update UI button states to show active movement directions
  - **Example**: `{[MOVE_FORWARD]: true, [MOVE_LEFT]: false, ...}`

- `'mouse-capture'` - Fired when mouse capture state changes
  - **Event Data**: Boolean indicating if mouse is captured
  - **Usage**: Update UI to reflect pointer lock status
  - **Integration**: Syncs with browser pointer lock API

- `'device-orientation'` - Fired when device orientation usage changes
  - **Event Data**: Boolean indicating if device orientation is enabled
  - **Usage**: Update settings UI and mobile-specific controls
  - **Platform**: Primarily for mobile device integration

- `'pointer-locked'` - Fired when pointer lock state changes
  - **Event Data**: Boolean indicating if pointer is locked
  - **Usage**: Show/hide cursor crosshairs and locked-mode UI elements

**Map Controls Events**
Map camera controllers primarily use the `'transform'` event for navigation feedback.

**Usage Example: FPS Controls UI Integration**
```javascript
const fpsControls = scene.getCameraController();

// Update movement button visual states
fpsControls.on('move', (commandStates) => {
  document.querySelectorAll('.movement-btn').forEach(btn => {
    const command = parseInt(btn.dataset.command);
    btn.classList.toggle('active', commandStates[command]);
  });
});

// Sync mouse capture checkbox
fpsControls.on('mouse-capture', (isCaptured) => {
  document.getElementById('capture-mouse').checked = isCaptured;
});

// Show crosshair when pointer is locked
fpsControls.on('pointer-locked', (isLocked) => {
  document.querySelector('.crosshair').style.display = isLocked ? 'block' : 'none';
});
```

##### Performance Optimizations

**Lazy Event Activation**
- Mouse event listeners are only activated when `scene.on('click')` or `scene.on('mousemove')` are called
- This prevents unnecessary coordinate conversion and event processing
- Internal flags (`hasMouseClickListeners`, `hasMouseMoveListeners`) control activation

**Efficient Coordinate Conversion**
- Screen-to-world coordinate conversion only occurs when events are actually fired
- Uses optimized matrix operations and caching for frequently accessed transformations
- Automatically accounts for device pixel ratio and canvas positioning

**Event Context Management**
- Events can be registered with custom context using `scene.on(eventName, callback, context)`
- Supports event removal via `scene.off()` for cleanup
- Integrates with disposal system to prevent memory leaks

### Draw Context System Integration
The `DrawContext` object serves as the central communication hub between the scene, camera system, and all rendering elements. It's automatically updated and propagated throughout the rendering pipeline:

#### Lifecycle and Updates
- **Initialization** - Created during scene setup with initial canvas dimensions and camera state
- **Automatic Updates** - Refreshed on canvas resize, camera movements, and projection changes
- **Propagation** - Passed to every element's `draw()` method during frame rendering
- **Access Pattern** - Available via `scene.getDrawContext()` for external components

#### Integration Points
- **GLCollection Uniforms** - Automatically populates `projectionMatrix`, `model`, `view` uniforms
- **Camera Controllers** - Use width/height/fov for responsive navigation calculations
- **Coordinate Conversion** - Powers `getSceneCoordinate()` and `getClientCoordinate()` transformations
- **Element Rendering** - Enables responsive sizing, distance-based effects, and proper matrix calculations

#### Performance Considerations
- **Matrix Reuse** - Same projection/view matrices shared across all elements in a frame
- **Minimal Allocation** - Single DrawContext instance reused, properties updated in-place
- **Lazy Updates** - Only recalculated when canvas size or camera state actually changes

### Draw Context
The `DrawContext` object passed to all rendering elements contains:
- `width/height` - Canvas dimensions in pixels
- `pixelRatio` - Device pixel ratio for high-DPI support
- `projection/inverseProjection` - Camera projection matrices
- `view` - ViewMatrix instance with camera transformation
- `fov` - Current field of view angle
- `canvas` - Reference to the WebGL canvas element

## Key Files
- `src/createScene.ts` - Main scene creation and management
  - Core API: 570 lines defining the complete scene interface
  - Coordinate conversion algorithms for screen ↔ world transformation
  - Event system integration with lazy listener activation
  - Camera animation system with customizable easing
  - WebGL context management with fallback support
- `src/GLCollection/GLCollection.ts` - Base collection class for batch rendering
  - Bridge between high-level API and WebGL programs
  - Automatic uniform management and buffer delegation
  - Foundation for all specialized collection types
- `src/gl/defineProgram.ts` - WebGL program factory and code generator
  - 648 lines of sophisticated JavaScript code generation
  - GLSL parser and WebGL shader compiler
  - Dynamic buffer management and vertex operations
  - Instancing support and performance optimizations
- `src/Element.ts` - Base renderable element class
- `src/ViewMatrix.ts` - Camera view matrix management
- `index.ts` - Main library exports
- `rollup.config.js` - Build configuration

## Development Notes
- Uses Float64Array for matrices to handle large scenes
- WebGL context supports both WebGL 1.0 and 2.0
- Supports high-DPI displays via devicePixelRatio
- Uses gl-matrix library for matrix operations
- Events system provided by ngraph.events
- Animation system uses amator library