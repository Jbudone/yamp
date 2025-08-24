<script lang="ts">
import App, { appState } from '$lib/app.svelte';
import { onMount } from 'svelte';
import * as Utilities from '$lib/utilities.svelte';
import PlayerController, { playerState } from '$lib/playerController.svelte';

import AudioMotionAnalyzer from 'audiomotion-analyzer';

onMount(async () => {

    // Player page: initialize the player
    await PlayerController.postInitSetup();

    // FIXME: cleanup
    const audioMotion = new AudioMotionAnalyzer(
        document.getElementById('audioMotion'),
        {
            source: document.getElementById('videoPlayer'),
  "alphaBars": false,
  "ansiBands": false,
  "barSpace": 0.25,
  "bgAlpha": 0.0,
  "channelLayout": "single",
  "colorMode": "bar-level",
  "fadePeaks": false,
  "fftSize": 8192,
  "fillAlpha": 0.25,
  "frequencyScale": "log",
  "gradient": "prism",
  "gravity": 3.8,
  "ledBars": false,
  "linearAmplitude": true,
  "linearBoost": 1.6,
  "lineWidth": 1.5,
  "loRes": false,
  "lumiBars": false,
  "maxDecibels": -25,
  "maxFPS": 0,
  "maxFreq": 16000,
  "minDecibels": -85,
  "minFreq": 30,
  "mirror": 0,
  "mode": 2,
  "noteLabels": false,
  "outlineBars": false,
  "overlay": true,
  "peakFadeTime": 750,
  "peakHoldTime": 500,
  "peakLine": false,
  "radial": false,
  "radialInvert": false,
  "radius": 0.3,
  "reflexAlpha": 1,
  "reflexBright": 1,
  "reflexFit": true,
  "reflexRatio": 0.5,
  "roundBars": true,
  "showBgColor": true,
  "showFPS": false,
  "showPeaks": false,
  "showScaleX": false,
  "showScaleY": false,
  "smoothing": 0.7,
  "spinSpeed": 1,
  "splitGradient": false,
  "trueLeds": true,
  "useCanvas": true,
  "volume": 1,
  "weightingFilter": "D"
        }
    );
});

const clickedPlayPause = (e) => {
    if (playerState.playing) {
        PlayerController.pauseSong();
    } else {
        PlayerController.resumeSong();
    }
};

const clickedLeft = (e) => {
    PlayerController.prevSong();
};

const clickedRight = (e) => {
    PlayerController.nextSong();
};

const clickedSeek = (e) => {
    let x = e.offsetX;
    let w = e.target.offsetWidth;
    let t = Math.floor((x / w) * playerState.totalTime);
    PlayerController.seekSong(t);
};

const clickedVolume = (e) => {
    let x = e.offsetX;
    let w = e.target.offsetWidth;
    let v = x / w;
    PlayerController.setVolume(v);
};

const clickedVolMute = (e) => {
    if (playerState.volume == 0) {
        PlayerController.setVolume(1);
    } else {
        PlayerController.setVolume(0);
    }
};

const clickedRepeat = (e) => {

};

</script>

<style>
:global(progress::-moz-progress-bar,progress::-webkit-progress-value) {
    background-color:crimson;
    border-radius: 40px;
}
</style>


<div id='audioMotion'></div>
<video id="videoPlayer" controls class="hidden"></video>
<div id="musicPlayer" class="px-10">
    <div id="playerBody" class="flex items-center mt-4">
        <div id="playerControlsMain" class="flex flex-1 mb-2 w-full justify-center">
            <div id="controlsPrev" on:click={clickedLeft}>
                <svg transform="scale(-1,1)" class="icon w-16 h-16 cursor-pointer"> <use href="icons.svg#icon-forward"></use> </svg>
            </div>
            <div id="controlsPlay" on:click={clickedPlayPause} class="">
                <svg class="icon w-14 h-14 p-1 pl-2 mx-5 rounded-full bg-slate-900 cursor-pointer"> <use href="icons.svg#icon-{playerState.playing ? 'pause' : 'play'}"></use> </svg>
            </div>
            <div id="controlsNext" on:click={clickedRight}>
                <svg class="icon w-16 h-16 cursor-pointer"> <use href="icons.svg#icon-forward"></use> </svg>
            </div>
        </div>
        <div id="playerControlsMinor" class="flex -mb-8 self-center absolute right-10">
            <div id="controlsRepeat" on:click={clickedRepeat}>
                <svg class="icon w-6 h-6 cursor-pointer"> <use href="icons.svg#icon-repeat"></use> </svg>
            </div>
            <div id="controlsVolIcon" on:click={clickedVolMute} class="mx-6">
                <svg class="icon w-6 h-6 cursor-pointer"> <use href="icons.svg#icon-{playerState.volume == 0 ? 'volume' : 'mute'}"></use> </svg>
            </div>
            <progress id="controlsVol" on:click={clickedVolume} class="w-20 h-3 bg-black rounded-lg cursor-pointer mt-2" value="{playerState.volume * 100}" max="100"></progress>
        </div>
    </div>
    <div id="playerFooter" class="flex flex-col items-center">
        <progress id="controlsSeek" on:click={clickedSeek} class="w-full h-6 bg-black rounded-full cursor-pointer" value="{playerState.curTime}" max="{playerState.totalTime > 0 ? playerState.totalTime : 1}"></progress>
        <div id="controlsTime" class="-my-6">
    {Utilities.formatTime(playerState.curTime)} / {Utilities.formatTime(playerState.totalTime)}
        </div>
    </div>
</div>
