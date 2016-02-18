# Domoticz IPCamera Controller
[![GPL-3.0](https://img.shields.io/badge/license-GPL-blue.svg)]()
[![npm](https://img.shields.io/npm/v/npm.svg)]()
[![node](https://img.shields.io/node/v/gh-badges.svg)]()

This is a NodeJS service interfaces with Dahua IP Cameras and Domoticz.

## THIS IS BETA SOFTWARE AT THIS POINT!

The cameras's video motion detection and alarm inputs/outputs are avilable as normal devices within Domoticz.

It connects with Domoticz via the MQTT JSON API, and your Dahua IPC via HTTP API

### Features:
* Instant binary input from:
** Video Motion Detector
** Alarm Inputs (Dry Contacts)
** Video Blank
* Selector Switches for PTZ Presets
* Switch between Day/Night Mode via Domoticz UserVariable

### Software:
* IPC Controller - ME!
* Domoticz - http://www.domoticz.com
* Debian Jessie w/NodeJS from NodeSource repository
* AndroidTV OSD Remote - https://github.com/nayrnet/androidtv-osd-remote
* Mosquitto MQTT Broker

#### Support:
> No support provided or warranty impied, this project is avilable for educational use and my own personal tracking.
