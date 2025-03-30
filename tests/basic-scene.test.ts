import { BasicSceneExample } from '../examples/basic-scene';
import type {
  IBehaviorConfig,
  IMeshOptions,
  ObservableType,
  SerializedObservableValueType,
} from '../src/shared/types/types';
import type { EntityHandle } from '../src/shared/utils/EntityHandle';

// Mock GuardedAPI
declare global {
  interface Window {
    GuardedAPI: {
      createMesh(options: IMeshOptions): EntityHandle;
      addBehavior(entity: EntityHandle, config: IBehaviorConfig): void;
      observe<T extends ObservableType>(
        entity: EntityHandle,
        type: T,
        callback: (data: SerializedObservableValueType<T>) => void
      ): string;
      disposeEntity(entity: EntityHandle): void;
      unobserve(observerId: string): void;
    };
  }
}

// Mock implementation of GuardedAPI
const mockGuardedAPI = {
  createMesh: jest.fn().mockImplementation((options: IMeshOptions): EntityHandle => {
    return { id: 'mock-' + options.type } as EntityHandle;
  }),
  addBehavior: jest.fn(),
  observe: jest.fn().mockReturnValue('mock-observer-id'),
  disposeEntity: jest.fn(),
  unobserve: jest.fn(),
};

// Set up the mock before tests
beforeAll(() => {
  (global as unknown as { GuardedAPI: typeof mockGuardedAPI }).GuardedAPI = mockGuardedAPI;
});

// Clean up after tests
afterAll(() => {
  delete (global as unknown as { GuardedAPI?: typeof mockGuardedAPI }).GuardedAPI;
});

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
    normalize() {
      return this;
    }
    scale(factor: number) {
      return new MockVector3(this.x * factor, this.y * factor, this.z * factor);
    }
    subtract(other: MockVector3) {
      return new MockVector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    addInPlace(other: MockVector3) {
      this.x += other.x;
      this.y += other.y;
      this.z += other.z;
      return this;
    }
  }

  return {
    Scene: jest.fn().mockImplementation(() => ({
      render: jest.fn(),
      cameras: [],
      lights: [],
      meshes: [],
      getEngine: () => ({
        getDeltaTime: () => 16, // Mock 60fps
      }),
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
        rotation: new MockVector3(0, 0, 0),
        scaling: new MockVector3(1, 1, 1),
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
    expect(mockGuardedAPI.createMesh).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sphere',
        diameter: 2,
        segments: 32,
      })
    );
  });

  it('should clean up resources on dispose', () => {
    const example = new BasicSceneExample();
    example.dispose();
    expect(mockGuardedAPI.unobserve).toHaveBeenCalledWith('mock-observer-id');
    expect(mockGuardedAPI.disposeEntity).toHaveBeenCalledTimes(2);
  });
});
