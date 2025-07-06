<script lang="ts">
import { onMount } from 'svelte';
import { app, appState } from '$lib';

onMount(async () => {
    // Player page: initialize the player
    await app.initializePlayer();
});
</script>

<h1>Welcome!!! to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

    <video id="videoPlayer" controls autoplay></video>
