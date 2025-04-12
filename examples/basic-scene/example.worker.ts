// Import only the types we need
import type {
  IBehaviorConfig,
  IMeshOptions,
  ISerializedVector3,
  ObservableType,
  SerializedObservableValueType,
} from 'srcRoot/shared/types/types';
import type { EntityHandle } from 'srcRoot/shared/utils/EntityHandle';

// --- Type definition for the globally injected API ---
interface GuardedAPIType {
  createMesh(options: IMeshOptions): EntityHandle;
  addBehavior(entity: EntityHandle, config: IBehaviorConfig): void;
  observe<T extends ObservableType>(
    entity: EntityHandle,
    type: T,
    callback: (value: SerializedObservableValueType<T>) => void
  ): string;
  disposeEntity(entity: EntityHandle): void;
  unobserve(observerId: string): void;
}

declare const GuardedAPI: GuardedAPIType;

// Helper function to create a serialized vector
function createVector(x: number, y: number, z: number): ISerializedVector3 {
  return { x, y, z };
}

console.log('[Worker] Basic Scene Example Worker Initializing...');

// Store handles and IDs for cleanup
let sphereHandle: EntityHandle | null = null;
let boxHandle: EntityHandle | null = null;
let groundHandle: EntityHandle | null = null;
let rotationObserverId: string | null = null;
let boxRotationObserverId: string | null = null;

try {
  // Create a sphere
  console.log('[Worker] Creating sphere...');
  sphereHandle = GuardedAPI.createMesh({
    type: 'sphere',
    diameter: 1,
    position: createVector(0, 1, 0),
  });
  if (sphereHandle) {
    console.log('[Worker] Sphere created with handle:', sphereHandle.id);
  } else {
    console.error('[Worker] Failed to create sphere handle.');
  }

  // Create a box
  console.log('[Worker] Creating box...');
  boxHandle = GuardedAPI.createMesh({
    type: 'box',
    size: 1,
    position: createVector(2, 0.5, 0),
  });
  if (boxHandle) {
    console.log('[Worker] Box created with handle:', boxHandle.id);

    // Add rotation behavior to the box
    console.log('[Worker] Adding rotate behavior to box...');
    GuardedAPI.addBehavior(boxHandle, {
      type: 'rotate',
      options: {
        axis: createVector(0, 1, 0),
        speed: 0.5,
      },
    });

    // Observe the box's rotation
    console.log('[Worker] Observing box rotation...');
    boxRotationObserverId = GuardedAPI.observe(boxHandle, 'rotation', data => {
      console.log(
        `[Worker] Box Rotation Update: x=${data.x.toFixed(2)}, y=${data.y.toFixed(2)}, z=${data.z.toFixed(2)}`
      );
    });
    console.log('[Worker] Box rotation observer registered with ID:', boxRotationObserverId);
  } else {
    console.error('[Worker] Failed to create box handle.');
  }

  // Create the ground
  console.log('[Worker] Creating ground...');
  groundHandle = GuardedAPI.createMesh({
    type: 'ground',
    width: 10,
    height: 10,
    position: createVector(0, 0, 0),
  });
  if (groundHandle) {
    console.log('[Worker] Ground created with handle:', groundHandle.id);
  } else {
    console.error('[Worker] Failed to create ground handle.');
  }

  // Add rotation behavior to the sphere
  if (sphereHandle) {
    console.log('[Worker] Adding rotate behavior to sphere...');
    GuardedAPI.addBehavior(sphereHandle, {
      type: 'rotate',
      options: {
        axis: createVector(0, 1, 0),
        speed: 1,
      },
    });
  }

  // Observe the sphere's rotation
  if (sphereHandle) {
    console.log('[Worker] Observing sphere rotation...');
    rotationObserverId = GuardedAPI.observe(sphereHandle, 'rotation', data => {
      console.log(
        `[Worker] Sphere Rotation Update: x=${data.x.toFixed(2)}, y=${data.y.toFixed(2)}, z=${data.z.toFixed(2)}`
      );
    });
    console.log('[Worker] Rotation observer registered with ID:', rotationObserverId);
  }

  console.log('[Worker] Scene setup complete.');
} catch (error) {
  console.error('[Worker] Error during scene setup:', error);
}

// Schedule cleanup after 10 seconds
const cleanupTimeout = 10000;
console.log(`[Worker] Scheduling cleanup in ${cleanupTimeout / 1000} seconds...`);
setTimeout(() => {
  // Clean up
  console.log('[Worker] Cleaning up...');
  if (rotationObserverId) {
    GuardedAPI.unobserve(rotationObserverId);
  }
  if (boxRotationObserverId) {
    GuardedAPI.unobserve(boxRotationObserverId);
  }
  if (sphereHandle) {
    GuardedAPI.disposeEntity(sphereHandle);
  }
  if (boxHandle) {
    GuardedAPI.disposeEntity(boxHandle);
  }
  if (groundHandle) {
    GuardedAPI.disposeEntity(groundHandle);
  }
}, cleanupTimeout);

// --- Basic Error Handling ---
self.addEventListener('messageerror', event => {
  console.error('[Worker] MESSAGE ERROR:', event);
});

self.addEventListener('error', event => {
  console.error('[Worker] SCRIPT ERROR:', event.message, event.filename, event.lineno);
});
