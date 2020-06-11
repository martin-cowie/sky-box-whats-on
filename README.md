# whatson

Find a Sky Plus box, and log what people are watching on it.

Finds & queries the Sky Box using mostly UPNP.

# Installation

`npm install`

# Execution

`npx ts-node whatson.ts`

## Example

```
% ts-node ./whatson.ts
[2020-06-11T11:52:04.064Z] Getting recording data from http://192.168.59.152:49153/description3.xml
progress [========================================] 100% | ETA: 0s | 898/898
[2020-06-11T11:52:20.051Z] TransportState:  STOPPED
[2020-06-11T11:52:20.051Z] Live TV, channel: POP
```