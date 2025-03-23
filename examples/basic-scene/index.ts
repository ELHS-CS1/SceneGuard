import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";

export class BasicSceneExample {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;

    constructor() {
        this._canvas = document.createElement('canvas');
        document.body.appendChild(this._canvas);

        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        const camera = new ArcRotateCamera('camera', 0, Math.PI / 3, 10, Vector3.Zero(), this._scene);
        camera.attachControl(this._canvas, true);

        const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);
        light.intensity = 0.7;

        this._engine.runRenderLoop(() => {
            this._scene.render();
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    createScene(): Scene {
        const scene = new Scene(this._engine);

        // Add camera
        const camera = new ArcRotateCamera("camera", 0, Math.PI / 3, 10, Vector3.Zero(), scene);
        camera.attachControl(this._canvas, true);

        // Add lights
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        // Add shapes
        const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
        sphere.position.y = 1; // Position the sphere above the ground

        const ground = MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
        ground.position.y = -1;

        return scene;
    }

    run() {
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });
    }
}
