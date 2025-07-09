// FIXME: dashjs uses window which is not defined in node; we can't bundle dashjs. We tried to fix this by loading dynamically (rather than import at the top), but
//  that didn't work iirc. I don't know what changed but suddenly this isn't a problem. If we figure this out or the issue never arises again we can remove this comment
import {MediaPlayer} from 'dashjs';

import config from '$lib/config';

export default class Player {

    private instance: player;
    private pathToken: object;

    private constructor() {
        console.log('Player instance created');

        this.pathToken = {};
    }

    async init() {
        this.player = MediaPlayer().create();

        // FIXME: hardcoded song for testing
        let songId = 'song_5294';

        const url = await this.buildURLPath(songId, 'manifest.mpd');
        this.player.initialize(document.querySelector('video'), url, true);

        const interceptor: RequestInterceptor = async (request: CommonMediaRequest) => {

            const u = new URL(request.url);
            const resource = u.pathname.substr(u.pathname.lastIndexOf('/')+1);

            request.url = await this.buildURLPath(songId, resource);
            console.log(request.url);

            return Promise.resolve(request)
        }
        this.player.addRequestInterceptor(interceptor)
        this.player.play();
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

        // FIXME: hardcoded expiration; think of something reasonable later
        const SIGNING_EXPIRATION = 7200;

        let signedURLPath = "";
        if (this.pathToken && this.pathToken.songId == songId) {
            signedURLPath = this.pathToken.signedURLPath;
        } else {
            // update signed token for song path
            const basePath = this.getURLBasePath(songId);
            const signedToken = await this.signURLPath(securityKey, SIGNING_EXPIRATION, basePath);
            signedURLPath = host + "/" + signedToken;
            this.pathToken.signedURLPath = signedURLPath;
            this.pathToken.songId = songId;
            this.pathToken.expires = 0; // FIXME; don't forget to take this into consideration in segment fetches (eg. 3 hour long song and token expires in 1 hour)
        }

        return signedURLPath;
    }

    private async signURLPath(securityKey, expirationTime = 3600, signaturePath) {

        const expires = Math.floor(new Date() / 1000) + expirationTime;
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
};

