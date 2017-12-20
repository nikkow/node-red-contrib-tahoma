var request = require('request');
var Q = require('q');

var TAHOMA_LINK_BASE_URL = "https://www.tahomalink.com/enduser-mobile-web";

var login = function login(username, password) {
	var deferred = Q.defer();

	request({
		url: TAHOMA_LINK_BASE_URL + "/enduserAPI/login",
		method: 'POST',
		form: {
			userId: username,
			userPassword: password
		},
		jar: true
	}, function(err, res, body) {
		if(res.statusCode === 200) {
			deferred.resolve();
		} else {
			deferred.reject();
		}
	});

	return deferred.promise;
};

var getSetup = function getSetup() {
	var deferred = Q.defer();

	request({
		url: TAHOMA_LINK_BASE_URL + "/externalAPI/json/getSetup",
		method: 'GET',
		jar: true
	}, function(err, res, body) {
		if(res.statusCode === 200) {
			deferred.resolve(body);
		} else {
			deferred.reject();
		}
	});

	return deferred.promise;
};

var execute = function execute(row) {
	var deferred = Q.defer();

	request({
		url: TAHOMA_LINK_BASE_URL + "/enduserAPI/exec/apply",
		method: 'POST',
		body: row,
		json: true,
		jar: true
	}, function(err, res, body) {
		if(res.statusCode === 200) {
			deferred.resolve(body);
		} else {
			deferred.reject();
		}
	});

	return deferred.promise;
};

var getDeviceState = function getDeviceState(deviceURL) {
	var deferred = Q.defer();

	getSetup().then(function(body) {
		if(typeof body !== 'object') {
			body = JSON.parse(body);
		}

		var devices = body.setup.devices;

		for(var i = 0; i < devices.length; i++) {
			if(devices[i].deviceURL === deviceURL) {
				var _thisDevice = devices[i];
				var response = {};

				response.label = _thisDevice.label;

				for(var j = 0; j < _thisDevice.states.length; j++) {
					if(_thisDevice.states[j].name === "core:OpenClosedState") {
						response.open = _thisDevice.states[j].value;
					}

					if(_thisDevice.states[j].name === "core:ClosureState") {
						response.position = _thisDevice.states[j].value;
					}
				}

				return deferred.resolve(response);
			}
		}
	}, function() {
		deferred.reject();
	});

	return deferred.promise;
};

var continueWhenFinished = function continueWhenFinished(deviceURL, expectedState) {
	var isFirstLaunch = true;
	return Q.Promise(function(resolve) {
		setTimeout(function() {
			getDeviceState(deviceURL).then(function(state) {
				var isOpen = state.open === "open";
				if(isOpen === expectedState.open && state.position === expectedState.position) {
					resolve(true);
				} else {
					resolve(false);
				}
			});
		}, isFirstLaunch ? 0 : 2000);
	})
	.then(function(finished) {
		return finished ? true : continueWhenFinished(deviceURL, expectedState);
	});
};

module.exports = {
	login: login,
	getSetup: getSetup,
	execute: execute,
	getDeviceState: getDeviceState,
	continueWhenFinished: continueWhenFinished
};
