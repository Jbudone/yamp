// FIXME: dashjs uses window which is not defined in node; we can't bundle dashjs. We tried to fix this by loading dynamically (rather than import at the top), but
//  that didn't work iirc. I don't know what changed but suddenly this isn't a problem. If we figure this out or the issue never arises again we can remove this comment
import {MediaPlayer} from 'dashjs';

import config from '$lib/config';

export default class Player {

    private instance: player;

    private constructor() {
        console.log('Player instance created');
    }

    async init() {
        this.player = MediaPlayer().create();


        // FIXME: hardcoded song for testing
        let songId = 'song_5294';
        var securityKey = config.BUNNYCDN_GET_ACCESS_KEY!;
        var songPath = `${config.BUNNYCDN_GET_HOST!}/${songId}`;
        var mpdUrl = `${songPath}/manifest.mpd`;

        // FIXME: hardcoded values, mostly copy/paste from bunnycdn
        const SIGNING_EXPIRATION = 7200;
        const SIGNING_USER_IP = '';
        const SIGNING_IS_DIRECTORY = false;
        const SIGNING_PATH_ALLOWED = '/';
        const SIGNING_FOR_COUNTRY = 'CA,US';
        const SIGNING_EXCLUDE_COUNTRY = 'JP';

        var signed = await this.signUrl(mpdUrl, securityKey, SIGNING_EXPIRATION, SIGNING_USER_IP, SIGNING_IS_DIRECTORY, SIGNING_PATH_ALLOWED, SIGNING_FOR_COUNTRY, SIGNING_EXCLUDE_COUNTRY);
        this.player.initialize(document.querySelector('video'), signed, true);

        const interceptor: RequestInterceptor = async (request: CommonMediaRequest) => {
            var u = new URL(request.url);
            var url = `${songPath}/` + u.pathname.substr(u.pathname.lastIndexOf('/')+1);
            var signed = await this.signUrl(url, securityKey, SIGNING_EXPIRATION, SIGNING_USER_IP, SIGNING_IS_DIRECTORY, SIGNING_PATH_ALLOWED, SIGNING_FOR_COUNTRY, SIGNING_EXCLUDE_COUNTRY);
            request.url = signed;
            console.log(request.url);

            return Promise.resolve(request)
        }
        this.player.addRequestInterceptor(interceptor)
        this.player.play();
    }

    private addCountries(url, a, b) {
        var tempUrl = url;
        if (a != null) {
            var tempUrlOne = new URL(tempUrl);
            tempUrl += ((tempUrlOne.search == "") ? "?" : "&") + "token_countries=" + a;
        }
        if (b != null) {
            var tempUrlTwo = new URL(tempUrl);
            tempUrl += ((tempUrlTwo.search == "") ? "?" : "&") + "token_countries_blocked=" + b;
        }
        return tempUrl;
    }

    // FIXME: hardcoded values, mostly copy/paste from bunnycdn
    private async signUrl(url, securityKey, expirationTime = 3600, userIp, isDirectory = false, pathAllowed, countriesAllowed, countriesBlocked) {
        /*
            url: CDN URL w/o the trailing '/' - exp. http://test.b-cdn.net/file.png
            securityKey: Security token found in your pull zone
            expirationTime: Authentication validity (default. 86400 sec/24 hrs)
            userIp: Optional parameter if you have the User IP feature enabled
            isDirectory: Optional parameter - "true" returns a URL separated by forward slashes (exp. (domain)/bcdn_token=...)
            pathAllowed: Directory to authenticate (exp. /path/to/images)
            countriesAllowed: List of countries allowed (exp. CA, US, TH)
            countriesBlocked: List of countries blocked (exp. CA, US, TH)
        */
        var parameterData = "", parameterDataUrl = "", signaturePath = "", hashableBase = "", token = "";
        var expires = Math.floor(new Date() / 1000) + expirationTime;
        var url = this.addCountries(url, countriesAllowed, countriesBlocked);
        var parsedUrl = new URL(url);
        var parameters = (new URL(url)).searchParams;
        if (pathAllowed != "") {
            signaturePath = pathAllowed;
            parameters.set("token_path", signaturePath);
        } else {
            signaturePath = decodeURIComponent(parsedUrl.pathname);
        }
        parameters.sort();

        var parameterData = '';
        var a = new URLSearchParams(); 
        if (Array.from(parameters).length > 0) {
            parameters.forEach(function(value, key) {
                if (value == "") {
                    return;
                }
                if (parameterData.length > 0) {
                    parameterData += "&";
                }
                a.append(key, value);

                parameterData += key + "=" + value;
        //        parameterDataUrl += "&" + key + "=" + value;// queryString.escape(value);
        //        
            });
        }
        var parameterDataUrl = a.toString();

        
        hashableBase = securityKey + signaturePath + expires + ((userIp != null) ? userIp : "") + parameterData;

        var data = (new TextEncoder()).encode(hashableBase) 
        var hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        var hashArray = new Uint8Array(hashBuffer);
        var base64String = btoa(String.fromCharCode(...hashArray));

        var token = base64String;
        token = token.replace(/\n/g, "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

        //token = Buffer.from(crypto.createHash("sha256").update(hashableBase).digest()).toString("base64");
        //token = token.replace(/\n/g, "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        if (isDirectory) {
            return parsedUrl.protocol+ "//" + parsedUrl.host + "/bcdn_token=" + token + '&' + parameterDataUrl + "&expires=" + expires + parsedUrl.pathname;
        } else {
            return parsedUrl.protocol + "//" + parsedUrl.host + parsedUrl.pathname + "?token=" + token + '&' + parameterDataUrl + "&expires=" + expires;
        }
    }
};

