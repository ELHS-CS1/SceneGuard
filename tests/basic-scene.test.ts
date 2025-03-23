import { BasicSceneExample } from '../examples/basic-scene';

jest.mock('@babylonjs/core', () => {
  class MockVector3 {
    constructor(
      public x: number,
      public y: number,
      public z: number
    ) {}
    static Zero() {
      return new MockVector3(0, 0, 0);
    }
  }

  return {
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
    Vector3: MockVector3,
  };
});

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
