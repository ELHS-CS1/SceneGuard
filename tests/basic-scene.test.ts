import { BasicSceneExample } from '../examples/basic-scene';
import { Scene } from '@babylonjs/core';

describe('BasicSceneExample', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        canvas = document.createElement('canvas');
    });

    it('should create a scene with basic elements', () => {
        const example = new BasicSceneExample(canvas);
        const scene = example['scene'];
        
        expect(scene).toBeInstanceOf(Scene);
        expect(scene.cameras.length).toBe(1);
        expect(scene.lights.length).toBe(1);
        expect(scene.meshes.length).toBe(2); // sphere and ground
    });
}); 