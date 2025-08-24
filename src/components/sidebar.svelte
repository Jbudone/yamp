<script lang="ts">
import App, { appState } from '$lib/app.svelte';
import LibraryController from '$lib/libraryController.svelte';
import PlayerController from '$lib/playerController.svelte.ts';
import { DateTime } from 'luxon';

let onReady = $state(false);
$effect(() => {
    if (!onReady && appState.initialized) {
        initialize();
        onReady = true;
    }
});

$effect(() => {
    //if (playerState.activeSong && table.initialized) {
        //const cdnPath = playerState.activeSong;
        //const songId = parseInt(cdnPath.substr(cdnPath.indexOf('_') + 1), 10);
        //setActiveSong(songId);
    //}
});

const initialize = () => {

};

const filterText = (e) => {
    const text = e.target.value;
    LibraryController.filterText(text);
};

</script>

<div id='sidebar' class='mx-4 mt-10'>
<div id='playlists' class=''>
<input type='text' id='libraryTextFilter' on:input={filterText} class='bg-transparent rounded-3xl h-8 w-full p-4 border-2 text-slate-0 border-slate-800 ' />
</div>
</div>

<style>
:global {

#libraryTextFilter:focus {
    border: none;
}
}
</style>

