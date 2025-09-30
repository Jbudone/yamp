import config from '$lib/config';
import DBController from '$lib/dbController.svelte.ts';
import { DateTime } from 'luxon';
import * as Utilities from '$lib/utilities.svelte.ts';
import EventEmitter from 'eventemitter3';

class LibraryController {
    private static instance: LibraryController;
    public EE: EventEmitter;

    private library;
    private activeView;

    public filters: object;

    public SORT_NONE = 0;
    public SORT_TITLE = 1;

    public SORT_ASCEND = 0;
    public SORT_DESCEND = 1;

    public static get Instance(): LibraryController {
        return this.instance || (this.instance = new LibraryController());
    }

    async initialize() {
        this.EE = new EventEmitter();
        DBController.EE.on('libraryUpdated', this.onLibraryUpdated, this);


        this.filters = {
            text: "",
            sort: this.SORT_NONE,
            sortOrder: this.SORT_ASCEND
        };


        // initial library load (only what's stored locally)
        this.library = await DBController.getLocalLibrary();
        this.setupLibrary();
        this.filterView();
        this.EE.emit('libraryUpdated');
    }

    async postInitialize() {
        // sync library w/ cloud
        this.library = await DBController.getLibrary();
        this.setupLibrary();
        this.filterView();

        this.EE.emit('libraryUpdated');
    }

    private setupLibrary() {
        for (let i = 0; i < this.library.length; ++i) {

            // Format duration
            const song = this.library[i];
            song.duration = Utilities.formatTime(song.duration);

            // Format dates
            song.datePlayed = DateTime.fromSeconds(song.datePlayed).toFormat('MM/dd/yyyy h:mm:ss a');
            song.dateAdded = DateTime.fromSeconds(song.dateAdded).toFormat('MM/dd/yyyy h:mm:ss a');
        }
    }
    
    private filterView() {
        let textFilterPattern = new RegExp(this.filters.text, "i");
        this.activeView = this.library.filter((s) => {
            return s.name.match(textFilterPattern) != null ||
                s.artist.match(textFilterPattern);
        });

        if (this.filters.sort === this.SORT_TITLE) {
            this.activeView.sort((a, b) => {
                return (
                    (a.name.toLowerCase() > b.name.toLowerCase() && this.filters.sortOrder == this.SORT_ASCEND) ||
                    (a.name.toLowerCase() < b.name.toLowerCase() && this.filters.sortOrder == this.SORT_DESCEND)
                );
            });
        }
    }

    public filterText(text) {
        this.filters.text = text;
        this.filterView();
        this.onLibraryViewChanged();
    }

    public filterSort(filterType) {
        if (this.filters.sort != filterType) {
            this.filters.sort = filterType;
            this.filters.sortOrder = this.SORT_DESCEND;
        } else {
            this.filters.sortOrder = (this.filters.sortOrder == this.SORT_ASCEND ? this.SORT_DESCEND : this.SORT_ASCEND);
        }
        this.filterView();
        this.onLibraryViewChanged();
    }

    public getSongAt(idx) {
        if (idx < 0 || idx >= this.activeView.length) throw new Error("Bad index");
        return this.activeView[idx];
    }

    public totalSongs() {
        return this.activeView.length;
    }

    public getNextSongAfter(songId) {
        if (this.activeView.length == 0) {
            return -1;
        }

        let songIdx = 0;
        for (let i = 0; i < this.activeView.length; ++i) {
            let thisSongId = this.activeView[i].cdnpath;
            //let thisSongId = parseInt(thisSongPath.substr(thisSongPath.indexOf('_') + 1));
            if (thisSongId == songId) {
                songIdx = (i + 1) % this.activeView.length;
                break;
            }
        }

        return this.activeView[songIdx].cdnpath;
    }

    public getPrevSongAfter(songId) {
        if (this.activeView.length == 0) {
            return -1;
        }

        let songIdx = 0;
        for (let i = 0; i < this.activeView.length; ++i) {
            let thisSongId = this.activeView[i].cdnpath;
            //let thisSongId = parseInt(thisSongPath.substr(thisSongPath.indexOf('_') + 1));
            if (thisSongId == songId) {
                songIdx = (i == 0 ? this.activeView.length - 1 : (i - 1) % this.activeView.length);
                break;
            }
        }

        return this.activeView[songIdx].cdnpath;
    }

    public GetDataView() {
        return this.activeView;
    }

    async onLibraryUpdated() {
        // Only fetch local library -- local change made already
        this.library = await DBController.getLocalLibrary();
        this.setupLibrary();
        this.filterView();

        this.EE.emit('libraryUpdated');
    }

    async onLibraryViewChanged() {
        this.EE.emit('libraryViewChanged');
    }
}

export default LibraryController.Instance;
