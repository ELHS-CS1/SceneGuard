# Basic Scene Example

## Overview

This example demonstrates the core features of SceneGuard, a library designed to securely run 3D scene code in a sandboxed Web Worker environment, isolating it from the main thread where Babylon.js runs.

## Key Features Demonstrated

1. **Isolated Execution Environment**: All scene manipulation code runs in a Web Worker, keeping the main thread responsive for rendering and user interactions.

2. **Secure API Access**: Meshes are created and manipulated through `GuardedAPI` without direct access to the Babylon.js scene.

3. **Entity Creation**: The example shows how to create basic mesh types (sphere, box, ground) with configurable properties.

4. **Behavior Application**: Demonstrates attaching rotation behaviors to meshes.

5. **Observable Pattern**: Shows how to observe entity properties (rotation) to react to changes.

6. **Resource Management**: Proper cleanup of resources when no longer needed.

## What This Example Does

1. Creates a simple 3D scene with:

   - A sphere that rotates on the Y-axis
   - A box that rotates on the Y-axis
   - A ground plane

2. Adds rotation behaviors to both the sphere and box

3. Observes and logs rotation changes to demonstrate the observable pattern

4. After 10 seconds, cleans up all resources (unregistering observers and disposing of entities)

## Running the Example

1. Navigate to the `examples/basic-scene` directory
2. Open `index.html` in a browser or serve it with a local development server

## Key Code Components

### Main Thread (index.ts)

- Sets up the Babylon.js environment (canvas, engine, scene)
- Initializes SceneGuard to create the secure bridge
- Loads the worker script that will run in isolation

### Worker Thread (example.worker.ts)

- Demonstrates how to use the GuardedAPI to interact with the 3D scene
- Creates entities (sphere, box, ground)
- Adds behaviors to entities
- Observes entity properties
- Handles proper cleanup

## Benefits of SceneGuard Demonstrated

- **Security**: Third-party code runs in a sandboxed environment without direct access to the DOM or Babylon.js APIs
- **Performance**: The main thread remains responsive for rendering while complex logic runs in the worker
- **Controlled Access**: The GuardedAPI provides a safe interface for scene manipulation
- **Simplicity**: Complex Babylon.js operations are abstracted into a simpler, more focused API

## Additional Features of SceneGuard Not Demonstrated

While this basic example shows the core functionality, SceneGuard offers many more features:

- Support for additional mesh types (cylinder, plane, torus, torusKnot, tube)
- Additional behavior types (scale, move)
- Observable support for position and scaling in addition to rotation
- Scene-level observables (beforeRender)
- Error handling mechanisms
