import { BasicSceneExample } from '../examples/basic-scene';

jest.mock('@babylonjs/core', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    cameras: [],
    lights: [],
    meshes: [],
  })),
  Engine: jest.fn().mockImplementation(() => ({
    runRenderLoop: jest.fn(),
    resize: jest.fn(),
  })),
  ArcRotateCamera: jest.fn().mockImplementation(() => ({
    attachControl: jest.fn(),
  })),
  HemisphericLight: jest.fn().mockImplementation(() => ({
    intensity: 0,
  })),
  MeshBuilder: {
    CreateSphere: jest.fn().mockImplementation(() => ({
      position: { y: 0 },
    })),
    CreateGround: jest.fn().mockImplementation(() => ({
      position: { y: 0 },
    })),
  },
  Vector3: {
    Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  },
}));

describe('BasicSceneExample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document methods
    document.createElement = jest.fn().mockReturnValue({});
    document.body.appendChild = jest.fn();
  });

  it('should create a scene', () => {
    const example = new BasicSceneExample();
    expect(example).toBeDefined();
  });
});
