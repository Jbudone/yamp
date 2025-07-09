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

        const SIGNING_EXPIRATION = 14400; // 4 hours: medium lived token for infrequent re-auth

        let signedURLPath = "";
        const nowSec = Math.floor(Date.now() / 1000);
        if (this.pathToken && this.pathToken.songId == songId && nowSec < this.pathToken.expires) {
            signedURLPath = this.pathToken.signedURLPath;
        } else {
            // update signed token for song path
            const expirationTimeSec = nowSec + SIGNING_EXPIRATION;
            const basePath = this.getURLBasePath(songId);
            const signedToken = await this.signURLPath(securityKey, expirationTimeSec, basePath);
            signedURLPath = host + "/" + signedToken;
            this.pathToken.signedURLPath = signedURLPath;
            this.pathToken.songId = songId;
            this.pathToken.expires = expirationTimeSec - 3; // Give some leeway for initial transit
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
};

