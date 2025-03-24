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
GuardedAPI.createMesh({ size: 2 });
GuardedAPI.observe(mesh, 'onBeforeRenderObservable', () => {
  console.log('Mesh is about to render!');
});
```

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

----
