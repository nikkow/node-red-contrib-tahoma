var tahomalink = require('./core/tahomalink');
module.exports = function(RED) {
    function TahomaNode(config) {
        RED.nodes.createNode(this, config);

		this.device = config.device;
		this.tahomabox = config.tahomabox;

        var node = this;
        node.on('input', function(msg) {
			if(typeof msg.payload !== "object") {
				return;
			}

			var action = {};
			action.deviceURL = node.device;

			var commandName = "";
			var parameters = "";
			var statusProgressText = "";
			var statusDoneText = "";
			var expectedState = null;

			switch(msg.payload.action) {
				case "open":
					commandName = "open";
					statusProgressText = "Opening...";
					statusDoneText = "Open";
					expectedState = {open: true, position: 0};
					break;
				case "close":
					commandName = "close";
					statusProgressText = "Closing...";
					statusDoneText = "Closed";
					expectedState = {open: false, position: 100};
					break;
				/*case "myPosition":
					commandName = "my";
					statusProgressText = "Going to 'my' position...";
					statusDoneText = "Set to 'my'";
					break;*/
				case "customPosition":
					commandName = "setClosure";
					parameters = [msg.payload.position];
					statusProgressText = "Going to "+ msg.payload.position +"%...";
					statusDoneText = "Set to "+ msg.payload.position +"%";
					expectedState = {open: true, position: msg.payload.position};
                                        break;
				case "stop":
					commandName = "stop";
					statusProgressText = "Stopping...";
					statusDoneText = "Stoped";
					//expectedState = {open: false, position: 100}; // Not sure what to exspect here
					break;
			}

			var command = {};
			command.name = msg.payload.lowspeed ? "setClosureAndLinearSpeed" : commandName;
			if(parameters.length > 0) {
				command.parameters = parameters;
			}

			if(msg.payload.lowspeed) {
				command.parameters = [expectedState.position, "lowspeed"];
				statusProgressText = statusProgressText.substring(0, (statusProgressText.length - 3)) +" (Low Speed)...";
			}

			action.commands = [];
			action.commands.push(command);

			var actions = [];
			actions.push(action);

			var row = {};
			row.label = "Tahoma Equipment";
			row.actions = actions;

			var configNode = RED.nodes.getNode(node.tahomabox);

			node.status({fill: 'yellow', shape: 'dot', text: statusProgressText});

			tahomalink.execute(row, configNode)
			.then(function(body) {
				if(expectedState === null) {
					node.status({fill: 'grey', shape: 'dot', text: 'Unknown'});
					node.send(msg);
					return;
				}

				tahomalink.continueWhenFinished(node.device, expectedState)
				.then(function() {
					node.status({
						fill: 'green',
						shape: 'dot',
						text: statusDoneText
					});

					if(!('payload' in msg)) {
						msg.payload = {};
					}

					// TODO: Find a better way to handle "my" position.
					msg.payload.output = expectedState ? expectedState : {open: true};

					node.send(msg);
				});
			});
        });
    }
    RED.nodes.registerType("tahoma", TahomaNode);

	function TahomaNodeRead(config) {
		RED.nodes.createNode(this, config);

		this.device = config.device;
		this.tahomabox = config.tahomabox;

		var node = this;
		var configNode = RED.nodes.getNode(node.tahomabox);

        node.on('input', function(msg) {
			tahomalink.login(configNode.username, configNode.password)
			.then(function() {
				tahomalink.getDeviceState(node.device)
				.then(function(data) {
					console.log(data);
					msg.payload = data;
					node.send(msg);
				});
			});
		});
	}
	RED.nodes.registerType('tahoma-read', TahomaNodeRead);

	function TahomaConfigNode(n) {
        RED.nodes.createNode(this,n);
        this.username = n.username;
        this.password = n.password;
    }

    RED.nodes.registerType("tahoma-config", TahomaConfigNode);

	RED.httpAdmin.get('/tahomasomfy/getSetup/:boxid', function(req, res, next){
		var configNode = RED.nodes.getNode(req.params.boxid);
		tahomalink.getSetup(configNode)
		.then(function(body) {
			if(typeof body === "string") {
				body = JSON.parse(body);
			}

			res.json(body);
		});
		return;
	});
};
