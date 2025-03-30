// Remove the CSS import as it's invalid in a worker context
// import './style.css';
// Import types and Vector3 ONLY
import { Vector3 } from '@babylonjs/core';
import type {
  IBehaviorConfig,
  IMeshOptions,
  ObservableType,
  SerializedObservableValueType,
} from 'srcRoot/shared/types/types';
// Import EntityHandle from its specific path
import type { EntityHandle } from 'srcRoot/shared/utils/EntityHandle';
// Path adjusted assuming /examples and /src are siblings
// TODO: Change this import to use the package name (e.g., 'sceneguard') once the library build process is set up.

// --- Type definition for the globally injected API --- //
interface GuardedAPIType {
  createMesh(options: IMeshOptions): EntityHandle;
  addBehavior(entity: EntityHandle, config: IBehaviorConfig): void;
  observe<T extends ObservableType>(
    entity: EntityHandle,
    type: T,
    callback: (data: SerializedObservableValueType<T>) => void
  ): string;
  disposeEntity(entity: EntityHandle): void;
  unobserve(observerId: string): void;
}

declare const GuardedAPI: GuardedAPIType;
// --- End Type definition --- //

console.log('[Main] Basic Scene Example Initializing...');

export class BasicSceneExample {
  private _sphereHandle: EntityHandle | null = null;
  private _boxHandle: EntityHandle | null = null;
  private _rotationObserverId: string | null = null;

  constructor() {
    this._setupScene();
  }

  private _setupScene(): void {
    console.log('[Main] Setting up scene elements...');

    // Create a sphere
    console.log('[Main] Creating sphere...');
    this._sphereHandle = GuardedAPI.createMesh({
      type: 'sphere',
      diameter: 2,
      segments: 32,
      position: new Vector3(0, 1, 0),
    });
    // Check handle BEFORE accessing id
    if (this._sphereHandle) {
      console.log('[Main] Sphere created with handle:', this._sphereHandle.id);
    } else {
      console.error('[Main] Failed to create sphere handle.');
    }

    // Create a box
    console.log('[Main] Creating box...');
    this._boxHandle = GuardedAPI.createMesh({
      type: 'box',
      size: 1,
      position: new Vector3(-3, 0.5, 0),
    });
    // Check handle BEFORE accessing id
    if (this._boxHandle) {
      console.log('[Main] Box created with handle:', this._boxHandle.id);
    } else {
      console.error('[Main] Failed to create box handle.');
    }

    // Create the ground
    console.log('[Main] Creating ground...');
    const groundHandle = GuardedAPI.createMesh({
      type: 'ground',
      width: 10,
      height: 10,
      subdivisions: 10,
      position: new Vector3(0, -0.01, 0),
    });
    // Check handle BEFORE accessing id
    if (groundHandle) {
      console.log('[Main] Ground created with handle:', groundHandle.id);
    } else {
      console.error('[Main] Failed to create ground handle.');
    }

    // Add rotation behavior to the sphere
    if (this._sphereHandle) {
      console.log('[Main] Adding rotate behavior to sphere...');
      GuardedAPI.addBehavior(this._sphereHandle, {
        type: 'rotate',
        options: {
          axis: new Vector3(0, 1, 0),
          speed: 0.5,
        },
      });
    }

    // Observe the sphere's rotation
    if (this._sphereHandle) {
      console.log('[Main] Observing sphere rotation...');
      // Explicitly tell observe we expect 'rotation' data
      this._rotationObserverId = GuardedAPI.observe(this._sphereHandle, 'rotation', data => {
        // TypeScript now infers `data` is SerializedVector3 based on 'rotation' and GuardedAPIType
        console.log(
          `[Main] Sphere Rotation Update: x=${data.x.toFixed(2)}, y=${data.y.toFixed(2)}, z=${data.z.toFixed(2)}`
        );
      });
      console.log('[Main] Rotation observer registered with ID:', this._rotationObserverId);
    }

    console.log('[Main] Scene setup complete.');
  }

  public dispose(): void {
    console.log('[Main] Cleaning up scene elements...');

    // 1. Unregister observers
    if (this._rotationObserverId) {
      console.log(`[Main] Unregistering observer: ${this._rotationObserverId}`);
      GuardedAPI.unobserve(this._rotationObserverId);
      this._rotationObserverId = null;
    }

    // 2. Dispose entities
    if (this._sphereHandle) {
      console.log(`[Main] Disposing entity: ${this._sphereHandle.id}`);
      GuardedAPI.disposeEntity(this._sphereHandle);
      this._sphereHandle = null;
    }
    if (this._boxHandle) {
      console.log(`[Main] Disposing entity: ${this._boxHandle.id}`);
      GuardedAPI.disposeEntity(this._boxHandle);
      this._boxHandle = null;
    }
    // Note: Ground handle was local to _setupScene, so not disposed here.
    // If we needed to dispose it, its handle should be stored globally like sphere/box.

    console.log('[Main] Scene cleanup complete.');
  }
}

// Create an instance of the example
const example = new BasicSceneExample();

// Schedule cleanup after 10 seconds
const cleanupTimeout = 10000;
console.log(`[Main] Scheduling cleanup in ${cleanupTimeout / 1000} seconds...`);
setTimeout(() => {
  example.dispose();
}, cleanupTimeout);

// Basic error handling within the worker
self.addEventListener('messageerror', event => {
  console.error('[Main] MESSAGE ERROR:', event);
});

self.addEventListener('error', event => {
  console.error('[Main] SCRIPT ERROR:', event.message, event.filename, event.lineno);
});
