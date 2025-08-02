import config from '$lib/config';
import EventEmitter from 'eventemitter3';

class DBController {
    private static instance: DBController;
    public EE: EventEmitter;

    private db : IDBDatabase;

    public static get Instance(): DBController {
        return this.instance || (this.instance = new DBController());
    }

    async initialize() {
        console.log(config);
        this.EE = new EventEmitter();

        await (new Promise((resolve, reject) => {
            const dbInitRequest = indexedDB.open('yamp', config.INDEXEDDB_VER);

            dbInitRequest.onsuccess = (e) => {
                this.db = dbInitRequest.result;
                resolve();
            };

            dbInitRequest.onerror = (e) => {
                console.error(e);
                reject();
            };

            dbInitRequest.onupgradeneeded = (e) => {
                // initial creation or version change
                let db = e.target.result;

                const cacheStore = db.createObjectStore('cachedResources', { keyPath: "songIdAndResource" });
                cacheStore.createIndex('songId', 'songId', { unique: false });
                cacheStore.createIndex('resource', 'resource', { unique: false });

                cacheStore.transaction.oncomplete = (e) => {
                    this.db = db;
                    resolve();
                };
            };
        }));
    }

    public async getLibrary() {

        const response = await fetch('/api/hello');
        if (!response.ok) {
            throw new Error('Server sync failed');
        }

        const resJson = await response.json();
        return resJson;
    }

    public async getCache(songId, resource) {
        return new Promise((resolve, reject) => {
            const request = this.db.transaction(['cachedResources'], 'readonly').objectStore('cachedResources').get(`${songId}-${resource}`);
            request.onerror = (e) => {
                resolve(false);
            };

            request.onsuccess = (e) => {
                resolve(request.result?.data);
            };
        });
    }

    public async addCache(songId, resource, data) {
        return new Promise((resolve, reject) => {
            const request = this.db.transaction(['cachedResources'], 'readwrite').objectStore('cachedResources').add({
                songIdAndResource: `${songId}-${resource}`,
                songId: songId,
                resource: resource,
                data: data
            });
            request.onerror = (e) => {
                resolve(false);
            };

            request.onsuccess = (e) => {
                resolve(true);
            };
        });
    }

    public async updateSongPlayed(songId) {

        const response = await fetch(`/api/updateSongPlayed/${songId}`);
        if (!response.ok) {
            throw new Error('Server sync failed');
        }

        this.EE.emit('libraryUpdated');
    }
}

export default DBController.Instance;
