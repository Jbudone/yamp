
import config from '$lib/config';
import Player from '$lib/player';

export const appState = $state({
    initialized: false,
    loading: true,
    error: null
});

// Main app / entrypoint
class App {
    private static instance: App;
    private player: Player;

    private constructor() {
        console.log('App instance created');
    }

    public static getInstance(): App {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    async initialize() {
        console.log('Initializing application...');

        try {
            // Set loading state
            appState.loading = true;

            // Initialize services, fetch initial data, etc.
            await this.initializeServices();
            await this.loadInitialData();

        await new Promise(resolve => setTimeout(resolve, 3000));

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
        this.player = new Player();
        await this.player.init();
    }

    private async initializeServices() {

        const response = await fetch('/api/hello');
        if (!response.ok) {
            throw new Error('Server sync failed');
        }

        const d = await response.json();
        console.log(d);
    }

    private async loadInitialData() {

        console.log('Loading initial data...');
        console.log(config);

        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Export the app
export const app = App.getInstance();
