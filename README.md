# Somfy Tahoma for Node-RED

[![npm](https://img.shields.io/npm/v/node-red-contrib-tahoma.svg)](https://www.npmjs.com/package/node-red-contrib-tahoma)
[![Build Status](https://travis-ci.org/nikkow/node-red-contrib-tahoma.svg?branch=develop-v2)](https://travis-ci.org/nikkow/node-red-contrib-tahoma)
[![npm](https://img.shields.io/npm/dt/node-red-contrib-tahoma.svg)](https://www.npmjs.com/package/node-red-contrib-tahoma)
![license](https://img.shields.io/github/license/nikkow/node-red-contrib-tahoma.svg)
![code size](https://img.shields.io/github/languages/code-size/nikkow/node-red-contrib-tahoma)

## Setup

You can read this [guide](https://nodered.org/docs/getting-started/adding-nodes) from Node-RED official portal. This will help you install this node. Typically, the command are as follows:

	cd $HOME/.node-red
	npm install node-red-contrib-tahoma

## Disclaimer
This software is provided **as-is**. Be careful: your devices can be fully controlled via API actions. I am not responsible of any mis-usage or corruption of the devices configuration.

## Configuration

In order to use this node, you need to have a Tahoma Link account. If you already use the Tahoma Box and the mobile apps, you should have one.

When creating your first node, you will be asked to provide your e-mail and password used to login to your Tahoma Link account. These will be used to connect to the API (of course, they will only be used locally, they are not forwarded to me :)).

## Usage

This node accepts an object as input. The following properties will be parsed:

| Property | Type | Required? | Description |
| -------- | ---- | --------- | ----------- |
| `action` | enum (see below) | **Yes** | The action to perform |
| `position` | int (0-100) | *No* | The position you want to set your blinds/door to |
| `lowspeed` | boolean | *No* | Should the action be triggered in low-speed mode? |

### Actions

Currently, only a few commands are understood by this node. The possible values for the `action` property are:

* `open`: This will open the device (door, blind...)
* `close`: This will close the device
* `stop`: This will stop all running actions
* `customPosition`: This will set the device to a custom position. The position is passed using the `position` property, which is required in this mode.

### Output

The node will output its original `msg.payload` enriched with the result of the expected action. `msg.payload.output` will contain 2 properties:

* `open`: a boolean. Set to true if the device is open, or false otherwise
* `position`: an integer (0-100). Set to the position returned by the Tahoma box.
* `luminance`: in case of a Sun Sensor, returns the current value of core:LuminanceState (See issue [#6](https://github.com/nikkow/node-red-contrib-tahoma/issues/6))

## Example flow

![Example Flow](docs/example-flow.png)

An example flow can be found in the docs/ folder. Basically, all it does is close and open shutters based on manual triggers. Those can be replaced by some logic (e.g. a node calculating the sunset and sunrise times). The output is sent to a local MQTT broker. 

## Compatibility

This was tested with the following devices:

* IO-HomeControl Roller Shutters
* IO-HomeControl Garage Door
* Sunea IO Awning (thanks to @xeor)

Feel free to send any feedback of any other compatible items or known limitations :)

## To-do

These are the things that should be updated (and will be later) on this module:

* Find a way to properly handle "my" position
