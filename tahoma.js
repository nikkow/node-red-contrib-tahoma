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
				case "myPosition":
					commandName = "my";
					statusProgressText = "Going to 'my' position...";
					statusDoneText = "Set to 'my'";
					break;
				case "customPosition":
					commandName = "setClosure";
					parameters = [msg.payload.position];
					statusProgressText = "Going to "+ msg.payload.position +"%...";
					statusDoneText = "Set to "+ msg.payload.position +"%";
					expectedState = {open: true, position: msg.payload.position};
			}

			var command = {};
			command.name = commandName;
			if(parameters.length > 0) {
				command.parameters = parameters;
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

			tahomalink.login(configNode.username, configNode.password)
			.then(function() {
				tahomalink.execute(row)
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
        });
    }
    RED.nodes.registerType("tahoma", TahomaNode);

	function TahomaConfigNode(n) {
        RED.nodes.createNode(this,n);
        this.username = n.username;
        this.password = n.password;
    }

    RED.nodes.registerType("tahoma-config", TahomaConfigNode);

	RED.httpAdmin.get('/tahomasomfy/getSetup/:boxid', function(req, res, next){
		var configNode = RED.nodes.getNode(req.params.boxid);
		tahomalink.login(configNode.username, configNode.password)
		.then(function() {
			tahomalink.getSetup()
			.then(function(body) {
				if(typeof body === "string") {
					body = JSON.parse(body);
				}

				res.json(body);
			});
		});
		return;
	});
};
