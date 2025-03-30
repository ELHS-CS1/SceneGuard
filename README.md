# SceneGuard

## Overview

SceneGuard is a library designed to solve the challenge of securely running third-party code in Babylon.js web applications. It addresses the following problems:

1. Security risks associated with executing untrusted scripts
2. Performance issues caused by third-party code interfering with the main rendering thread
3. Lack of controlled access to Babylon.js scene elements for external scripts

## Architecture

SceneGuard employs a sandboxed execution model with the following key components:

1. **SceneGuard**: Main entry point that initializes the secure environment
2. **SceneBridge**: Manages communication between the main thread and worker
3. **GuardedWorker**: Isolated Web Worker environment for running third-party code
4. **GuardedAPI**: Provides a controlled interface for third-party scripts to interact with Babylon.js elements
5. **EntityHandle**: Represents a reference to Babylon.js entities without exposing direct access

The architecture uses message passing between the main thread and worker to ensure isolation and controlled access to scene elements.

## Basic Usage

```typescript
import { Engine, Scene } from '@babylonjs/core';
import { SceneGuard } from 'sceneguard';

// Create Babylon.js scene
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas);
const scene = new Scene(engine);

// Initialize SceneGuard
const sceneGuard = new SceneGuard(scene, engine);

// Load a third-party script
sceneGuard.loadScript('https://example.com/third-party-script.js');

// In third-party-script.js
// Create a sphere
const sphereHandle = GuardedAPI.createMesh({
  type: 'sphere',
  diameter: 2,
  segments: 32,
  position: new Vector3(0, 1, 0),
});

// Add a rotation behavior
GuardedAPI.addBehavior(sphereHandle, {
  type: 'rotate',
  options: {
    axis: new Vector3(0, 1, 0),
    speed: 0.5,
  },
});

// Observe the sphere's rotation
const observerId = GuardedAPI.observe(sphereHandle, 'rotation', data => {
  console.log(`Rotation: x=${data.x}, y=${data.y}, z=${data.z}`);
});

// Clean up when done
GuardedAPI.unobserve(observerId);
GuardedAPI.disposeEntity(sphereHandle);
```

## Available Mesh Types

SceneGuard supports the following mesh types:

- `box`: Create a box with size or width/height/depth
- `sphere`: Create a sphere with diameter and segments
- `cylinder`: Create a cylinder with height, diameter, and tessellation
- `ground`: Create a ground plane with width, height, and subdivisions
- `plane`: Create a plane with size or width/height
- `torus`: Create a torus with diameter, thickness, and tessellation
- `torusKnot`: Create a torus knot with radius, tube, and segments
- `tube`: Create a tube along a path with radius and tessellation

## Available Behaviors

SceneGuard provides the following behaviors:

- `rotate`: Rotate an entity around a specified axis
- `scale`: Scale an entity to a target size
- `move`: Move an entity to a target position

## Observable Types

You can observe the following properties of entities:

- `position`: Track position changes
- `rotation`: Track rotation changes
- `scaling`: Track scaling changes
- `beforeRender`: Track scene render events

## Contributing

We welcome contributions to enhance SceneGuard! Here's how you can contribute:

1. Fork the repository on GitHub
2. Clone your forked repository to your local machine
3. Create a new branch for your feature or bug fix
4. Make your changes and commit them with clear, descriptive messages
5. Push your changes to your fork on GitHub
6. Create a pull request from your fork to the main SceneGuard repository

Please ensure your code follows the existing style and includes appropriate tests. For major changes, please open an issue first to discuss the proposed changes.

## License

SceneGuard is released under the MIT License. See the LICENSE file for details.

---
