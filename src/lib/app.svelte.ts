import config from '$lib/config';
import PlayerController from '$lib/playerController.svelte.ts';
import DBController from '$lib/dbController.svelte.ts';
import LibraryController from '$lib/libraryController.svelte.ts';

export const appState = $state({
    initialized: false,
    loading: true,
    error: null
});

// Main app / entrypoint
class App {
    private static instance: App;

    private constructor() {
        console.log('App instance created');
    }

    public static get Instance(): App {
        return this.instance || (this.instance = new App());
    }

    async initialize() {
        console.clear();
        console.log('Initializing application...');

        try {
            // Set loading state
            appState.loading = true;
            await DBController.initialize();

            await LibraryController.initialize();
            await this.initializePlayer();

            // Mark as initialized
            appState.loading = false;
            appState.initialized = true;

            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            appState.loading = false;
            appState.error = error instanceof Error ? error.message : 'Unknown error' 
        }
    }

    async initializePlayer() {
        await PlayerController.init();

        PlayerController.EE.on('playingSong', this.onStartPlayingSong, this);
        PlayerController.EE.on('songFinished', this.onFinishedPlayingSong, this);
    }

    public async clickedSong(songRow) {
        PlayerController.playSong(songRow.cdnpath);
    }

    private async onStartPlayingSong(cdnPath) {
        console.log(`App: onStartPlayingSong ${cdnPath}`);

        document.title = "playing";
    }

    private async onFinishedPlayingSong() {
        console.log(`App: onFinishedPlayingSong`);
    }
}

export default App.Instance;
