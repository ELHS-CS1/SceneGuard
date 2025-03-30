// GuardedWorker.ts
/// <reference lib="webworker" />

import type { IErrorMessage, IGuardedAPIStatic, WorkerMessage } from '../../shared/types/types';
import { GuardedAPI } from '../api/GuardedAPI';

const loadedScripts = new Set<string>();

function validateScriptUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function loadScript(url: string): Promise<void> {
  if (!validateScriptUrl(url)) {
    throw new Error('Invalid script URL');
  }

  if (loadedScripts.has(url)) {
    console.warn(`Script ${url} is already loaded`);
    postMessage({ type: 'scriptLoaded', url });
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch script: ${response.statusText}`);
    }
    const scriptContent = await response.text();

    const scriptFunction = new Function('GuardedAPI', scriptContent);
    scriptFunction(GuardedAPI as IGuardedAPIStatic);

    loadedScripts.add(url);
    postMessage({ type: 'scriptLoaded', url });
  } catch (error) {
    throw new Error(
      `Failed to load script: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleMessage(data: WorkerMessage): Promise<void> {
  try {
    switch (data.type) {
      case 'loadScript': {
        await loadScript(data.url);
        break;
      }

      case 'createMesh':
      case 'addBehavior':
      case 'registerObserver':
      case 'disposeEntity':
      case 'unobserve':
        console.warn(
          `[GuardedWorker] Received API call message '${data.type}'. Should be handled by main thread bridge.`
        );
        break;

      case 'observable':
      case 'error':
      case 'scriptLoaded':
        break;

      default: {
        const exhaustiveCheck: never = data;
        throw new Error(
          `[GuardedWorker] Unhandled message type: ${(exhaustiveCheck as WorkerMessage).type}`
        );
      }
    }
  } catch (error) {
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'workerInternal',
    } as IErrorMessage);
  }
}

addEventListener('message', ({ data }) => handleMessage(data as WorkerMessage));
