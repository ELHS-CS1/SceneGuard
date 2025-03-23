import { BasicSceneExample } from '../examples/basic-scene';

describe('BasicSceneExample', () => {
  let example: BasicSceneExample;

  beforeEach(() => {
    example = new BasicSceneExample();
  });

  it('should create a scene with basic elements', () => {
    const scene = example.createScene();
    expect(scene).toBeDefined();
    expect(scene.cameras.length).toBe(1);
    expect(scene.lights.length).toBe(1);
    expect(scene.meshes.length).toBe(2); // sphere and ground
  });

  it('should have a camera positioned correctly', () => {
    const scene = example.createScene();
    const camera = scene.cameras[0];
    expect(camera).toBeDefined();
    expect(camera.position.length()).toBeGreaterThan(0);
  });

  it('should have a light with correct intensity', () => {
    const scene = example.createScene();
    const light = scene.lights[0];
    expect(light).toBeDefined();
    expect(light.intensity).toBe(0.7);
  });
});
