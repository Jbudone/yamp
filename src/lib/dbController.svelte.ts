import config from '$lib/config';
import EventEmitter from 'eventemitter3';
import * as Utilities from '$lib/utilities.svelte.ts';


const INDEXEDDB_CACHESWEEP_INTERVAL = 30000;
const TABLENAME_RESOURCES = 'cachedResources';
const TABLENAME_META = 'cacheMeta';
const TABLENAME_LIBRARY = 'library';

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
                debugger;
                console.log("initial creation or version change of indexedDB");
                let db = e.target.result;
                let pendingOps = 0;

                // Resources (cached song segments)
                ++pendingOps;
                if (db.objectStoreNames.contains(TABLENAME_RESOURCES)) db.deleteObjectStore(TABLENAME_RESOURCES);
                const cacheStore = db.createObjectStore(TABLENAME_RESOURCES, { keyPath: "songIdAndResource" });
                cacheStore.createIndex('songId', 'songId', { unique: false });
                cacheStore.createIndex('resource', 'resource', { unique: false });

                // Metadata (song metadata)
                ++pendingOps;
                if (db.objectStoreNames.contains(TABLENAME_META)) db.deleteObjectStore(TABLENAME_META);
                const cacheMetaStore = db.createObjectStore(TABLENAME_META, { keyPath: "songId" });
                cacheMetaStore.createIndex('songId', 'songId', { unique: false });
                cacheMetaStore.createIndex('datePlayed', 'datePlayed', { unique: false });
                cacheMetaStore.createIndex('size', 'size', { unique: false });

                // Library
                ++pendingOps;
                if (db.objectStoreNames.contains(TABLENAME_LIBRARY)) db.deleteObjectStore(TABLENAME_LIBRARY);
                const libraryStore = db.createObjectStore(TABLENAME_LIBRARY, { keyPath: "songId" });
                libraryStore.createIndex('songId', 'songId', { unique: false });
                libraryStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                libraryStore.createIndex('datePlayed', 'datePlayed', { unique: false });
                libraryStore.createIndex('dateUpdated', 'dateUpdated', { unique: false });
                libraryStore.createIndex('playCount', 'playCount', { unique: false });
                libraryStore.createIndex('duration', 'duration', { unique: false });
                libraryStore.createIndex('name', 'name', { unique: false });
                libraryStore.createIndex('artist', 'artist', { unique: false });
                libraryStore.createIndex('album', 'album', { unique: false });
                libraryStore.createIndex('year', 'year', { unique: false });
                libraryStore.createIndex('cdnpath', 'cdnpath', { unique: false });

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

        let localLibrary = await this.getLocalLibrary();
        let library = null;
        if (localLibrary) {
            library = localLibrary;

            // what's our most recent local update?
            let latest = 0;
            for (let i = 0; i < localLibrary.length; ++i) {
                const song = localLibrary[i];
                const dateUpdated = song.dateUpdated;
                const datePlayed = song.datePlayed;
                if (dateUpdated > latest) latest = dateUpdated;
                if (datePlayed > latest) latest = datePlayed;
            }

            // Fetch latest from cloud
            const response = await fetch(`/api/helloAfter/${latest}`);
            if (!response.ok) {
                throw new Error('Server sync failed');
            }


            // merge
            const responseJson = await response.json();
            let updatedSongs = [];
            for (let i = 0; i < responseJson.length; ++i) {
                const entry = responseJson[i];
                updatedSongs.push(entry);

                let existingEntryIdx = library.findIndex((e) => e.songId == entry.songId);
                if (existingEntryIdx >= 0) {
                    library[existingEntryIdx] = entry;
                } else {
                    library.push(entry);
                }
            }

            // write updates
            if (responseJson.length > 0) {
                await this.addSongs(updatedSongs);
            }
        } else {
            // initial fetch
            const response = await fetch('/api/hello');
            if (!response.ok) {
                throw new Error('Server sync failed');
            }

            const resJson = await response.json();

            // translate
            library = [];
            for (let i = 0; i < resJson.length; ++i) {
                const entry = resJson[i];
                library.push(entry);
            }

            await this.addSongs(library);
        }

        return library;
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

    public async getLocalLibrary() {
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([TABLENAME_LIBRARY], 'readonly').objectStore(TABLENAME_LIBRARY).getAll();
            request.onerror = (e) => {
                resolve(null);
            };

            request.onsuccess = (e) => {
                resolve(e.target.result);
            };
        });
    }

    public async addSongs(songs) {
        return new Promise((resolve, reject) => {

            const transaction = this.db.transaction([TABLENAME_LIBRARY], 'readwrite');
            const objectStore = transaction.objectStore(TABLENAME_LIBRARY);

            for (let i = 0; i < songs.length; ++i) {
                const song = songs[i];

                // song already exist?
                const getRequest = objectStore.get(song.songId);
                getRequest.onerror = (e) => { console.error(`Error getting song ${song.songId}: ` + e.target.error); };

                getRequest.onsuccess = (e) => {
                    const existingEntry = e.target.result;
                    if (existingEntry) {
                        // song exists: update
                        const updateRequest = objectStore.put(song);
                        updateRequest.onsuccess = (e) => { console.log(`Updated song ${song.songId}`); };
                        updateRequest.onerror = (e) => { console.error(`Error updating song ${song.songId}: ` + e.target.error); };
                    } else {
                        // does not exist: insert
                        const insertRequest = objectStore.add(song);
                        insertRequest.onsuccess = (e) => { console.log(`Inserted song ${song.songId}`); };
                        insertRequest.onerror = (e) => { console.error(`Error inserting song ${song.songId}: ` + e.target.error); };
                    }
                };
            }

            transaction.oncomplete = resolve;
            transaction.onerror = (e) => {
                console.error(`Transaction error: ` + e.target.error);
                resolve(false);
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
