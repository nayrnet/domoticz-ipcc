#!/usr/bin/nodejs
// Starts and Stops the IPCC server in the background, creates a pid file for systemd watchdog.

var daemon = require("daemonize2").setup({
	main: "server.js",
	name: "domoticz-ipcc",
	pidfile: "ipcc.pid"
});

switch (process.argv[2]) {

    case "start":
        daemon.start();
        break;

    case "stop":
        daemon.stop();
        break;

    default:
        console.log("Usage: [start|stop]");
}
