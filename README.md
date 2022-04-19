<p align="center">
	<img src="docs/images/somfy-logo.png">
</p>

# Somfy Tahoma for Node-RED


[![npm](https://img.shields.io/npm/v/node-red-contrib-tahoma.svg)](https://www.npmjs.com/package/node-red-contrib-tahoma)
[![Build Status](https://travis-ci.org/nikkow/node-red-contrib-tahoma.svg?branch=develop-v2)](https://travis-ci.org/nikkow/node-red-contrib-tahoma)
[![npm](https://img.shields.io/npm/dt/node-red-contrib-tahoma.svg)](https://www.npmjs.com/package/node-red-contrib-tahoma)
![license](https://img.shields.io/github/license/nikkow/node-red-contrib-tahoma.svg)
![code size](https://img.shields.io/github/languages/code-size/nikkow/node-red-contrib-tahoma)

## 🚨 Important Note vor v2.x and v1.x users

This 3rd version implements a new API released by Somfy (yes, another one). This time, it no longer relies on any cloud-based API, but will directly discuss with your local Tahoma box.

#### What does this mean?

Basically, the only requirement is to host the node-red instance on the same network than your Tahoma box. That's all. No more quotas, no more expiring tokens. Good news, isn't it?

#### How to upgrade?

Even though your flows should not be modified, the [config-node](https://nodered.org/docs/user-guide/editor/workspace/nodes#configuration-nodes) must be reconfigured using this new API.

**However**, please note that even though this release was tested before being published, you might encounter unexpected issues. **Please backup your flow before proceeding with this major release**.

## Setup

You can read this [guide](https://nodered.org/docs/getting-started/adding-nodes) from Node-RED official portal. This will help you install this node. Typically, the command are as follows:

	cd $HOME/.node-red
	npm install node-red-contrib-tahoma 

## Disclaimer
This software is provided **as-is**. Be careful: your devices can be fully controlled via API actions. I am not responsible of any mis-usage or corruption of the devices configuration.

## Configuration

This node relies on the Local API provided by Somfy, and available on the Tahoma box (from v2 onwards -as per Somfy documentation). 

You will need to **enable the developer mode** on your Somfy account to use this module. This [guide](https://github.com/nikkow/node-red-contrib-tahoma/wiki/How-to-enable-the-developer-mode%3F) will walk you through this process.

When creating your first node, you will be asked to provide your e-mail and password used to login to your Somfy account. These will be used to generate a token to interact with your box (they will not be saved at all on your instance). The pin code of your box will also be required. This information is available on your Somfy account.

## Usage

### Node `tahoma`

This node accepts an object as input. The following properties will be parsed:

| Property | Type | Required? | Description |
| -------- | ---- | --------- | ----------- |
| `action` | enum (see below) | **Yes** | The action to perform |
| `position` | int (0-100) | *No* | The position you want to set your blinds/door to |
| `rotation` | int (0-100) | *No* | The rotation you want to set your blinds to |
| `lowspeed` | boolean | *No* | Should the action be triggered in low-speed mode? |

#### Actions

Currently, only a few commands are understood by this node. The possible values for the `action` property are:

* `open`: This will open the device (door, blind...)
* `close`: This will close the device
* `stop`: This will stop all running actions
* `customPosition`: This will set the device to a custom position. The position is passed using the `position` property, which is required in this mode.
* `customRotation`: This will set the device (blinds) to a custom rotation. The rotation is passed using the `orientation` property, which is required in this mode.

#### Output

The node will output its original `msg.payload` enriched with the result of the expected action. `msg.payload.output` will contain 2 properties:

* `open`: a boolean. Set to true if the device is open, or false otherwise
* `position`: an integer (0-100). Set to the position returned by the Tahoma box.
* `luminance`: in case of a Sun Sensor, returns the current value of core:LuminanceState (See issue [#6](https://github.com/nikkow/node-red-contrib-tahoma/issues/6))

### Node `tahoma-read`

This node will ignore all data provided as input. You can specify the desired device by editing the node properties.
(Note: you can still trigger a `tahoma-read` instuction periodically by using an `inject` node. See [#28](https://github.com/nikkow/node-red-contrib-tahoma/issues/28#issuecomment-615755280))

#### Output

The node will output its original `msg.payload` enriched with the selected device information. The fields returned are the raw information sent by the Tahoma box.

## Example flow

![Example Flow](docs/images/example-flow.png)

An example flow can be found in the docs/ folder. Basically, all it does is close and open shutters based on manual triggers. Those can be replaced by some logic (e.g. a node calculating the sunset and sunrise times). The output is sent to a local MQTT broker. 

## Compatibility

This was tested with the following devices:

* IO-HomeControl Roller Shutters
* IO-HomeControl Garage Door
* Sunea IO Awning (thanks to @xeor)

Feel free to send any feedback of any other compatible items or known limitations :)
