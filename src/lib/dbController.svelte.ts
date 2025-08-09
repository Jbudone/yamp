import config from '$lib/config';
import EventEmitter from 'eventemitter3';


const INDEXEDDB_CACHESWEEP_INTERVAL = 30000;
const TABLENAME_RESOURCES = 'cachedResources';
const TABLENAME_META = 'cacheMeta';

class DBController {
    private static instance: DBController;
    public EE: EventEmitter;

    private db : IDBDatabase;

    public static get Instance(): DBController {
        return this.instance || (this.instance = new DBController());
    }

    private pendingClean;

    async initialize() {
        console.log(config);
        this.EE = new EventEmitter();

        await (new Promise((resolve, reject) => {
            const dbInitRequest = indexedDB.open('yamp', config.INDEXEDDB_VER);

            dbInitRequest.onsuccess = (e) => {
                this.db = dbInitRequest.result;
                window['db'] = this.db;
                resolve();
            };

            dbInitRequest.onerror = (e) => {
                console.error(e);
                reject();
            };

            dbInitRequest.onupgradeneeded = (e) => {
                // initial creation or version change
                let db = e.target.result;
                let pendingOps = 0;

                ++pendingOps;
                if (db.objectStoreNames.contains(TABLENAME_RESOURCES)) db.deleteObjectStore(TABLENAME_RESOURCES);
                const cacheStore = db.createObjectStore(TABLENAME_RESOURCES, { keyPath: "songIdAndResource" });
                cacheStore.createIndex('songId', 'songId', { unique: false });
                cacheStore.createIndex('resource', 'resource', { unique: false });

                ++pendingOps;
                if (db.objectStoreNames.contains(TABLENAME_META)) db.deleteObjectStore(TABLENAME_META);
                const cacheMetaStore = db.createObjectStore(TABLENAME_META, { keyPath: "songId" });
                cacheMetaStore.createIndex('songId', 'songId', { unique: false });
                cacheMetaStore.createIndex('datePlayed', 'datePlayed', { unique: false });
                cacheMetaStore.createIndex('size', 'size', { unique: false });

                const onPendingFinished = () => {
                    if (--pendingOps == 0) {
                        this.db = db;
                        resolve();
                    }
                };

                cacheStore.transaction.oncomplete = onPendingFinished;
                cacheMetaStore.transaction.oncomplete = onPendingFinished;
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
            const request = this.db.transaction([TABLENAME_RESOURCES], 'readonly').objectStore(TABLENAME_RESOURCES).get(`${songId}-${resource}`);
            request.onerror = (e) => {
                resolve(false);
            };

            request.onsuccess = (e) => {
                resolve(request.result?.data);
            };
        });
    }

    public async getMeta(songId) {
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([TABLENAME_META], 'readonly').objectStore(TABLENAME_META).get(`${songId}`);
            request.onerror = (e) => {
                resolve(null);
            };

            request.onsuccess = (e) => {
                resolve(request.result);
            };
        });
    }

    public async addCache(songId, resource, data) {
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([TABLENAME_RESOURCES], 'readwrite').objectStore(TABLENAME_RESOURCES).add({
                songIdAndResource: `${songId}-${resource}`,
                songId: songId,
                resource: resource,
                data: data
            });

            request.onerror = (e) => {
                resolve(false);
            };

            request.onsuccess = async (e) => {
                const resourceSize = data.length;
                const meta = await this.getMeta(songId);

                let totalSize = (meta ? meta.size : 0) + resourceSize;
                let requestMeta = this.db.transaction([TABLENAME_META], 'readwrite').objectStore(TABLENAME_META).put({
                    songId: songId,
                    datePlayed: Date.now(),
                    size: totalSize
                });

                requestMeta.onerror = (e) => {
                    resolve(false);
                };

                requestMeta.onsuccess = (e) => {
                    this.queueCleanCache();
                    resolve(true);
                };
            };
        });
    }

    public async queueCleanCache() {
        if (this.pendingClean) return;

        this.pendingClean = setTimeout(async () => {
            this.cleanCache();
            this.pendingClean = null;
        }, INDEXEDDB_CACHESWEEP_INTERVAL);
    };

    public async cleanCache() {
        console.log("Sweeping cache");

        const requestMeta = this.db.transaction([TABLENAME_META], 'readwrite').objectStore(TABLENAME_META).getAll();
        requestMeta.onsuccess = async (e) => {
            const results = e.target.result;
            results.sort((a, b) => { return a.datePlayed < b.datePlayed; }); // sorted datePlayed descending
            let totalUsage = 0;
            for (let i = 0; i < results.length; ++i) {
                totalUsage += results[i].size;
                if (totalUsage > config.INDEXEDDB_MAXSIZE) {

                    const _db = this.db; // FIXME: yuck
                    await new Promise((resolve) => {
                        const cursorRequest = _db.transaction([TABLENAME_RESOURCES], 'readwrite').objectStore(TABLENAME_RESOURCES).index('songId').openCursor(IDBKeyRange.only(results[i].songId));
                        cursorRequest.onsuccess = function(event) {
                            const cursor = event.target.result;
                            if (cursor) {
                                // Delete the current record
                                cursor.delete();
                                console.log(`Deleting song cached resource: ${cursor.primaryKey}`);

                                // Move to the next record
                                cursor.continue();
                            } else {
                                _db.transaction([TABLENAME_META], 'readwrite').objectStore(TABLENAME_META).delete(results[i].songId);
                                resolve();
                            }
                        };
                    });

                    console.log(`Removed song cache: ${results[i].songId} - ${results[i].size} bytes`);
                }
            }
        };
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
