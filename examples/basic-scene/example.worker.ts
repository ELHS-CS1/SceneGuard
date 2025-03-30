import { ArcRotateCamera, Engine, HemisphericLight, Scene, Vector3 } from '@babylonjs/core';
import './style.css'; // Main thread can import CSS
// Path adjusted assuming /examples and /src are siblings
import { SceneGuard } from 'srcRoot/main/core/SceneGuard';
import type {
  IBehaviorConfig,
  IMeshOptions,
  ISerializedVector3,
  ObservableType, // Use renamed interface
  SerializedObservableValueType,
} from 'srcRoot/shared/types/types';
import type { EntityHandle } from 'srcRoot/shared/utils/EntityHandle'; // Use EntityHandle directly

console.log('[Main] Basic Scene Example Initializing...');

class BasicSceneExample {
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _scene: Scene;
  private _sceneGuard: SceneGuard | null = null;

  constructor() {
    this._canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    if (!this._canvas) {
      throw new Error('Render canvas not found!');
    }
    this._engine = new Engine(this._canvas, true);
    this._scene = new Scene(this._engine);
    console.log('[Main] Babylon scene initialized.');
  }

  async createScene(): Promise<void> {
    console.log('[Main] Creating main Babylon scene elements...');
    // --- Main Scene Setup (Camera, Lights, etc.) ---
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.5,
      10,
      Vector3.Zero(),
      this._scene
    );
    camera.attachControl(this._canvas, true);
    camera.wheelPrecision = 50;

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.7;

    console.log('[Main] Main scene elements created.');

    // --- Initialize SceneGuard ---
    console.log('[Main] Initializing SceneGuard...');
    this._sceneGuard = new SceneGuard(this._scene);
    console.log('[Main] SceneGuard initialized.');

    // --- Load the Worker Script ---
    const workerScriptUrl = new URL('./example.worker.ts', import.meta.url).href;
    console.log(`[Main] Attempting to load worker script from: ${workerScriptUrl}`);

    try {
      await this._sceneGuard.loadScript(workerScriptUrl);
      console.log(`[Main] Successfully loaded worker script: ${workerScriptUrl}`);
    } catch (error) {
      console.error(`[Main] Failed to load worker script: ${workerScriptUrl}`, error);
    }
  }

  run(): void {
    if (!this._engine) return;
    console.log('[Main] Starting render loop...');
    this._engine.runRenderLoop(() => {
      if (this._scene) {
        this._scene.render();
      }
    });

    window.addEventListener('resize', () => {
      this._engine.resize();
    });
  }

  dispose(): void {
    console.log('[Main] Disposing example...');
    if (this._sceneGuard) {
      console.log('[Main] Disposing SceneGuard instance...');
      this._sceneGuard.dispose();
      this._sceneGuard = null;
    }
    if (this._engine) {
      console.log('[Main] Stopping render loop...');
      this._engine.stopRenderLoop();
      console.log('[Main] Disposing engine...');
      this._engine.dispose();
    }
    console.log('[Main] Example disposed.');
  }
}

// --- Run the Example ---
let example: BasicSceneExample | null = null;

async function startExample() {
  try {
    example = new BasicSceneExample();
    await example.createScene();
    example.run();
  } catch (error) {
    console.error('[Main] Failed to start example:', error);
  }
}

// --- Cleanup on Page Unload ---
window.addEventListener('beforeunload', () => {
  if (example) {
    example.dispose();
  }
});

// Start the example when the DOM is ready
document.addEventListener('DOMContentLoaded', startExample);

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

console.log('[Worker] example.worker.ts initializing...');

// Store handles and IDs for cleanup within this worker script's lifetime
let sphereHandle: EntityHandle | null = null;
let boxHandle: EntityHandle | null = null;
let rotationObserverId: string | null = null;

// --- Scene Setup Function (Worker Scope) --- //
function setupSceneInWorker() {
  console.log('[Worker] Setting up scene elements...');

  console.log('[Worker] Creating sphere...');
  try {
    sphereHandle = GuardedAPI.createMesh({
      type: 'sphere',
      diameter: 2,
      segments: 32,
      position: new Vector3(0, 1, 0),
    });
    if (sphereHandle) {
      console.log('[Worker] Sphere created with handle:', sphereHandle.id);
    } else {
      console.error('[Worker] GuardedAPI.createMesh returned null for sphere.');
    }
  } catch (error) {
    console.error('[Worker] Error creating sphere:', error);
  }

  console.log('[Worker] Creating box...');
  try {
    boxHandle = GuardedAPI.createMesh({
      type: 'box',
      size: 1,
      position: new Vector3(-3, 0.5, 0),
    });
    if (boxHandle) {
      console.log('[Worker] Box created with handle:', boxHandle.id);
    } else {
      console.error('[Worker] GuardedAPI.createMesh returned null for box.');
    }
  } catch (error) {
    console.error('[Worker] Error creating box:', error);
  }

  console.log('[Worker] Creating ground...');
  try {
    const groundHandle = GuardedAPI.createMesh({
      type: 'ground',
      width: 10,
      height: 10,
      subdivisions: 10,
      position: new Vector3(0, -0.01, 0),
    });
    if (groundHandle) {
      console.log('[Worker] Ground created with handle:', groundHandle.id);
    } else {
      console.error('[Worker] GuardedAPI.createMesh returned null for ground.');
    }
  } catch (error) {
    console.error('[Worker] Error creating ground:', error);
  }

  if (sphereHandle) {
    try {
      console.log('[Worker] Adding rotate behavior to sphere...');
      GuardedAPI.addBehavior(sphereHandle, {
        type: 'rotate',
        options: {
          axis: new Vector3(0, 1, 0),
          speed: 0.5,
        },
      });
    } catch (error) {
      console.error('[Worker] Error adding behavior:', error);
    }
  }

  if (sphereHandle) {
    try {
      console.log('[Worker] Observing sphere rotation...');
      rotationObserverId = GuardedAPI.observe(sphereHandle, 'rotation', data => {
        const rotationData = data as ISerializedVector3;
        console.log(
          `[Worker] Sphere Rotation Update: x=${rotationData.x.toFixed(2)}, y=${rotationData.y.toFixed(2)}, z=${rotationData.z.toFixed(2)}`
        );
      });
      console.log('[Worker] Rotation observer registered with ID:', rotationObserverId);
    } catch (error) {
      console.error('[Worker] Error observing rotation:', error);
    }
  }

  console.log('[Worker] Scene setup complete.');
}

// --- Execution --- //
try {
  setupSceneInWorker();
} catch (error) {
  console.error('[Worker] Uncaught error during setup:', error);
}

// --- Basic Error Handling --- //
self.addEventListener('messageerror', event => {
  console.error('[Worker] MESSAGE ERROR:', event);
});

self.addEventListener('error', event => {
  console.error('[Worker] SCRIPT ERROR:', event.message, event.filename, event.lineno);
});
