import { EntityHandle } from '../src/shared/utils/EntityHandle';

describe('EntityHandle', () => {
  beforeEach(() => {
    // Reset the private _usedIds Set before each test
    const usedIds = Reflect.get(EntityHandle, '_usedIds') as Set<string>;
    usedIds.clear();
  });

  it('should create an entity handle with a valid ID', () => {
    const id = 'test-entity-1';
    const handle = new EntityHandle(id);
    expect(handle.id).toBe(id);
  });

  it('should throw an error when creating a handle with an empty ID', () => {
    expect(() => new EntityHandle('')).toThrow('Entity ID cannot be empty');
  });

  it('should throw an error when creating a handle with a duplicate ID', () => {
    const id = 'test-entity-2';
    new EntityHandle(id);
    expect(() => new EntityHandle(id)).toThrow(`Entity ID '${id}' is already in use`);
  });

  it('should properly dispose of an entity handle', () => {
    const id = 'test-entity-3';
    const handle = new EntityHandle(id);
    handle.dispose();

    // Should be able to create a new handle with the same ID after disposal
    const newHandle = new EntityHandle(id);
    expect(newHandle.id).toBe(id);
  });

  it('should correctly compare entity handles for equality', () => {
    const id1 = 'test-entity-4';
    const id2 = 'test-entity-5';

    const handle1 = new EntityHandle(id1);
    const handle2 = new EntityHandle(id2);
    const handle3 = new EntityHandle('test-entity-6');

    expect(handle1.equals(handle1)).toBe(true);
    expect(handle1.equals(handle2)).toBe(false);
    expect(handle2.equals(handle3)).toBe(false);
  });

  it('should maintain unique IDs across multiple handles', () => {
    const handles = new Set<EntityHandle>();
    const ids = ['a', 'b', 'c', 'd', 'e'];

    // Create handles
    ids.forEach(id => {
      handles.add(new EntityHandle(id));
    });

    // Dispose some handles
    Array.from(handles)
      .filter(h => ['b', 'd'].includes(h.id))
      .forEach(h => h.dispose());

    // Should be able to reuse disposed IDs
    const newHandle1 = new EntityHandle('b');
    const newHandle2 = new EntityHandle('d');
    expect(newHandle1.id).toBe('b');
    expect(newHandle2.id).toBe('d');
  });
});
