<script lang="ts">
import App, { appState } from '$lib/app.svelte';
import LibraryController from '$lib/libraryController.svelte';
import PlayerController from '$lib/playerController.svelte.ts';
import DBController from '$lib/dbController.svelte.ts';
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

const clickedClearCache = (e) => {
    DBController.clearCache();
};

const clearFilterText = (e) => {
    document.getElementById('libraryTextFilter').value = '';
    LibraryController.filterText("");
};

</script>

<div id='sidebar' class='mx-4 mt-10'>
<div id='playlists' class=''>
    <div id='libraryTextFilterContainer' class='flex'>
        <input type='text' id='libraryTextFilter' on:input={filterText} class='bg-transparent rounded-3xl h-8 w-full p-4 border-2 text-slate-0 border-slate-800 ' />
        <div id='controlsClearFilter' on:click={clearFilterText} class='-translate-x-9 translate-y-2'>
            <svg class="icon w-6 h-6 cursor-pointer"> <use href="icons.svg#icon-repeat"></use> </svg>
        </div>
    </div>
<div id="controlsClearCache" on:click={clickedClearCache}>
    <svg class="icon w-6 h-6 cursor-pointer"> <use href="icons.svg#icon-repeat"></use> </svg>
</div>
</div>
</div>

<style>
:global {

#libraryTextFilter:focus {
    border: none;
}
}
</style>

