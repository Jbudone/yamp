// FIXME: dashjs uses window which is not defined in node; we can't bundle dashjs. We tried to fix this by loading dynamically (rather than import at the top), but
//  that didn't work iirc. I don't know what changed but suddenly this isn't a problem. If we figure this out or the issue never arises again we can remove this comment
import { MediaPlayer } from 'dashjs';
import EventEmitter from 'eventemitter3';

import config from '$lib/config';
import App from '$lib/app.svelte';
import DBController from '$lib/dbController.svelte.ts';
import LibraryController from '$lib/libraryController.svelte';

export const playerState = $state({
    activeSong: null,
    playing: false,
    totalTime: 0,
    curTime: 0,

    volume: 1
});


class PlayerController {

    private instance: player;
    public EE: EventEmitter;

    private cdnPathToken: object; // FIXME: we should sign the basePath / since otherwise this will have to recalculate for every song

    private constructor() {
        console.log('Player instance created');

        this.cdnPathToken = {};
    }

    public static get Instance(): PlayerController {
        return this.instance || (this.instance = new PlayerController());
    }


    async init() {
        this.EE = new EventEmitter();


        this.player = MediaPlayer().create();

        // FIXME: hardcoded song for testing
        //playerState.activeSong = 'song_5294';
        localStorage.clear(); // FIXME: for debugging
    }

    async postInitSetup() {

        //const url = await this.buildURLPath(playerState.activeSong, 'manifest.mpd');
        this.player.initialize(document.querySelector('video'));//, url, true);

        // Request Interceptor
        // We replace CDN requests with cached segments in indexedDB if available
        const interceptorRequest: RequestInterceptor = async (request: CommonMediaRequest) => {

            //console.log(`Requesting chunk ${request.url.substr(request.url.lastIndexOf('/') + 1)}`);
            const u = new URL(request.url);
            const resource = u.pathname.substr(u.pathname.lastIndexOf('/')+1);
            request.customData.resource = resource;

            // DB Cache if available
            const cachedResource = await DBController.getCache(playerState.activeSong, resource);
            if (cachedResource) {
                const blob = new Blob([cachedResource], {type: 'application/dash+xml'});
                const manifestUrl = URL.createObjectURL(blob);
                request.url = manifestUrl;
                request.customData.yampCache = resource;
                //console.log(`Using Cached Chunk: ${playerState.activeSong}-${resource}`);
                return Promise.resolve(request);
            }


            request.url = await this.buildURLPath(playerState.activeSong, resource);
            console.log(request.url);
            return Promise.resolve(request)
        }

        const interceptorResponse: ResponseInterceptor = (response: CommonMediaResponse) => {
            if (!response.headers) {
                response.headers = {}
            }

            response.headers['response-interceptor'] = 'true'; // FIXME: Is this needed? Do we need one for request too?

            let url = response.url;
            if (!url) {
                // FIXME: I don't understand why this is null sometimes
                //debugger;
                return Promise.resolve(response);
            }

            let isBlob = response.url.indexOf("blob:") >= 0;
            let isM4s = response.url.indexOf('m4s') >= 0;

            // FIXME: for debugging blob
            let COMPARE_BLOB_AGAINST_LOCALSTORAGE = false;

            // Convert blob format
            if (isBlob) {
                const blob1 = new Uint8Array(response.data);
                let blob2 = "";
                for (let i = 0; i < blob1.length; ++i) {
                    blob2 += String.fromCharCode(blob1[i]);
                }

                blob2 = atob(blob2);
                const blob3 = new ArrayBuffer(blob2.length);
                const blobView = new Uint8Array(blob3);
                for (let i = 0; i < blobView.length; ++i) {
                    blobView[i] = blob2.charCodeAt(i);
                }

                response.data = blob3;
            }

            if (localStorage[url] && (!isBlob || COMPARE_BLOB_AGAINST_LOCALSTORAGE)) {

                // FIXME: confirm response matches what we cached; or is there anything else in response that we need to hack in when using blob?
                //debugger;
                if (isBlob) {

                    // FIXME: for debugging
                    if (COMPARE_BLOB_AGAINST_LOCALSTORAGE) {
                        response.url = localStorage[response.url];
                    }
                }

                // Compare against localStorage
                //console.log(response.url);
                const cachedResponse = localStorage[response.url];
                const cachedResponse2 = atob(cachedResponse);
                const cachedResponse3 = new ArrayBuffer(cachedResponse2.length);
                const view = new Uint8Array(cachedResponse3);
                for (let i = 0; i < cachedResponse2.length; ++i) {
                    view[i] = cachedResponse2.charCodeAt(i);
                }

                const view2 = new Uint8Array(response.data);
                if (cachedResponse3.byteLength != response.data.byteLength) {
                    debugger;
                }

                for (let i = 0; i < view.length; ++i) {
                    if (view[i] != view2[i]) {
                        debugger;
                        break;
                    }
                }

                response.data = cachedResponse3;
                //console.log(response.url);
            }

            // Cache chunk
            // FIXME: cache non-m4s chunks too
            if (!response.request.customData.yampCache) {
            //if (!localStorage[url] && !isBlob && isM4s) {
                //console.log(`Caching chunk ${url.substr(url.lastIndexOf('/') + 1)}`);
                let responseData = response.data;
                if (response.data instanceof ArrayBuffer) {
                    const bytes = new Uint8Array(response.data); // FIXME: Can we ensure this is always an 8bit view?
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }

                    responseData = btoa(binary);
                    //localStorage[url] = responseData;
                    // FIXME: async op but ideally we don't wait on it
                    DBController.addCache(playerState.activeSong, response.request.customData.resource, responseData);
                } else {
                    //debugger; // FIXME: Only support binary segments now? non-binary will be different handling later
                }
            }

            return Promise.resolve(response)
        }

        this.player.addRequestInterceptor(interceptorRequest)
        this.player.addResponseInterceptor(interceptorResponse)
        this.player.on(MediaPlayer.events.PLAYBACK_ENDED, this.onSongFinished, this);
        this.player.on(MediaPlayer.events.PLAYBACK_TIME_UPDATED, this.onSongTimeUpdated, this);
        this.player.on(MediaPlayer.events.PLAYBACK_METADATA_LOADED, this.onSongMetadata, this);

        //this.player.play();
    }

    private getURLBasePath(songId) {
        return `/${songId}/`;
    }

    private async buildURLPath(songId, resource) {
        const signedURLPath = await this.getSignedURLPath(songId);
        const basePath = this.getURLBasePath(songId);
        return signedURLPath + basePath + resource;
    }

    private async getSignedURLPath(songId) {

        const securityKey = config.BUNNYCDN_GET_ACCESS_KEY!;
        const host = config.BUNNYCDN_GET_HOST!;

        const SIGNING_EXPIRATION = 14400; // 4 hours: medium lived token for infrequent re-auth

        let signedURLPath = "";
        const nowSec = Math.floor(Date.now() / 1000);
        if (this.cdnPathToken && this.cdnPathToken.songId == songId && nowSec < this.cdnPathToken.expires) {
            signedURLPath = this.cdnPathToken.signedURLPath;
        } else {
            // update signed token for song path
            const expirationTimeSec = nowSec + SIGNING_EXPIRATION;
            const basePath = this.getURLBasePath(songId);
            const signedToken = await this.signURLPath(securityKey, expirationTimeSec, basePath);
            signedURLPath = host + "/" + signedToken;
            this.cdnPathToken.signedURLPath = signedURLPath;
            this.cdnPathToken.songId = songId;
            this.cdnPathToken.expires = expirationTimeSec - 3; // Give some leeway for initial transit
        }

        return signedURLPath;
    }

    private async signURLPath(securityKey, expirationTimeSec, signaturePath) {

        const expires = expirationTimeSec;
        const hashableBase = securityKey + signaturePath + expires + 'token_path=' + signaturePath;

        const data = (new TextEncoder()).encode(hashableBase) 
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        const hashArray = new Uint8Array(hashBuffer);
        const base64String = btoa(String.fromCharCode(...hashArray));

        // BunnyCDN requires fixing up base64 string
        const token = base64String.replace(/\n/g, "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

        // isDirectory: Optional parameter - "true" returns a URL separated by forward slashes (exp. (domain)/bcdn_token=...)
        // NOTE: bcdn_token indicates the beginning portion of the URL is signed for the path, and the trailing portion is for the filepath
        return "bcdn_token=" + token + "&expires=" + expires + '&token_path=' + signaturePath.replace(/\//g, '%2F');
    }

    public async playSong(cdnPath) {
        playerState.activeSong = cdnPath;
        playerState.playing = true;
        const url = await this.buildURLPath(playerState.activeSong, 'manifest.mpd');
        this.player.attachSource(url);
        this.player.play();

        this.EE.emit('playingSong', cdnPath);
    }

    public async resumeSong() {

        if (playerState.activeSong == null) {
            // initial play
            this.EE.emit('clickedPlayWithNoSong');
            return;
        }

        playerState.playing = true;
        this.player.play();

        this.EE.emit('resumedSong');
    }

    public async pauseSong() {
        playerState.playing = false;
        this.player.pause();

        this.EE.emit('pausedSong');
    }

    public async prevSong() {
        
        if (playerState.activeSong == null) {
            // initial play
            return;
        }

        //let activeSongId = parseInt(playerState.activeSong.substr(playerState.activeSong.indexOf('_') + 1));
        let prevSongId = LibraryController.getPrevSongAfter(playerState.activeSong);
        if (prevSongId != -1) {
            playerState.activeSong = prevSongId;// `song_${nextSongId}`;
            this.playSong(playerState.activeSong);
        }
    }

    public async nextSong() {
        
        if (playerState.activeSong == null) {
            // initial play
            return;
        }


        //let activeSongId = parseInt(playerState.activeSong.substr(playerState.activeSong.indexOf('_') + 1));
        let nextSongId = LibraryController.getNextSongAfter(playerState.activeSong);
        if (nextSongId != -1) {
            playerState.activeSong = nextSongId;// `song_${nextSongId}`;
            this.playSong(playerState.activeSong);
        }
    }

    public async seekSong(t) {
        this.player.seek(t);
    }

    public async setVolume(v) {
        this.player.setVolume(v);
        playerState.volume = v;
    }

    private async onSongFinished() {
        console.log('onSongFinished');
        this.EE.emit('songFinished');

        await DBController.updateSongPlayed(playerState.activeSong);

        this.nextSong();
    }

    private async onSongMetadata() {
        playerState.totalTime = this.player.duration();
    }

    private async onSongTimeUpdated(e) {
        //this.EE.emit('songTimeUpdated');

        playerState.curTime = e.time;
    }

};

export default PlayerController.Instance;
