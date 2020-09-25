const DEFAULT_STORAGE_KEY = 'DEFAULT_STORAGE_KEY';
const TUTORIAL_KEY = 'TUTORIAL_INFO';

export class DataStorage {
  constructor(key = DEFAULT_STORAGE_KEY, storage = window.localStorage) {
    this.storage = storage;
    this.key = key;
  }

  get _storage() {
    const data = this.storage.getItem(this.key);

    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }

  set _storage(data) {
    if (!data) {
      this.storage.removeItem(this.key);
      return;
    }

    let value = data;

    if (data && typeof data === 'object') {
      value = JSON.stringify(data);
    }

    this.storage.setItem(this.key, value);
  }

  getStorageItem(storageItemKey) {
    if (!storageItemKey) {
      console.error('invalid storage item key');
      return null;
    }

    return this._storage[storageItemKey];
  }

  setStorageItem(storageItemKey, value) {
    if (!storageItemKey) {
      console.error('invalid storage item key');
      return;
    }

    this._storage = {
      ...this._storage,
      [storageItemKey]: value,
    };
  }

  removeStorageItem(storageItemKey) {
    if (!storageItemKey) {
      console.error('invalid storage item key');
      return;
    }

    const nextStorage = { ...this._storage };
    delete nextStorage[this.key];
    this._storage = nextStorage;
  }
}

export const dataStorage = new DataStorage(TUTORIAL_KEY);
