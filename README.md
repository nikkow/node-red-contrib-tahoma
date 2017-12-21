# Somfy Tahoma for Node-RED

## Setup

	npm i -g node-red-contrib-tahoma
	
## Disclaimer 
This software is provided as-is. Be careful: your devices can be totally controlled via API actions. I am not responsible of any mis-usage or corruption of the devices configuration.

## Configuration

In order to use this node, you need to have a Tahoma Link account. If you already use the Tahoma Box and the mobile apps, you should have one. 

When creating your first node, you will be asked to provide your e-mail and password used to login to your Tahoma Link account. These will be used to connect to the API (of course, they will only be used locally, they are not forwaded to me :)). 
	
## Usage

This node accepts an object as input. The following properties will be parsed:

| Property | Type | Required? | Description |
| -------- | ---- | --------- | ----------- |
| `action` | enum (see below) | **Yes** | The action to perform |
| `position` | int (0-100) | *No* | The position you want to set your blinds/door to |
| `lowspeed` | boolean | *No* | Should the action be trigerred in lowspeed mode? |

### Actions

Currently, only a few commands are understood by this node. The possible values for the `action` property are:

* `open`: This will open the device (door, blind...)
* `close`: This will close the device
* `myPosition`: This will set the device to its predefined position (the "my" button on your physical controller/wall switch)
* `customPosition`: This will set the device to a custom position. The position is passed using the `position` property, which is required in this mode.

### Output

The node will output its original `msg.payload` enriched with the result of the expected action. `msg.payload.output` will contain 1 or 2 properties: 

* `open`: a boolean. Set to true if the device is open, or false othewise
* `position`: an integer (0-100). Set to the position returned by the Tahoma box. This field is currently not sent when the "my" function is used.
	
## To-do

These are the things that should be updated (and will be later) on this module:

* Filter elements that can actually be controlled (e.g. do not display the "Active Button")