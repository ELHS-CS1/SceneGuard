// Remove the CSS import as it's invalid in a worker context
// import './style.css';
// Import types and Vector3 ONLY
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { SceneGuard } from 'srcRoot/main/core/SceneGuard';
// Path adjusted assuming /examples and /src are siblings
// TODO: Change this import to use the package name (e.g., 'sceneguard') once the library build process is set up.

console.log('[Main] Basic Scene Example Initializing...');

export class BasicSceneExample {
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _scene: Scene;
  private _sceneGuard: SceneGuard;
  private _workerScriptUrl: string;

  constructor() {
    // Initialize Babylon.js
    this._canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    this._engine = new Engine(this._canvas);
    this._scene = new Scene(this._engine);

    // Set up scene
    this._scene.clearColor = new Color4(0.1, 0.1, 0.1, 1.0); // Dark gray background
    this._scene.ambientColor = new Color3(0.3, 0.3, 0.3); // Ambient light color

    // Set up camera
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
    camera.lowerRadiusLimit = 5; // Prevent zooming too close
    camera.upperRadiusLimit = 20; // Prevent zooming too far

    // Set up lighting
    const hemisphericLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this._scene);
    hemisphericLight.intensity = 0.7;
    hemisphericLight.groundColor = new Color3(0.2, 0.2, 0.2);

    const directionalLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), this._scene);
    directionalLight.intensity = 0.5;
    directionalLight.position = new Vector3(20, 40, 20);

    // Initialize SceneGuard
    this._sceneGuard = new SceneGuard(this._scene);

    // Create a worker script file
    this._workerScriptUrl =
      typeof import.meta !== 'undefined' && import.meta.url
        ? new URL('./example.worker.ts', import.meta.url).href
        : './example.worker.ts';

    // Load the worker script
    this._sceneGuard.loadScript(this._workerScriptUrl).catch(error => {
      console.error('[Main] Failed to load worker script:', error);
    });

    // Start the render loop
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this._engine.resize();
    });

    // Basic error handling
    window.addEventListener('error', event => {
      console.error('[Main] SCRIPT ERROR:', event.message, event.filename, event.lineno);
    });
  }

  dispose(): void {
    // Clean up resources
    this._sceneGuard.dispose();
    this._engine.dispose();
  }
}

// Create an instance of the example
new BasicSceneExample();
