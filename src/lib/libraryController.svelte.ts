import config from '$lib/config';
import DBController from '$lib/dbController.svelte.ts';

class LibraryController {
    private static instance: LibraryController;

    private library;

    public static get Instance(): LibraryController {
        return this.instance || (this.instance = new LibraryController());
    }

    async initialize() {
        this.library = await DBController.getLibrary();
    }

    public getSongAt(idx) {
        if (!this.library) throw new Error("Library not ready yet");
        if (!this.library[idx]) throw new Error("Bad index");
        return this.library[idx];
    }
}

export default LibraryController.Instance;
