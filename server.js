#!/usr/bin/nodejs
// Domoticz IP Camera Controller (DOMOTICZ-IPCC)
// NodeJS Framework for integrating Dahua IP Cameras within Domoticz

// Load Configuration
var	options		= require('./config').options;
var	dahuaIPC	= require('./config').dahuaIPC;

// Load Modules
var     ipcamera	= require('node-dahua-api');
var	mqtt            = require('node-domoticz-mqtt');
var 	domoticz 	= new mqtt.domoticz(options);
var 	EventEmitter 	= require('events').EventEmitter;

if (options.syslog) {
	var 	SysLogger 	= require('ain2');
	var	console		= new SysLogger({tag: 'ipcc', facility: 'daemon'});
} else {
	var	Console		= require('console').Console;
	var	console		= new Console(process.stdout, process.stderr);
}

// Globals
var	TRACE		= true;
var	ipc		= {};
var	dahua		= new EventEmitter();
var 	dahuaNames	= Object.keys(dahuaIPC)

// Init Alarm Listeners
function initCams () {
	var i = Object.keys(dahuaIPC);
	i.forEach(function(id){
		var opts = {}
		opts.host = dahuaIPC[id][0]
		opts.port = dahuaIPC[id][1]
		opts.user = dahuaIPC[id][2]
		opts.pass = dahuaIPC[id][3]
		ipc[id] = new ipcamera.dahua(opts);

		ipc[id].on('alarm', function(code,action,index) {
			dahua.emit('alarm', id, i, code, action, index)
		});

	});
}

// dahua: alarm
dahua.on('alarm', function(name, id, code, action, index) {
	if (code === 'VideoMotion' && action === 'Start') {
		if (TRACE)	console.log(name + ' Video Motion Detected');
		domoticz.log('[IPCC] ' + name + ' Video Motion Detected')
		domoticz.switch(dahuaIPC[name][4],255)
	} else if (code === 'VideoMotion' && action === 'Stop') {
		if (TRACE)	console.log(name + ' Video Motion Ended');
		domoticz.switch(dahuaIPC[name][4],0)
	} else if (code === 'AlarmLocal' && action === 'Start') {
		if (TRACE)	console.log(name + ' Local Alarm Triggered: ' + index);
		domoticz.log('[IPCC] ' + name + ' Local Alarm Triggered: ' + index)
		var alarm	= 6 + parseInt(index);
		domoticz.switch(dahuaIPC[name][alarm],255)
	} else if (code === 'AlarmLocal' && action === 'Stop') {
		if (TRACE)	console.log(name + ' Local Alarm Ended: ' + index);
		var alarm	= 6 + parseInt(index);
		domoticz.switch(dahuaIPC[name][alarm],0)
	} else if (code === 'VideoLoss' && action === 'Start') {
		if (TRACE)	console.log(name + ' Video Lost!');
		domoticz.log('[IPCC] ' + name + ' Video Lost!')
		domoticz.switch(dahuaIPC[name][5],255)
	} else if (code === 'VideoLoss' && action === 'Stop') {
		if (TRACE)	console.log(name + ' Video Found!');
		domoticz.switch(dahuaIPC[name][5],0)
	} else if (code === 'VideoBlind' && action === 'Start') {
		if (TRACE)	console.log(name + ' Video Blind!');
		domoticz.log('[IPCC] ' + name + ' Video Blind!')
		domoticz.switch(dahuaIPC[name][5],255)
	} else if (code === 'VideoBlind' && action === 'Stop') {
		if (TRACE)	console.log(name + ' Video Unblind!');
		domoticz.switch(dahuaIPC[name][5],0)
	}
});

// domoticz: connect
domoticz.on('connect', function() {
	console.log("Domoticz MQTT: connected")
        domoticz.log('[IPCC] IP Camera Controller connected.')
});

// domoticz: error
domoticz.on('error', function(error) {
	console.log("MQTT ERROR: " + error)
});

// ipcc: uncaught error
process.on('uncaughtException', function(err) {
	// handle the error safely
	console.log("UNKNOWN ERROR: " + err)
});

// ipcc: OnExit
process.on( "SIGINT", function() {
	console.log("Exiting...")
	domoticz.log("[IPCC] IP Camera Controller disconnected.")
        setTimeout(function() {
		process.exit()
        }, 1000);
});

// Initalize Cameras
initCams();
