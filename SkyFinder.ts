const {Client} = require('node-ssdp');
import {EventEmitter} from 'events';

import {SKY_BROWSE_URN, SKY_PLAY_URN} from './Common';

interface SSDPHeaders {
    LOCATION: string;

    /**
     * URN of the SSDP search.
     */
    ST: string;
}

interface SSDPRemoteInfo {
    address: string;
}

type Dictionary = {[key: string]: string|null};

/**
 * Enough location information to call UPnP features on your SkyBox.
 */
class SkyBoxURNs {
    private urns: Dictionary = {};

    constructor() {
        this.urns[SKY_BROWSE_URN] = null;
        this.urns[SKY_PLAY_URN] = null;
    }

    public set(key: string, value: string): void {
        this.urns[key] = value;
    }

    public values(): Dictionary {
        return Object.freeze(this.urns);
    }

    isFull(): boolean {
        return Object.values(this.urns).every(v => v !== null);
    }
}


/**
 * Find SkyBoxes.
 * @event 'found' includes the URN/URLs for the SkyBrowse service
 */
export class SkyFinder extends EventEmitter {
    private ssdp = new Client;
    private rawSkyBoxURNs: {[remoteIP: string]: SkyBoxURNs} = {};
    private urns = [SKY_BROWSE_URN, SKY_PLAY_URN];

    public constructor() {
        super();
        this.ssdp.on('response', (headers: SSDPHeaders, code: number, rinfo: SSDPRemoteInfo) => this.handleResponse(headers, code, rinfo));
    }

    private doSearch() {
        for(const urn of this.urns) {
            this.ssdp.search(urn);
        }
    }

    /**
     * Search for a SkyPlus machine, and continue searching.
     */
    public find() {
        this.doSearch();

        // Periodically re-poll
        setInterval(() => {
            this.doSearch();
        }, 10_000);
    }

    private handleResponse(headers: SSDPHeaders, code: number, rinfo: SSDPRemoteInfo) {
        if (code != 200) {
            return;
        }

        // Get/Create the matching record of URNs & populate it
        const urns: SkyBoxURNs = (!this.rawSkyBoxURNs.hasOwnProperty(rinfo.address)) ?
            this.rawSkyBoxURNs[rinfo.address] = new SkyBoxURNs() :
            this.rawSkyBoxURNs[rinfo.address];

        if (urns.isFull()) {
            return;
        } else {
            const urn = headers.ST;
            urns.set(urn, headers.LOCATION);
            if (urns.isFull()) {
                this.emit('found', urns.values());
            }
        }

    }
}