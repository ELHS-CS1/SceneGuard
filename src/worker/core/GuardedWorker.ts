// GuardedWorker.ts
/// <reference lib="webworker" />

import { GuardedAPI } from '../api/GuardedAPI';
import type { WorkerMessage } from '../../shared/types/types';

const loadedScripts = new Set<string>();

function validateScriptUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function handleMessage(data: WorkerMessage): void {
  try {
    switch (data.type) {
      case 'loadScript': {
        if (!validateScriptUrl(data.url)) {
          throw new Error('Invalid script URL');
        }
        
        if (loadedScripts.has(data.url)) {
          console.warn(`Script ${data.url} is already loaded`);
          postMessage({ type: 'scriptLoaded', url: data.url });
          return;
        }

        importScripts(data.url);
        loadedScripts.add(data.url);
        postMessage({ type: 'scriptLoaded', url: data.url });
        break;
      }

      case 'createMesh': {
        const handle = GuardedAPI.createMesh(data.options);
        if (!handle) {
          throw new Error('Failed to create mesh');
        }
        break;
      }

      case 'addBehavior': {
        const { entityId, behavior } = data;
        const entity = GuardedAPI.getEntity(entityId);
        if (!entity) {
          throw new Error(`Entity ${entityId} not found`);
        }
        GuardedAPI.addBehavior(entity, behavior);
        break;
      }

      case 'registerObserver': {
        const { entityId, observerId, observableType } = data;
        const entity = GuardedAPI.getEntity(entityId);
        if (!entity) {
          throw new Error(`Entity ${entityId} not found`);
        }
        GuardedAPI.observe(entity, observableType, (value) => {
          postMessage({
            type: 'observable',
            observerId,
            entityId,
            value
          });
        });
        break;
      }

      case 'observable':
      case 'error':
      case 'scriptLoaded': {
        // These are response messages, not meant to be handled by the worker
        console.warn(`Received response message type '${data.type}' in worker`);
        break;
      }

      default: {
        const exhaustiveCheck: never = data;
        throw new Error(`Unhandled message type: ${(exhaustiveCheck as WorkerMessage).type}`);
      }
    }
  } catch (error) {
    postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      source: data.type
    });
  }
}

addEventListener('message', ({ data }) => handleMessage(data));
