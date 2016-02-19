#!/usr/bin/nodejs
// Domoticz IP Camera Controller (DOMOTICZ-IPCC)
// NodeJS Framework for integrating Dahua IP Cameras within Domoticz

// Load Configuration
var	options		= require('./config').options;
var	dahuaIPC	= require('./config').dahuaIPC;
var	hikvisionIPC	= require('./config').hikvisionIPC;

// Load Modules
var     dahuaAPI	= require('node-dahua-api');
var	mqttDomo 	= require('node-domoticz-mqtt');
var	mqttClient	= require('mqtt');
var	mqtt 		= mqttClient.connect(options);
var 	domoticz 	= new mqttDomo.domoticz(options);
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
var	hik		= new EventEmitter();
var 	hikNames	= Object.keys(hikvisionIPC)

// Init Alarm Listeners
function initCams () {
	var dahuas = Object.keys(dahuaIPC);
	dahuas.forEach(function(id){
		var opts = {}
		opts.host = dahuaIPC[id][0]
		opts.port = dahuaIPC[id][1]
		opts.user = dahuaIPC[id][2]
		opts.pass = dahuaIPC[id][3]
		ipc[id] = new dahuaAPI.dahua(opts);

		ipc[id].on('alarm', function(code,action,index) {
			dahua.emit('alarm', id, dahuas, code, action, parseInt(index))
		});
		ipc[id].on('end', function() {
			console.log(id + ': connection closed')		
		});
		ipc[id].on('connect', function() {
			console.log(id + ': connected')		
		});
		ipc[id].on('error', function(err) {
			console.log(id + ' ' + err)		
		});

	});
}

// dahua: alarm
dahua.on('alarm', function(name, id, code, action, index) {
	if (code === 'VideoMotion' && action === 'Start') {			// Video Motion Start
		if (TRACE)	console.log(name + ': Video Motion Detected');
		domoticz.log('[IPCC] ' + name + ': Video Motion Detected')
		domoticz.switch(dahuaIPC[name][4],255)
		mqtt.publish('ipcc/' + name + '/VideoMotion', 'true');
	} else if (code === 'VideoMotion' && action === 'Stop') {		// Video Motion Stop
		if (TRACE)	console.log(name + ': Video Motion Ended');
		domoticz.switch(dahuaIPC[name][4],0)
		mqtt.publish('ipcc/' + name + '/VideoMotion', 'false');
	} else if (code === 'AlarmLocal' && action === 'Start') {		// Alarm Local Start
		if (TRACE)	console.log(name + ': Local Alarm Triggered (' + (index+1) + ')');
		domoticz.log('[IPCC] ' + name + ': Local Alarm Triggered (' + (index+1) + ')')
		var alarm	= 6 + index;
		var idx		= dahuaIPC[name][alarm];
		console.log(options.contactSwitch.indexOf(idx))
		if (options.contactSwitch.indexOf(idx) > -1) { domoticz.switchContact(idx,true) } else { domoticz.switch(idx,255) }
		mqtt.publish('ipcc/' + name + '/AlarmLocal/' + (index+1), 'true');
	} else if (code === 'AlarmLocal' && action === 'Stop') {		// Alarm Local Stop
		if (TRACE)	console.log(name + ': Local Alarm Ended (' + (index+1) + ')');
		var alarm	= 6 + index;
		var idx		= dahuaIPC[name][alarm];
		if (options.contactSwitch.indexOf(idx) > -1) { domoticz.switchContact(idx,false) } else { domoticz.switch(idx,0) }
		mqtt.publish('ipcc/' + name + '/AlarmLocal/' + (index+1), 'false');
	} else if (code === 'VideoLoss' && action === 'Start') {		// Video Lost
		if (TRACE)	console.log(name + ': Video Lost!');
		domoticz.log('[IPCC] ' + name + ': Video Lost!')
		domoticz.switch(dahuaIPC[name][5],255)
		mqtt.publish('ipcc/' + name + '/VideoLoss', 'true');
	} else if (code === 'VideoLoss' && action === 'Stop') {			// Video Found
		if (TRACE)	console.log(name + ': Video Found');
		domoticz.switch(dahuaIPC[name][5],0)
		mqtt.publish('ipcc/' + name + '/VideoLoss', 'false');
	} else if (code === 'VideoBlind' && action === 'Start') {		// Video Blind
		if (TRACE)	console.log(name + ': Video Blind!');
		domoticz.log('[IPCC] ' + name + ': Video Blind!')
		domoticz.switch(dahuaIPC[name][5],255)
		mqtt.publish('ipcc/' + name + '/VideoBlind', 'true');
	} else if (code === 'VideoBlind' && action === 'Stop') {		// Video Unblind
		if (TRACE)	console.log(name + ': Video Unblind');
		domoticz.switch(dahuaIPC[name][5],0)
		mqtt.publish('ipcc/' + name + '/VideoBlind', 'false');
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
