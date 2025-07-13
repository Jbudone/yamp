// FIXME: svelte protection measure prevents src/lib/server* from going into client code. I think that's a bug and its supposed to be src/lib/server/* 
import config from '$lib/config';

class ServerController {
    private static instance: ServerController;

    public static get Instance(): ServerController {
        return this.instance || (this.instance = new ServerController());
    }

    async initialize() {
        console.log(config);

        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private async getLibrary() {

        const response = await fetch('/api/hello');
        if (!response.ok) {
            throw new Error('Server sync failed');
        }

        const resJson = await response.json();
        return resJson;
    }
}

export default ServerController.Instance;
