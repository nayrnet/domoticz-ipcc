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
		var idx = dahuaIPC[name][4];
		if (TRACE)	console.log(name + ': Video Motion Detected');
		if (idx)	domoticz.switch(idx,255);
		domoticz.log('[IPCC] ' + name + ': Video Motion Detected')
		mqtt.publish('ipcc/' + name + '/VideoMotion', 'true');
	} else if (code === 'VideoMotion' && action === 'Stop') {		// Video Motion Stop
		var idx = dahuaIPC[name][4];
		if (TRACE)	console.log(name + ': Video Motion Ended');
		if (idx)	domoticz.switch(idx,0);
		mqtt.publish('ipcc/' + name + '/VideoMotion', 'false');
	} else if (code === 'AlarmLocal' && action === 'Start') {		// Alarm Local Start
		if (TRACE)	console.log(name + ': Local Alarm Triggered (' + (index+1) + ')');
		domoticz.log('[IPCC] ' + name + ': Local Alarm Triggered (' + (index+1) + ')')
		var alarm	= 6 + index;
		var idx		= dahuaIPC[name][alarm];
		if ((idx) && (options.contactSwitch.indexOf(idx) > -1)) { domoticz.switchContact(idx,true) } else { domoticz.switch(idx,255) }
		mqtt.publish('ipcc/' + name + '/AlarmLocal/' + (index+1), 'true');
	} else if (code === 'AlarmLocal' && action === 'Stop') {		// Alarm Local Stop
		if (TRACE)	console.log(name + ': Local Alarm Ended (' + (index+1) + ')');
		var alarm	= 6 + index;
		var idx		= dahuaIPC[name][alarm];
		if ((idx) && (options.contactSwitch.indexOf(idx) > -1)) { domoticz.switchContact(idx,false) } else { domoticz.switch(idx,0) }
		mqtt.publish('ipcc/' + name + '/AlarmLocal/' + (index+1), 'false');
	} else if (code === 'VideoLoss' && action === 'Start') {		// Video Lost
		var idx = dahuaIPC[name][5]
		if (TRACE)	console.log(name + ': Video Lost!');
		domoticz.log('[IPCC] ' + name + ': Video Lost!')
		if (idx)	domoticz.switch(idx,255);
		mqtt.publish('ipcc/' + name + '/VideoLoss', 'true');
	} else if (code === 'VideoLoss' && action === 'Stop') {			// Video Found
		var idx = dahuaIPC[name][5]
		if (TRACE)	console.log(name + ': Video Found');
		if (idx)	domoticz.switch(idx,0);
		mqtt.publish('ipcc/' + name + '/VideoLoss', 'false');
	} else if (code === 'VideoBlind' && action === 'Start') {		// Video Blind
		var idx = dahuaIPC[name][5]
		if (TRACE)	console.log(name + ': Video Blind!');
		domoticz.log('[IPCC] ' + name + ': Video Blind!')
		if (idx)	domoticz.switch(idx,255);
		mqtt.publish('ipcc/' + name + '/VideoBlind', 'true');
	} else if (code === 'VideoBlind' && action === 'Stop') {		// Video Unblind
		var idx = dahuaIPC[name][5]
		if (TRACE)	console.log(name + ': Video Unblind');
		if (idx)	domoticz.switch(idx,0);
		mqtt.publish('ipcc/' + name + '/VideoBlind', 'false');
	}
});

// mqtt: connect
mqtt.on('connect', function () {
	// Setup Subscriptions for Dahua Cameras
	var dahuas = Object.keys(dahuaIPC);
	dahuas.forEach(function(id){
		if (TRACE)	console.log('MQTT subscribed to: ipcc/dahua/' + id + '/'
		mqtt.subscribe('ipcc/dahua/' + id + '/NightProfile');
		mqtt.subscribe('ipcc/dahua/' + id + '/DayProfile');
		mqtt.subscribe('ipcc/dahua/' + id + '/AlarmOutput');
		mqtt.subscribe('ipcc/dahua/' + id + '/GoToPreset');
	});

});

// mqtt: message
mqtt.on('message', function (topic, message) {
	var path = topic.split('/');
	ven = path[1]
	cam = path[2]
	cmd = path[3]

	// Not yet Implemented
	console.log('MQTT '+ ven + ' ' + cam + ' : ('+ cmd + ') ' + message.toString());
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
