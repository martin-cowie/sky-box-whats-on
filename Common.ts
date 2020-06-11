export const SKY_BROWSE_URN = 'urn:schemas-nds-com:service:SkyBrowse:2';
export const SKY_PLAY_URN = 'urn:schemas-nds-com:service:SkyPlay:2';

const xml_special_to_escaped_one_map: {[k: string]: string} = {
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;'
};

const escaped_one_to_xml_special_map: {[k: string]: string} = {
    '&amp;': '&',
    '&quot;': '"',
    '&lt;': '<',
    '&gt;': '>'
};

export function encodeXml(str: string) {
    return str.replace(/([\&"<>])/g,
        (str: string, item) => xml_special_to_escaped_one_map[item]);
};

export function decodeXml(str: string) {
    return str.replace(/(&quot;|&lt;|&gt;|&amp;)/g,
        (str: string, item) => escaped_one_to_xml_special_map[item]);
}
