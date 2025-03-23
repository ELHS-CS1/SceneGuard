import { BasicSceneExample } from '../examples/basic-scene';

jest.mock('@babylonjs/core', () => ({
  Scene: jest.fn(),
  Engine: jest.fn(),
  ArcRotateCamera: jest.fn(),
  HemisphericLight: jest.fn(),
  MeshBuilder: {
    CreateSphere: jest.fn(),
    CreateGround: jest.fn(),
  },
  Vector3: {
    Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  },
}));

describe('BasicSceneExample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a scene', () => {
    const example = new BasicSceneExample();
    expect(example).toBeDefined();
  });
});
