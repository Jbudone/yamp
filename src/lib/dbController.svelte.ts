import config from '$lib/config';

class DBController {
    private static instance: DBController;

    public static get Instance(): DBController {
        return this.instance || (this.instance = new DBController());
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

export default DBController.Instance;
