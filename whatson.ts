const UPnPClient = require('node-upnp');
require('log-timestamp');

import axios from 'axios';
import {DOMParser} from 'xmldom';
import {SingleBar} from 'cli-progress';

import {SkyFinder} from './SkyFinder';
import {SKY_BROWSE_URN, SKY_PLAY_URN, decodeXml} from './Common';

const TV_LISTINGS = 'http://epgservices.sky.com/tvlistings-proxy/TVListingsProxy/init.json';

type ProgressHandler = (progress: number, total: number) => void;

type ItemListing = {
    [k: string]: {
        title: string,
        description: string
    }
};

type TvMap = {[channelID: number]: string};

/**
 * Get all recorded items from a SkyBox.
 * @param location URN of the SkyBrowse:2 UPnP service
 * @param progressHandler
 */
async function getRecordedItems(location: string, progressHandler: ProgressHandler): Promise<ItemListing> {
    console.log(`Getting recording data from ${location}`);
    const client = new UPnPClient({
        url: location,
        userAgent: "SKY_skyplus"
    });

    const result: ItemListing = {};

    do {
        const response = await client.call('urn:nds-com:serviceId:SkyBrowse', 'Browse', {
            ObjectID: 3,
            BrowseFlag: 'BrowseDirectChildren',
            Filter: '*',
            StartingIndex: Object.keys(result).length,
            RequestedCount: 25, // The apparent max
            SortCriteria: null
        });

        const xmlContent = decodeXml(response.Result);
        const contentDoc = new DOMParser().parseFromString(xmlContent);

        Array.from(contentDoc.documentElement.getElementsByTagName('item')).map((element: Element) => {
            const res = element.getElementsByTagName('res').item(0)?.textContent;
            const title = element.getElementsByTagName('dc:title').item(0)?.textContent;
            const description = element.getElementsByTagName('dc:description').item(0)?.textContent;
            if (res && title && description) {
                result[res] = {title, description};
            }
        });

        progressHandler(Object.keys(result).length, response.TotalMatches);
        if (Object.keys(result).length >= response.TotalMatches) {
            return result;
        }
    } while (true);
}

/**
 * Get a map of channelIDs to their Station Name.
 */
async function getTvListings(): Promise<TvMap> {
    // Get the Channel listings
    const response = await axios.get(TV_LISTINGS);
    return Object.fromEntries(response.data.channels.map((rec:any) => {
        const value = rec.title;
        const id = rec.channelid;
        return [id, value];
    })) as TvMap;
}

// - Main -----

const skyFinder = new SkyFinder();
skyFinder.on('found', async (skyURNs) => {
    const browseURN = skyURNs[SKY_BROWSE_URN];
    let bar: SingleBar|null = null;

    const listingP = getRecordedItems(browseURN, (done, totalTodo) => {
        if (!bar) {
            bar = new SingleBar({});
            bar.start(totalTodo, done)
        };
        bar.update(done);
        if (done == totalTodo) {
            bar.stop();
        }
    });

    const [listing, tvMap] = await Promise.all([listingP, getTvListings()]);

    const playClient = new UPnPClient({
        url: skyURNs[SKY_PLAY_URN],
        userAgent: "SKY_skyplus"
    });


    playClient.on('AVTransportURI', (uriStr: any) => {
        const url = new URL(uriStr)
        switch(url.protocol) {
            case 'xsi:':
                const channelId = parseInt(url.host, 16);
                console.log("Live TV, channel:", tvMap[channelId]);
                break;
            case 'file:':
                console.log("Recording: ", listing[uriStr]);
                break;
            default:
                console.log(url.toString());
        }
    }, {force: true}); // force required, as property description from SkyBox is incorrectly set to false

    playClient.on('TransportState', (state: string) => {
        console.log('TransportState: ', state);
    }, {force: true}); // force required, as property description from SkyBox is incorrectly set to false


});
skyFinder.find();