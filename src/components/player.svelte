<script lang="ts">
import { app, appState } from '$lib/app.svelte';
import { onMount } from 'svelte';

import AudioMotionAnalyzer from 'audiomotion-analyzer';

onMount(async () => {

    // Player page: initialize the player
    await app.initializePlayer();

    // FIXME: cleanup
    const audioMotion = new AudioMotionAnalyzer(
        document.getElementById('audioMotion'),
        {
            source: document.getElementById('videoPlayer'),
  "alphaBars": false,
  "ansiBands": false,
  "barSpace": 0.25,
  "bgAlpha": 0.7,
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
  "overlay": false,
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

</script>

<video id="videoPlayer" controls autoplay></video>
<div id='audioMotion'></div>

PLAYER

<style>
</style>

