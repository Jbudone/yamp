<script lang="ts">
import App, { appState } from '$lib/app.svelte';
import LibraryController from '$lib/libraryController.svelte';

import HyperList from 'hyperlist';
import u from 'umbrellajs';

let onReady = $state(false);
$effect(() => {
    console.log("MediaPlaylist: effect");
    if (!onReady && appState.initialized) {
        onReady = true;
        initialize();
    }
});

const clickedSong = (songRow) => {
    console.log(songRow.song_name);
    App.clickedSong(songRow);
};

const initialize = () => {

    // FIXME: cleanup
    const libraryEl = document.getElementById('library');
    const lits = HyperList.create(libraryEl, {
        itemHeight: 30,
        total: 1000,

        generate(index) {
            const songRow = LibraryController.getSongAt(index);
            const songTitle = songRow.song_name;

            const el = document.createElement('div');

            const songElA = u('<a>')
              .addClass('songTitle')
              .attr('href', '#')
              .on('click', (evt) => {
                  clickedSong(songRow);
                  evt.preventDefault();
                  return false;
              })
              .text(songTitle);

            u(el).append(songElA);

            return el;
        }
    });
};

</script>

MEDIA PLAYLIST
<div id='library'></div>

<style>
#library {
height: 300px !important;
}
</style>

