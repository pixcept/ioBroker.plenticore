'use strict';

const fs = require('fs');
const ioBLib = require('@strathcole/iob-lib').ioBLib;
const KOSTAL = require('./kostal').KOSTAL;
const http = require('http');
const https = require('https');
const suncalc = require('suncalc2');

const apiurl = '/api/v1/';

let adapter;
let utils;
let weather;
let sunTimer;

let deviceIpAdress;
let devicePort;
let deviceHttps;
let devicePassword;
let pollingTime;

let PVStringCount = 2;
let hasBattery = false;
let panelWp = 0;

let consumptionData = {};
let generationData = {};
let weatherAdapters = {
	'weatherunderground': {
		'instance': null,
		'sky': 'sky',
		'time': 'time',
		'visibility': 'visibility',
		'vis_factor': 1,
		'rain': 'precipitation',
		'rainChance': 'precipitationChance',
		'fc_id': 'forecastHourly.%%H%%h',
		'fc_min': 0,
		'fc_max': 35
	},
	/*'darksky': {
		'instance': null,
		'sky': 'cloudCover',
		'time': 'time',
		'visibility': 'visibility',
		'vis_factor': 1,
		'rain': 'precipIntensity',
		'rainChance': 'precipProbability',
		'fc_id': 'hourly.%%H%%',
		'fc_min': 0,
		'fc_max': 48
	},*/
	'daswetter': {
		'instance': null,
		'sky': 'clouds_value',
		'time': 'hour_value',
		'visibility': null,
		'rain': 'rain_value',
		'rainChance': null,
		'fc_id': 'NextHours.Location_1.Day_%%D%%.Hour_%%H%%',
		'fc_min': 1,
		'fc_max': 3,
		'fc_steps': {
			'1': 1,
			'2': 1,
			'3': 3
		},
		'fc_mode': 'dayhours'
	}
};
let forecastData = {};
let forecastHours = {};

let polling = null;

let jsonStates;
let power_jsonfile;
let pv_jsonfile;
let fc_jsonfile;
let state_jsonfile;

let loginSessionId;

const boolean_states = [
	'scb.export.PortalConActive',
	'scb.time.NTPuse',
	'scb.network.IPv4Auto',
	'scb.modbus.ModbusEnable',
	'scb.export.ExportEnable',
	'devices.local.generator.ExtModuleControl',
	'devices.local.battery.SmartBatteryControl'
];

const battery_ids = [
	'devices.local.battery.Cycles',
	'devices.local.battery.SoC',
	'devices.local.battery.I',
	'devices.local.battery.U',
	'devices.local.battery.P',
	'devices.local.battery.DynamicSoc',
	'devices.local.battery.SmartBatteryControl',
	"devices.local.battery.MinHomeConsumption",
	"devices.local.battery.MinSoc",
	"devices.local.battery.SmartBatteryControl",
	"devices.local.battery.Strategy",
	"devices.local.battery.SupportedTypes",
	"devices.local.battery.Type",
	"devices.local.battery.ExternControl"
];

const payload_data = [
	{
		"moduleid": "devices:local",
		"mappings": {
			"Dc_P": {
				id: "devices.local.Dc_P",
				type: 'float'
			},
			"DigitalIn": {
				id: "devices.local.DigitalIn",
				type: 'int'
			},
			"EM_State": {
				id: "devices.local.EM_State",
				type: 'int'
			},
			"HomeBat_P": {
				id: "devices.local.HomeBat_P",
				type: 'float'
			},
			"HomeGrid_P": {
				id: "devices.local.HomeGrid_P",
				type: 'float'
			},
			"HomeOwn_P": {
				id: "devices.local.HomeOwn_P",
				type: 'float'
			},
			"HomePv_P": {
				id: "devices.local.HomePv_P",
				type: 'float'
			},
			"Home_P": {
				id: "devices.local.Home_P",
				type: 'float'
			},
			"Inverter:State": {
				id: "devices.local.inverter.State",
				type: 'int'
			},
			"LimitEvuAbs": {
				id: "devices.local.LimitEvuAbs",
				type: 'float'
			}
		}
	},
	{
		"moduleid": "devices:local:ac",
		"mappings": {
			"CosPhi": {
				id: "devices.local.ac.CosPhi",
				type: 'float'
			},
			"Frequency": {
				id: "devices.local.ac.Frequency",
				type: 'float'
			},
			"L1_I": {
				id: "devices.local.ac.L1_I",
				type: 'float'
			},
			"L1_P": {
				id: "devices.local.ac.L1_P",
				type: 'float'
			},
			"L1_U": {
				id: "devices.local.ac.L1_U",
				type: 'float'
			},
			"L2_I": {
				id: "devices.local.ac.L2_I",
				type: 'float'
			},
			"L2_P": {
				id: "devices.local.ac.L2_P",
				type: 'float'
			},
			"L2_U": {
				id: "devices.local.ac.L2_U",
				type: 'float'
			},
			"L3_I": {
				id: "devices.local.ac.L3_I",
				type: 'float'
			},
			"L3_P": {
				id: "devices.local.ac.L3_P",
				type: 'float'
			},
			"L3_U": {
				id: "devices.local.ac.L3_U",
				type: 'float'
			},
			"P": {
				id: "devices.local.ac.P",
				type: 'int'
			},
			"Q": {
				id: "devices.local.ac.Q",
				type: 'float'
			},
			"S": {
				id: "devices.local.ac.S",
				type: 'float'
			}
		}
	},
	{
		"moduleid": "devices:local:battery",
		"mappings": {
			"Cycles": {
				id: "devices.local.battery.Cycles",
				type: 'int'
			},
			"SoC": {
				id: "devices.local.battery.SoC",
				type: 'int'
			},
			"I": {
				id: "devices.local.battery.I",
				type: 'float'
			},
			"U": {
				id: "devices.local.battery.U",
				type: 'float'
			},
			"P": {
				id: "devices.local.battery.P",
				type: 'int'
			}
		}
	},
	{
		"moduleid": "devices:local:pv1",
		"mappings": {
			"I": {
				id: "devices.local.pv1.I",
				type: 'float'
			},
			"U": {
				id: "devices.local.pv1.U",
				type: 'float'
			},
			"P": {
				id: "devices.local.pv1.P",
				type: 'float'
			}
		}
	},
	{
		"moduleid": "devices:local:pv2",
		"mappings": {
			"I": {
				id: "devices.local.pv2.I",
				type: 'float'
			},
			"U": {
				id: "devices.local.pv2.U",
				type: 'float'
			},
			"P": {
				id: "devices.local.pv2.P",
				type: 'float'
			}
		}
	},
	{
		"moduleid": "devices:local:pv3",
		"mappings": {
			"I": {
				id: "devices.local.pv3.I",
				type: 'float'
			},
			"U": {
				id: "devices.local.pv3.U",
				type: 'float'
			},
			"P": {
				id: "devices.local.pv3.P",
				type: 'float'
			}
		}
	},
	{
		"moduleid": "scb:export",
		"mappings": {
			"PortalConActive": {
				id: "scb.export.PortalConActive",
				type: 'boolean'
			}

		}
	},
	{
		"moduleid": "scb:statistic:EnergyFlow",
		"mappings": {
			"Statistic:Autarky:Day": {
				id: "scb.statistic.EnergyFlow.AutarkyDay",
				type: 'float'
			},
			"Statistic:Autarky:Month": {
				id: "scb.statistic.EnergyFlow.AutarkyMonth",
				type: 'float'
			},
			"Statistic:Autarky:Total": {
				id: "scb.statistic.EnergyFlow.AutarkyTotal",
				type: 'float'
			},
			"Statistic:Autarky:Year": {
				id: "scb.statistic.EnergyFlow.AutarkyYear",
				type: 'float'
			},
			"Statistic:EnergyHome:Day": {
				id: "scb.statistic.EnergyFlow.EnergyHomeDay",
				type: 'float'
			},
			"Statistic:EnergyHome:Month": {
				id: "scb.statistic.EnergyFlow.EnergyHomeMonth",
				type: 'float'
			},
			"Statistic:EnergyHome:Total": {
				id: "scb.statistic.EnergyFlow.EnergyHomeTotal",
				type: 'float'
			},
			"Statistic:EnergyHome:Year": {
				id: "scb.statistic.EnergyFlow.EnergyHomeYear",
				type: 'float'
			},
			"Statistic:EnergyHomeBat:Day": {
				id: "scb.statistic.EnergyFlow.EnergyHomeBatDay",
				type: 'float'
			},
			"Statistic:EnergyHomeBat:Month": {
				id: "scb.statistic.EnergyFlow.EnergyHomeBatMonth",
				type: 'float'
			},
			"Statistic:EnergyHomeBat:Total": {
				id: "scb.statistic.EnergyFlow.EnergyHomeBatTotal",
				type: 'float'
			},
			"Statistic:EnergyHomeBat:Year": {
				id: "scb.statistic.EnergyFlow.EnergyHomeBatYear",
				type: 'float'
			},
			"Statistic:EnergyHomeGrid:Day": {
				id: "scb.statistic.EnergyFlow.EnergyHomeGridDay",
				type: 'float'
			},
			"Statistic:EnergyHomeGrid:Month": {
				id: "scb.statistic.EnergyFlow.EnergyHomeGridMonth",
				type: 'float'
			},
			"Statistic:EnergyHomeGrid:Total": {
				id: "scb.statistic.EnergyFlow.EnergyHomeGridTotal",
				type: 'float'
			},
			"Statistic:EnergyHomeGrid:Year": {
				id: "scb.statistic.EnergyFlow.EnergyHomeGridYear",
				type: 'float'
			},
			"Statistic:EnergyHomePv:Day": {
				id: "scb.statistic.EnergyFlow.EnergyHomePvDay",
				type: 'float'
			},
			"Statistic:EnergyHomePv:Month": {
				id: "scb.statistic.EnergyFlow.EnergyHomePvMonth",
				type: 'float'
			},
			"Statistic:EnergyHomePv:Total": {
				id: "scb.statistic.EnergyFlow.EnergyHomePvTotal",
				type: 'float'
			},
			"Statistic:EnergyHomePv:Year": {
				id: "scb.statistic.EnergyFlow.EnergyHomePvYear",
				type: 'float'
			},
			"Statistic:OwnConsumptionRate:Day": {
				id: "scb.statistic.EnergyFlow.OwnConsumptionRateDay",
				type: 'float'
			},
			"Statistic:OwnConsumptionRate:Month": {
				id: "scb.statistic.EnergyFlow.OwnConsumptionRateMonth",
				type: 'float'
			},
			"Statistic:OwnConsumptionRate:Total": {
				id: "scb.statistic.EnergyFlow.OwnConsumptionRateTotal",
				type: 'float'
			},
			"Statistic:OwnConsumptionRate:Year": {
				id: "scb.statistic.EnergyFlow.OwnConsumptionRateYear",
				type: 'float'
			},
			"Statistic:Yield:Day": {
				id: "scb.statistic.EnergyFlow.YieldDay",
				type: 'float'
			},
			"Statistic:Yield:Month": {
				id: "scb.statistic.EnergyFlow.YieldMonth",
				type: 'float'
			},
			"Statistic:Yield:Total": {
				id: "scb.statistic.EnergyFlow.YieldTotal",
				type: 'float'
			},
			"Statistic:Yield:Year": {
				id: "scb.statistic.EnergyFlow.YieldYear",
				type: 'float'
			},
			"Statistic:CO2Saving:Day": {
				id: "scb.statistic.EnergyFlow.CO2SavingDay",
				type: 'float'
			},
			"Statistic:CO2Saving:Month": {
				id: "scb.statistic.EnergyFlow.CO2SavingMonth",
				type: 'float'
			},
			"Statistic:CO2Saving:Year": {
				id: "scb.statistic.EnergyFlow.CO2SavingYear",
				type: 'float'
			},
			"Statistic:CO2Saving:Total": {
				id: "scb.statistic.EnergyFlow.CO2SavingTotal",
				type: 'float'
			}
		}
	}
];

const payload_settings = [
	{
		"moduleid": "devices:local",
		"mappings": {
			"Battery:DynamicSoc:Enable": {
				id: "devices.local.battery.DynamicSoc",
				type: 'boolean'
			},
			"Battery:MinHomeComsumption": {
				id: "devices.local.battery.MinHomeConsumption", // YES, it is named Comsumption in the API
				type: 'float'
			},
			"Battery:MinSoc": {
				id: "devices.local.battery.MinSoc",
				type: 'int'
			},
			"Battery:SmartBatteryControl:Enable": {
				id: "devices.local.battery.SmartBatteryControl",
				type: 'boolean'
			},
			"Battery:Strategy": {
				id: "devices.local.battery.Strategy",
				type: 'int'
			},
			"Battery:SupportedTypes": {
				id: "devices.local.battery.SupportedTypes",
				type: 'int'
			},
			"Battery:Type": {
				id: "devices.local.battery.Type",
				type: 'int'
			},
			"Battery:ExternControl": {
				id: "devices.local.battery.ExternControl",
				type: 'int'
			},
			"Inverter:MaxApparentPower": {
				id: "devices.local.inverter.MaxApparentPower",
				type: 'int'
			},
			"EnergySensor:InstalledSensor": {
				id: "devices.local.EnergySensor",
				type: 'int'
			},
			"OptionKeys:StateKey0": {
				id: "devices.local.StateKey0",
				type: 'int'
			},
			/*"Properties:InverterType": {
				id: "devices.local.inverter.Type",
				type: 'boolean'
			},*/
			"Generator:ExtModuleControl:Enable": {
				id: "devices.local.generator.ExtModuleControl",
				type: 'boolean'
			},
			"Generator:ShadowMgmt:Enable": {
				id: "devices.local.generator.ShadowMgmt",
				type: 'int'
			}
			// "Inverter:ActivePowerLimitation","Inverter:MinActivePowerLimitation","Inverter:MaxActivePowerLimitation","EnergySensor:InstalledSensor","EnergySensor:SupportedSensors","EnergySensor:SensorPosition","EnergySensor:SupportedPositions","DigitalOutputs:Customer:ConfigurationFlags","DigitalInputs:Mode","EnergyMgmt:AcStorage
		}
	},
	{
		"moduleid": "scb:network",
		"mappings": {
			"Hostname": {
				id: "scb.network.Hostname",
				type: 'string'
			},
			"IPv4Address": {
				id: "scb.network.IPv4Address",
				type: 'string'
			},
			"IPv4Auto": {
				id: "scb.network.IPv4Auto",
				type: 'boolean'
			},
			"IPv4DNS1": {
				id: "scb.network.IPv4DNS1",
				type: 'string'
			},
			"IPv4DNS2": {
				id: "scb.network.IPv4DNS2",
				type: 'string'
			},
			"IPv4Gateway": {
				id: "scb.network.IPv4Gateway",
				type: 'string'
			},
			"IPv4Subnetmask": {
				id: "scb.network.IPv4Subnetmask",
				type: 'string'
			}
		}
	},
	{
		"moduleid": "scb:time",
		"mappings": {
			"NTPuse": {
				id: "scb.time.NTPuse",
				type: 'boolean'
			},
			"NTPservers": {
				id: "scb.time.NTPservers",
				type: 'string'
			},
			"Timezone": {
				id: "scb.time.Timezone",
				type: 'string'
			}
		}
	},
	{
		"moduleid": "scb:modbus",
		"mappings": {
			"ModbusEnable": {
				id: "scb.modbus.ModbusEnable",
				type: 'boolean'
			},
			"ModbusUnitId": {
				id: "scb.modbus.ModbusUnitId",
				type: 'int'
			}
		}
	},
	{
		"moduleid": "scb:export",
		"mappings": {
			"LastExport": {
				id: "scb.export.LastExport",
				type: 'timestamp'
			},
			"LastExportOk": {
				id: "scb.export.LastExportOk",
				type: 'timestamp'
			},
			"Portal": {
				id: "scb.export.Portal",
				type: 'int'
			},
			"ExportEnable": {
				id: "scb.export.ExportEnable",
				type: 'boolean'
			}
		}
	}
];

//* mostly taken from js adapter and adjusted https://github.com/ioBroker/ioBroker.javascript

const astroList = ['sunrise', 'sunset', 'sunriseEnd', 'sunsetStart', 'dawn', 'dusk', 'nauticalDawn', 'nauticalDusk', 'nadir', 'nightEnd', 'night', 'goldenHourEnd', 'goldenHour'];
const astroListLc = astroList.map(str => str.toLowerCase());

function getAstroDate(pattern, date, offsetMinutes) {
	if(date === undefined) date = new Date();
	if(typeof date === 'number') date = new Date(date);

	if(astroList.indexOf(pattern) === -1) {
		const pos = astroListLc.indexOf(pattern.toLowerCase());
		if(pos !== -1) pattern = astroList[pos];
	}

	if ((!adapter.config.iob_lat && adapter.config.iob_lat !== 0) ||
		(!adapter.config.iob_lon && adapter.config.iob_lon !== 0)) {
		//adapter.log.error('Longitude or latitude does not set. Cannot use astro.');
		return;
	}

	let ts = suncalc.getTimes(date, adapter.config.iob_lat, adapter.config.iob_lon)[pattern];
	const nadir = suncalc.getTimes(date, adapter.config.iob_lat, adapter.config.iob_lon)['nadir'];
	if(nadir.getDate() === date.getDate() && nadir.getHours() < 12) {
		ts = suncalc.getTimes(date.setDate(date.getDate() + 1), adapter.config.iob_lat, adapter.config.iob_lon)[pattern];
	}
	if(nadir.getDate() !== date.getDate() && nadir.getHours() > 12) {
		ts = suncalc.getTimes(date.setDate(date.getDate() - 1), adapter.config.iob_lat, adapter.config.iob_lon)[pattern];
	}

	if(ts === undefined || ts.getTime().toString() === 'NaN') {
		adapter.log.error('Cannot get astro date for "' + pattern + '"');
	}

	if(offsetMinutes !== undefined) {
		ts = new Date(ts.getTime() + (offsetMinutes * 60000));
	}
	return ts;
}

function isAstroDay() {
	const nowDate = new Date();
	const dayBegin = getAstroDate('sunrise');
	const dayEnd = getAstroDate('sunset');

	if(dayBegin === undefined || dayEnd === undefined) return;

	return (nowDate >= dayBegin && nowDate <= dayEnd);
}

//* start lib

function init(adapterInstance, utilsInstance, weatherInstance) {
	adapter = adapterInstance;
	utils = utilsInstance;
	weather = weatherInstance;
}

function setup(callback) {
	panelWp = getPanelWp();

	adapter.log.info('Configured Wp of panel(s) is ' + Math.round(panelWp));

	deviceIpAdress = adapter.config.ipaddress;
	devicePort = adapter.config.port;
	deviceHttps = adapter.config.https;
	devicePassword = adapter.config.password;

	pollingTime = adapter.config.pollinterval || 10000;
	if(pollingTime < 1000) {
		pollingTime = 1000;
	}

	let city = weather.getCity();
	let fc_url = weather.getForecastUrl();

	ioBLib.createOrSetState('forecast.city', {
		type: 'state',
		common: {
			name: 'City the forecast is for',
			type: 'string',
			role: 'text',
			read: true,
			write: false,
			unit: ''
		},
		native: {}
	}, city);

	ioBLib.createOrSetState('forecast.url', {
		type: 'state',
		common: {
			name: 'Web URL for the forecast',
			type: 'string',
			role: 'link',
			read: true,
			write: false,
			unit: ''
		},
		native: {}
	}, fc_url);

	adapter.log.info('[INFO] Configured polling interval: ' + pollingTime);

	let dataDir = utils.getAbsoluteInstanceDataDir(adapter);

	if (!fs.existsSync(dataDir)){
		fs.mkdirSync(dataDir);
	}

	power_jsonfile = dataDir + '/pwrcons.json';
	pv_jsonfile = dataDir + '/pwrgen.json';
	fc_jsonfile = dataDir + '/fcast.json';
	state_jsonfile = dataDir + '/states.json';

	try {
		let tmpJson = fs.readFileSync(power_jsonfile).toString();
		consumptionData = JSON.parse(tmpJson);
	} catch(e) {
		consumptionData = {};
	}

	try {
		let tmpJson = fs.readFileSync(pv_jsonfile).toString();
		generationData = JSON.parse(tmpJson);

		if(generationData.hours) {
			for(let hidx in generationData.hours) {
				ioBLib.createOrSetState('forecast.day1.power.' + hidx + '.generated', {
					type: 'state',
					common: {
						name: 'Generated plant power for this hour',
						type: 'number',
						role: 'value.power',
						read: true,
						write: false,
						unit: 'Wh'
					},
					native: {}
				}, generationData.hours[hidx]);
			}
		}

	} catch(e) {
		generationData = {};
	}

	try {
		let tmpJson = fs.readFileSync(fc_jsonfile).toString();
		forecastData = JSON.parse(tmpJson);

		cleanUpForecastData();
	} catch(e) {
		forecastData = {};
	}

	try {
		let tmpJson = fs.readFileSync(state_jsonfile).toString();
		jsonStates = JSON.parse(tmpJson);
	} catch(e) {
		jsonStates = {};
	}

	callback && callback();
}

function cleanUpForecastData() {
	let curTime = (new Date()).getTime();
	let newFcData = {};
	for(let fcIdx in forecastData) {
		if(forecastData[fcIdx].time && forecastData[fcIdx].time > curTime - (7 * 24 * 3600 * 1000)) {
			newFcData[fcIdx] = forecastData[fcIdx];
		}
	}
	forecastData = newFcData;
}

function unload(callback) {
	if(polling) {
		clearTimeout(polling);
	}
	if(sunTimer) {
		clearTimeout(sunTimer);
	}

	fs.writeFileSync(power_jsonfile, JSON.stringify(consumptionData));
	fs.writeFileSync(pv_jsonfile, JSON.stringify(generationData));
	fs.writeFileSync(fc_jsonfile, JSON.stringify(forecastData));
	fs.writeFileSync(state_jsonfile, JSON.stringify(jsonStates));

	try {
		apiCall('POST', 'auth/logout', null, function(body, code, headers) {
			if(code !== 200) {
				adapter.log.warn('Logout failed with code ' + code);
			} else {
				adapter.log.info('Logged out from API');
			}
		});
		adapter.log.info('[END] Stopping plenticore adapter...');
		adapter.setState('info.connection', false, true);
		callback();
	} catch(e) {
		callback();
	}
}

//* partly taken from https://forum.iobroker.net/topic/4953/script-sonnenstand-und-einstrahlung
Math.degrees = function(radians) {return radians * 180 / Math.PI;};
Math.radians = function(degrees) {return degrees * Math.PI / 180;};

function getPanelWp() {
	let wp = adapter.config.panel_surface * 10 * adapter.config.panel_efficiency; // * 1000 / 100

	if(adapter.config.panel_surface_2 && adapter.config.panel_efficiency_2) {
		wp = wp + (adapter.config.panel_surface_2 * 10 * adapter.config.panel_efficiency_2);
	}

	return wp;
}

function getSunPosPower(atdate) {
	adapter.log.debug('Started getSunPosPower ' + JSON.stringify(atdate));
	if(!adapter.config.iob_lat || !adapter.config.iob_lon) {
		return false;
	} else if(!adapter.config.panel_tilt && adapter.config.panel_tilt !== '0') {
		return false;
	} else if(!adapter.config.panel_dir && adapter.config.panel_dir !== '0') {
		return false;
	} else if(!adapter.config.panel_surface) {
		return false;
	} else if(!adapter.config.panel_efficiency) {
		return false;
	}

    if(!atdate) {
        atdate = new Date();
    }

	const SOLAR_CONSTANT = 1366.1;
	const ASIN_CONSTANT = 4 * Math.asin(1) / 360;

	let start = new Date(atdate.getFullYear(), 0, 0);
	let yearstartdiff = (atdate - start) + ((start.getTimezoneOffset() - atdate.getTimezoneOffset()) * 60 * 1000);
	let dayofyear = Math.floor(yearstartdiff / (1000 * 60 * 60 * 24));

	let earth_sun_angle = (2 * Math.PI / 365) * (dayofyear - 1);
	let radiation = (1.00011 + 0.034221 * Math.cos(earth_sun_angle) + 0.00128 * Math.sin(earth_sun_angle) + 0.000719 * Math.cos(2 * earth_sun_angle) + 0.000077 * Math.sin(2 * earth_sun_angle));
	radiation = SOLAR_CONSTANT * radiation / 1000;

    let sunpos = suncalc.getPosition(atdate, adapter.config.iob_lat, adapter.config.iob_lon);
    let altitude = Math.degrees(sunpos.altitude);
    let azimuth =  Math.degrees(sunpos.azimuth) + 180;

    var airmass = 1 / Math.cos((90 - altitude) * ASIN_CONSTANT);

	adapter.log.debug('Using solar radiation value of ' + radiation);

    var Sincident = (radiation * Math.pow(0.78, Math.pow(airmass, 0.6)));
	if(isNaN(Sincident)) {
		Sincident = 0;
	}

    var fraction = (Math.cos(altitude * ASIN_CONSTANT) * Math.sin(adapter.config.panel_tilt * ASIN_CONSTANT) * Math.cos(azimuth * ASIN_CONSTANT - adapter.config.panel_dir * ASIN_CONSTANT)) + (Math.sin(altitude * ASIN_CONSTANT) * Math.cos(adapter.config.panel_tilt * ASIN_CONSTANT));
	var fraction_2 = 0;

    var SmoduleInt = Sincident * fraction * adapter.config.panel_surface * 1000;
	var SmoduleInt_2 = 0;
    if(SmoduleInt < 0) {
        SmoduleInt = 0;
    }

	var SmoduleEff = SmoduleInt * adapter.config.panel_efficiency / 100;
	var SmoduleEff_2 = 0;

	if((adapter.config.panel_tilt_2 || adapter.config.panel_tilt_2 === 0) && (adapter.config.panel_dir_2 || adapter.config.panel_dir_2 === 0) && adapter.config.panel_surface_2 && adapter.config.panel_efficiency_2) {
		fraction_2 = Math.cos(altitude * ASIN_CONSTANT) * Math.sin(adapter.config.panel_tilt_2 * ASIN_CONSTANT) * Math.cos(azimuth * ASIN_CONSTANT - adapter.config.panel_dir_2 * ASIN_CONSTANT) + Math.sin(altitude * ASIN_CONSTANT) * Math.cos(adapter.config.panel_tilt_2 * ASIN_CONSTANT);
		SmoduleInt_2 = Sincident * fraction_2 * adapter.config.panel_surface_2 * 1000;
		if(SmoduleInt_2 < 0) {
			SmoduleInt_2 = 0;
		}
		SmoduleEff_2 = SmoduleInt_2 * adapter.config.panel_efficiency_2 / 100;
		SmoduleEff += SmoduleEff_2;
	}


    if(altitude < 0) {
        SmoduleInt = 0;
        SmoduleEff = 0;
        altitude = 0;
    }/* else if(altitude < 8.5 && azimuth > 200) {
        SmoduleEff *= 0.18;
        SmoduleInt *= 0.18;
    } else if(altitude < 4.5 && azimuth < 200) {
        SmoduleEff *= 0.25;
        SmoduleInt *= 0.25;
    }*/ //those were adjustments for my local plant

	let res = {
        altitude: altitude.toFixed(1),
        azimuth: azimuth.toFixed(),
        panelpower: SmoduleEff.toFixed()
    };
	adapter.log.debug('getSunPosPower result: ' + JSON.stringify(res));

    return res;
}

function getSkyMultiplier(sky) {
	let multisky;

	if(typeof sky === 'object') {
		let m1 = 1 - (sky.low / 100);
		let m2 = 1 - (sky.medium / 100);
		let m3 = 1 - (sky.high / 100);

		sky = 1 - (m1 * m2 * m3);
	} else {
		sky = sky / 100;
	}

	//multisky = 0.35 + (0.65 * (1 - sky));
	multisky = 1 - (0.90 * Math.pow(sky, 1.2));

	/*if(typeof sky === 'object') {
		let m1 = 1 - (sky.low / 100);
		let m2 = 1 - (sky.medium / 100);
		let m3 = 1 - (sky.high / 100);

		let msky = 1 - (m1 * m2 * m3);
		multisky = 1 - (0.75 * Math.pow(msky, 1.5));

		let msum = sky.low + sky.medium + sky.high;
		if(msum < 100) {
			msum = 100;
		}

		multisky = Math.pow(multisky, msum/100);
	} else {
		multisky = 1 - (0.75 * Math.pow(sky/100, 3));

		multisky = multisky * multisky;
	}*/

	return multisky;
}

function getArrayCleanAvg(arr) {
	if(typeof arr === 'object' && Array.isArray(arr) !== true) {
		let tmp = [];
		for(let idx in arr) {
			tmp.push(arr[idx]);
		}
		arr = tmp;
	}

	if(!arr.length) {
		return null;
	}

	let tmp_average = getArrayAvg(arr);
	let tmp_max = getArrayMax(arr);
	let tmp_min = getArrayMin(arr);

	let tmp_values = [];

	let spread = tmp_max - tmp_min;
	for(let i = 0; i < arr.length; i++) {
		if(Math.abs(arr[i] - tmp_average) < (spread / 2) + 0.001) {
			tmp_values.push(arr[i]);
		}
	}
	arr = tmp_values;

	return getArrayAvg(arr);
}



function getArrayAvg(arr) {
	if(typeof arr === 'object' && Array.isArray(arr) !== true) {
		let tmp = [];
		for(let idx in arr) {
			tmp.push(arr[idx]);
		}
		arr = tmp;
	}

	if(!arr.length) {
		return null;
	}

	return arr.reduce((a,b) => (a ? a : 0) + (b ? b : 0), 0) / arr.length;
}

function getArrayMin(arr) {
	if(typeof arr === 'object' && Array.isArray(arr) !== true) {
		let tmp = [];
		for(let idx in arr) {
			tmp.push(arr[idx]);
		}
		arr = tmp;
	}

	if(!arr.length) {
		return null;
	}

	return arr.reduce((acc, cur) => ((acc === null || cur < acc) && cur !== null ? cur : acc));
}

function getArrayMax(arr) {
	if(typeof arr === 'object' && Array.isArray(arr) !== true) {
		let tmp = [];
		for(let idx in arr) {
			tmp.push(arr[idx]);
		}
		arr = tmp;
	}

	if(!arr.length) {
		return null;
	}

	return arr.reduce((acc, cur) => ((cur > acc || acc === null) && cur !== null ? cur : acc));
}

function checkStoreSunPanelSkyData(panel_power, adapter_data) {
	let tmp_sky = adapter_data['kachelmannwetter']['sky'];
	let tmp_vis = adapter_data['kachelmannwetter']['visibility'];
	let tmp_rain = adapter_data['kachelmannwetter']['rain'];
	let tmp_rain_chance = adapter_data['kachelmannwetter']['rainChance'];
	if(tmp_sky === null || tmp_vis === null || tmp_rain === null) {
		return false;
	}

	let sky_values = [tmp_sky];
	let vis_values = [tmp_vis];
	let rain_values = [tmp_rain];
	let rain_chance_values = [tmp_rain_chance];

	tmp_sky = adapter_data['kachelmannwetter_suihd']['sky'];
	tmp_vis = adapter_data['kachelmannwetter_suihd']['visibility'];
	tmp_rain = adapter_data['kachelmannwetter_suihd']['rain'];
	tmp_rain_chance = adapter_data['kachelmannwetter_suihd']['rainChance'];
	if(tmp_sky === null || tmp_vis === null || tmp_rain === null) {
		return false;
	}

	sky_values.push(tmp_sky);
	vis_values.push(tmp_vis);
	rain_values.push(tmp_rain);
	rain_chance_values.push(tmp_rain_chance);

	tmp_sky = adapter_data['metno']['sky'];
	tmp_vis = adapter_data['metno']['visibility'];
	tmp_rain = adapter_data['metno']['rain'];
	tmp_rain_chance = adapter_data['metno']['rainChance'];
	if(tmp_sky === null || tmp_vis === null || tmp_rain === null) {
		return false;
	}

	sky_values.push(tmp_sky);
	vis_values.push(tmp_vis);
	rain_values.push(tmp_rain);
	if(tmp_rain_chance !== null) {
		rain_chance_values.push(tmp_rain_chance);
	}

	for(let weatherAdapter in weatherAdapters) {
		if(weatherAdapters[weatherAdapter]['instance'] !== null) {
			tmp_sky = adapter_data[weatherAdapter]['sky'];
			tmp_vis = adapter_data[weatherAdapter]['visibility'];
			tmp_rain = adapter_data[weatherAdapter]['rain'];
			tmp_rain_chance = adapter_data[weatherAdapter]['rainChance'];
			if(tmp_sky === null || tmp_vis === null || tmp_rain === null) {
				return false;
			}

			sky_values.push(tmp_sky);
			vis_values.push(tmp_vis);
			rain_values.push(tmp_rain);
			if(tmp_rain_chance !== null) {
				rain_chance_values.push(tmp_rain_chance);
			}
		}
	}

	// final average
	let avg_sky = getArrayCleanAvg(sky_values);
	let avg_vis = getArrayCleanAvg(vis_values);
	let avg_rain = getArrayCleanAvg(rain_values);
	let avg_rain_chance = getArrayCleanAvg(rain_chance_values);

	storeSunPanelSkyData(panel_power, avg_sky, avg_vis, avg_rain, avg_rain_chance);
}

function getVisMultiplier(vis) {
	let multiplier = 1;

	if(vis < 16) {
		multiplier = 0.35 + (0.65 * (vis / 16));
	}

	return multiplier;
}

function getRainMultiplier(rain) {
	let multiplier = 1;

	if(rain > 0) {
		multiplier = rain / 10;
		multiplier = 1 - (0.5 * Math.pow(multiplier, 0.85));
		if(multiplier < 0.3) {
			multiplier = 0.3;
		}
	}

	return multiplier;
}

function getRainChanceMultiplier(rain_chance) {
	let multiplier = 1;

	if(rain_chance >= 80) {
		multiplier = (rain_chance - 80) / 10;
		multiplier = 1 - (0.4 * Math.pow(multiplier, 0.85));
	}

	return multiplier;
}

function storeSunPanelSkyData(panel_power, multisky, vis, rain, rain_chance) {
	let vis_multiplier = getVisMultiplier(vis);

	let rain_multiplier = getRainMultiplier(rain);
	let rain_chance_multiplier = getRainChanceMultiplier(rain_chance);

	ioBLib.createOrSetState('forecast.current.power.sky', {
		type: 'state',
		common: {
			name: 'Current estimated max power with clouds',
			type: 'number',
			role: 'value.power',
			read: true,
			write: false,
			unit: 'W'
		},
		native: {}
	}, panel_power * multisky);

	ioBLib.createOrSetState('forecast.current.power.skyvis', {
		type: 'state',
		common: {
			name: 'Current estimated max power with clouds and visibility',
			type: 'number',
			role: 'value.power',
			read: true,
			write: false,
			unit: 'W'
		},
		native: {}
	}, panel_power * multisky * vis_multiplier);

	ioBLib.createOrSetState('forecast.current.power.skyvisrain', {
		type: 'state',
		common: {
			name: 'Current estimated max power with clouds and visibility and rain',
			type: 'number',
			role: 'value.power',
			read: true,
			write: false,
			unit: 'W'
		},
		native: {}
	}, panel_power * multisky * vis_multiplier * rain_multiplier * rain_chance_multiplier);
}

function storeSunPanelData() {
	if(sunTimer) {
		sunTimer = null;
		clearTimeout(sunTimer);
	}

    let result = getSunPosPower();

	ioBLib.createOrSetState('forecast.current.sun.elevation', {
		type: 'state',
		common: {
			name: 'Current sun elevation',
			type: 'number',
			role: 'value.elevation',
			read: true,
			write: false,
			unit: '°'
		},
		native: {}
	}, parseFloat(result.altitude));

	ioBLib.createOrSetState('forecast.current.sun.azimuth', {
		type: 'state',
		common: {
			name: 'Current sun azimuth',
			type: 'number',
			role: 'value.azimuth',
			read: true,
			write: false,
			unit: '°'
		},
		native: {}
	}, parseFloat(result.azimuth));

	ioBLib.createOrSetState('forecast.current.power.max', {
		type: 'state',
		common: {
			name: 'Current maximum power possible',
			type: 'number',
			role: 'value.power',
			read: true,
			write: false,
			unit: 'W'
		},
		native: {}
	}, parseFloat(result.panelpower));

	let adapterValues = {};

	let skyMultiplier = 1;
	let kmFc;

	for(let kmType of ['primary', 'secondary', 'metno']) {
		let kmIdent = 'kachelmannwetter';
		if(kmType === 'secondary') {
			kmIdent = 'kachelmannwetter_suihd';
		} else if(kmType === 'metno') {
			kmIdent = 'metno';
		}

		kmFc = weather.getForecastFor((new Date()).getTime(), true, kmType);
		adapter.log.debug('Using ' + kmIdent + ' data for current time: ' + JSON.stringify(kmFc));
		if(kmFc) {
			let setValue = kmFc.clouds;
			if(setValue === null) {
				setValue = 0;
			}

			ioBLib.createOrSetState('forecast.current.sky.' + kmIdent, {
				type: 'state',
				common: {
					name: 'Current cloud forecast from weather adapter',
					type: 'number',
					role: 'value.clouds',
					read: true,
					write: false,
					unit: '%'
				},
				native: {}
			}, setValue);

			ioBLib.createOrSetState('forecast.current.visibility.' + kmIdent, {
				type: 'state',
				common: {
					name: 'Current visibility forecast from weather adapter',
					type: 'number',
					role: 'value.visibility',
					read: true,
					write: false,
					unit: 'km'
				},
				native: {}
			}, 16); // not applicable here

			ioBLib.createOrSetState('forecast.current.rain.' + kmIdent, {
				type: 'state',
				common: {
					name: 'Current rain forecast from weather adapter',
					type: 'number',
					role: 'value.precipitation',
					read: true,
					write: false,
					unit: 'mm'
				},
				native: {}
			}, kmFc.rain);

			if(kmFc.rainChance !== null) {
				ioBLib.createOrSetState('forecast.current.rainChance.' + kmIdent, {
					type: 'state',
					common: {
						name: 'Current rain chance forecast from weather adapter',
						type: 'number',
						role: 'value.precipitation.chance',
						read: true,
						write: false,
						unit: '%'
					},
					native: {}
				}, kmFc.rainChance);
			}

			setValue = kmFc.cloud_details;

			ioBLib.createOrSetState('forecast.current.sky_low.' + kmIdent, {
				type: 'state',
				common: {
					name: 'Current cloud forecast low height',
					type: 'number',
					role: 'value.clouds',
					read: true,
					write: false,
					unit: '%'
				},
				native: {}
			}, setValue.low);

			ioBLib.createOrSetState('forecast.current.sky_medium.' + kmIdent, {
				type: 'state',
				common: {
					name: 'Current cloud forecast medium height',
					type: 'number',
					role: 'value.clouds',
					read: true,
					write: false,
					unit: '%'
				},
				native: {}
			}, setValue.medium);

			ioBLib.createOrSetState('forecast.current.sky_high.' + kmIdent, {
				type: 'state',
				common: {
					name: 'Current cloud forecast high clouds',
					type: 'number',
					role: 'value.clouds',
					read: true,
					write: false,
					unit: '%'
				},
				native: {}
			}, setValue.high);

			skyMultiplier = getSkyMultiplier(setValue);

			adapterValues[kmIdent] = {
				'sky': skyMultiplier,
				'visibility': 16,
				'rain': kmFc.rain,
				'rainChance': kmFc.rainChance
			};
		}
	}

	for(let weatherAdapter in weatherAdapters) {
		if(weatherAdapters[weatherAdapter]['instance'] !== null) {
			adapterValues[weatherAdapter] = {
				'sky': null,
				'visibility': null,
				'rain': null,
				'rainChance': null
			};

			let wfc_id = weatherAdapters[weatherAdapter]['instance'] + '.' + weatherAdapters[weatherAdapter]['fc_id'];
			wfc_id = wfc_id.replace('%%D%%', '1');
			if(weatherAdapters[weatherAdapter]['fc_mode'] && weatherAdapters[weatherAdapter]['fc_mode'] === 'dayhours') {
				let tmpHour = (new Date()).getHours();
				if(tmpHour === 0) {
					tmpHour = 24;
				}
				wfc_id = wfc_id.replace('%%H%%', tmpHour + '');
			} else {
				wfc_id = wfc_id.replace('%%H%%', weatherAdapters[weatherAdapter]['fc_min']);
			}

			let wfc_skyid = wfc_id + '.' + weatherAdapters[weatherAdapter]['sky'];

			adapter.getForeignState(wfc_skyid, function(err, state) {
				if(!err) {
					if(state) {
						ioBLib.createOrSetState('forecast.current.sky.' + weatherAdapter, {
							type: 'state',
							common: {
								name: 'Current cloud forecast from weather adapter',
								type: 'number',
								role: 'value.clouds',
								read: true,
								write: false,
								unit: '%'
							},
							native: {}
						}, state.val);

						adapterValues[weatherAdapter]['sky'] = getSkyMultiplier(state.val);
						checkStoreSunPanelSkyData(result.panelpower, adapterValues);
					} else {
						adapter.log.warn('Got invalid state (null) from state id ' + wfc_skyid);
					}
				}
			});

			let wfc_rainid = wfc_id + '.' + weatherAdapters[weatherAdapter]['rain'];
			adapter.getForeignState(wfc_rainid, function(err, state) {
				if(!err) {
					if(state) {
						ioBLib.createOrSetState('forecast.current.rain.' + weatherAdapter, {
							type: 'state',
							common: {
								name: 'Current rain forecast from weather adapter',
								type: 'number',
								role: 'value.precipitation',
								read: true,
								write: false,
								unit: 'mm'
							},
							native: {}
						}, state.val);

						adapterValues[weatherAdapter]['rain'] = state.val;
						checkStoreSunPanelSkyData(result.panelpower, adapterValues);
					} else {
						adapter.log.warn('Got invalid state (null) from state id ' + wfc_rainid);
					}
				}
			});

			if(weatherAdapters[weatherAdapter]['rainChance'] !== null) {
				let wfc_rchanceid = wfc_id + '.' + weatherAdapters[weatherAdapter]['rainChance'];
				adapter.getForeignState(wfc_rchanceid, function(err, state) {
					if(!err) {
						if(state) {
							ioBLib.createOrSetState('forecast.current.rainChance.' + weatherAdapter, {
								type: 'state',
								common: {
									name: 'Current rain chance forecast from weather adapter',
									type: 'number',
									role: 'value.precipitation.chance',
									read: true,
									write: false,
									unit: '%'
								},
								native: {}
							}, state.val);

							adapterValues[weatherAdapter]['rainChance'] = state.val;
							checkStoreSunPanelSkyData(result.panelpower, adapterValues);
						} else {
							adapter.log.warn('Got invalid state (null) from state id ' + wfc_rchanceid);
						}
					}
				});
			} else {
				adapterValues[weatherAdapter]['rainChance'] = null;
				checkStoreSunPanelSkyData(result.panelpower, adapterValues);
			}

			if(weatherAdapters[weatherAdapter]['visibility'] !== null) {
				let wfc_visid = wfc_id + '.' + weatherAdapters[weatherAdapter]['visibility'];
				adapter.getForeignState(wfc_visid, function(err, state) {
					if(!err) {
						if(state) {
							ioBLib.createOrSetState('forecast.current.visibility.' + weatherAdapter, {
								type: 'state',
								common: {
									name: 'Current visibility forecast from weather adapter',
									type: 'number',
									role: 'value.visibility',
									read: true,
									write: false,
									unit: 'km'
								},
								native: {}
							}, state.val);

							adapterValues[weatherAdapter]['visibility'] = state.val;
							checkStoreSunPanelSkyData(result.panelpower, adapterValues);
						} else {
							adapter.log.warn('Got invalid state (null) from state id ' + wfc_visid);
						}
					}
				});
			} else {
				adapterValues[weatherAdapter]['visibility'] = 16;
				checkStoreSunPanelSkyData(result.panelpower, adapterValues);
			}
		}
	}

	checkStoreSunPanelSkyData(result.panelpower, adapterValues);

	sunTimer = setTimeout(function() {
		storeSunPanelData();
	}, 60000);
}

function apiCall(method, endpoint, data, callback) {
	if(!method) {
		adapter.log.warn('Missing method in http request');
		return;
	} else if(!endpoint) {
		adapter.log.warn('Missing endpoint in http request');
		return;
	}
	method = method.toUpperCase();
	if(typeof data !== 'string') {
		data = JSON.stringify(data);
	}
	var headers = {
		'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:71.0) Gecko/20100101 Firefox/71.0'
	};
	if(data) {
		headers['Content-Type'] = 'application/json';
	}
	if(loginSessionId) {
		headers['Authorization'] = 'Session ' + loginSessionId;
	}
	var reqOpts = {
		method: method,
		port: devicePort,
		host: deviceIpAdress,
		path: apiurl + endpoint,
		headers: headers,
		rejectUnauthorized: false
	};

	var request;
	if(deviceHttps) {
		request = https.request(reqOpts);
	} else {
		request = http.request(reqOpts);
	}
	adapter.log.debug('Making request to endpoint ' + endpoint + ' with data ' + JSON.stringify(reqOpts));
	request.on('response', function(response) {
		let code = response.statusCode;
		let headers = response.headers;
		response.setEncoding('utf8');
		var body = '';
		response.on('data', function(chunk) {
			body += chunk;
		});
		response.on('end', function() {
			adapter.log.debug('Result of request: ' + JSON.stringify({code: code, headers: headers, body: body}));
			if(code === 401 || code === 403) {
				adapter.log.debug('Request failed: ' + JSON.stringify({code: code, headers: headers, body: body}));
				adapter.terminate && adapter.terminate() || process.exit();
				return;
			}
			callback && callback(body, code, headers);
		});
	});

	request.on('error', function(error) {
		adapter.log.warn('API request failed with error ' + JSON.stringify(error));
		callback && callback('', 0, null);
	});
	request.on('close', function() {
		adapter.log.debug('API connection closed');
	});

	if(data && (method === 'POST' || method === 'PUT')) {
		adapter.log.debug('Sending post data to request: ' + data);
		request.write(data);
	}
	request.end();
}

function getForecastDataFor(time) {
	let hindex;

	let data = {
		'cloudCover': [],
		'visibility': [],
		'rain': [],
		'rainChance': []
	};
	for(let i = 0; i < 50; i++) {
		hindex = i + 'h';
		if(!forecastHours[hindex] || !forecastHours[hindex].minTime || !forecastHours[hindex].maxTime) {
			adapter.log.info('Missing minTime or maxTime for ' + hindex);
			continue;
		}
		if(forecastHours[hindex].minTime > time.getTime() + (60 * 30 * 1000) || forecastHours[hindex].maxTime < time.getTime() - (60 * 30 * 1000)) {
			//adapter.log.info('NOT Matching hindex for time ' + time + ' is ' + hindex + ' (' + forecastHours[hindex].minTime + ' -> ' + forecastHours[hindex].maxTime + ')');
			continue;
		}

		adapter.log.debug('Matching hindex for time ' + time + ' is ' + hindex + ' (' + (new Date(forecastHours[hindex].minTime)) + ' -> ' + (new Date(forecastHours[hindex].maxTime)) + ')');
		for(let dataIdx of ['visibility','cloudCover','rain','rainChance']) {
			for(let idx in forecastHours[hindex][dataIdx+'Data']) {
				if(!forecastHours[hindex]['timeData'] || !forecastHours[hindex]['timeData'][idx]) {
					continue;
				}
				if(forecastHours[hindex]['timeData'][idx] > time.getTime() + (20*60*1000)) {
					continue;
				}
				if(forecastHours[hindex]['timeData'][idx] < time.getTime() - (45*60*1000)) {
					continue;
				}
				data[dataIdx].push(forecastHours[hindex][dataIdx+'Data'][idx]);
				adapter.log.debug('Matching hindex for time ' + time + ' is ' + hindex + ' of ' + idx + ' (' + (new Date(forecastHours[hindex]['timeData'][idx])) + ')');
			}
		}
	}

	data['visibility'] = getArrayCleanAvg(data['visibility']);
	data['cloudCover'] = getArrayCleanAvg(data['cloudCover']);
	data['rain'] = getArrayCleanAvg(data['rain']);
	data['rainChance'] = getArrayCleanAvg(data['rainChance']);

	return data;
}

function readForecastData(callback) {
	let fc;
	let hindex;
	let setValue;

	forecastHours = {};

	for(let i = 0; i < 50; i++) {
		hindex = i + 'h';
		fc = weather.getForecastHour(i);
		if(null !== fc) {
			setValue = getSkyMultiplier(fc.cloud_details);
			forecastHours[hindex] = {
				cloudCover: setValue,
				cloudCoverData: {
					'kachelmannwetter': setValue
				},
				visibility: 16,
				visibilityData: {
					'kachelmannwetter': 16
				},
				time: fc.time,
				minTime: fc.time,
				maxTime: fc.time,
				timeData: {
					'kachelmannwetter': fc.time
				},
				rain: fc.rain,
				rainData: {
					'kachelmannwetter': fc.rain
				},
				rainChancec: fc.rainChance,
				rainChanceData: {
					'kachelmannwetter': fc.rainChance
				}
			};
		} else {
			forecastHours[hindex] = {
				cloudCover: null,
				cloudCoverData: {},
				visibility: null,
				visibilityData: {},
				time: null,
				minTime: null,
				maxTime: null,
				timeData: {},
				rain: null,
				rainData: {},
				rainChance: null,
				rainChanceData: {}
			};
		}

		fc = weather.getForecastHour(i, 'secondary');
		if(null !== fc) {
			forecastHours[hindex]['cloudCoverData']['kachelmannwetter_suihd'] = getSkyMultiplier(fc.cloud_details);
			forecastHours[hindex]['timeData']['kachelmannwetter_suihd'] = fc.time;
			forecastHours[hindex]['rainData']['kachelmannwetter_suihd'] = fc.rain;
			forecastHours[hindex]['rainChanceData']['kachelmannwetter_suihd'] = fc.rainChance;

			if(forecastHours[hindex]['visibility'] === null) {
				forecastHours[hindex]['visibility'] = 16;
				forecastHours[hindex]['visibilityData'] = {
					'kachelmannwetter_suihd': 16
				};
			}
		}

		fc = weather.getForecastHour(i, 'metno');
		if(null !== fc) {
			forecastHours[hindex]['cloudCoverData']['metno'] = getSkyMultiplier(fc.cloud_details);
			forecastHours[hindex]['timeData']['metno'] = fc.time;
			forecastHours[hindex]['rainChanceData']['metno'] = fc.rainChance;

			if(fc.visibility !== null) {
				forecastHours[hindex]['visibilityData']['metno'] = fc.visibility;
			}
		}

		// calc averages
		for(let idx of ['cloudCover', 'time', 'rain', 'rainChance', 'visibility']) {
			let tmpValues = [];
			if(!forecastHours[hindex][idx+'Data']) {
				continue;
			}
			for(let provider in forecastHours[hindex][idx+'Data']) {
				tmpValues.push(forecastHours[hindex][idx+'Data'][provider]);
			}
			let tmpAvg;
			if(idx !== 'time') {
				tmpAvg = getArrayCleanAvg(tmpValues);
			} else {
				tmpAvg = getArrayAvg(tmpValues);
			}
			forecastHours[hindex][idx] = tmpAvg;
			//adapter.log.debug('New average for ' + hindex + ' / ' + idx + ' is ' + tmpAvg);
		}

		forecastHours[hindex]['minTime'] = getArrayMin(forecastHours[hindex]['timeData']);
		forecastHours[hindex]['maxTime'] = getArrayMax(forecastHours[hindex]['timeData']);
	}

	let toRead = [];
	for(let weatherAdapter in weatherAdapters) {
		if(weatherAdapters[weatherAdapter]['instance'] !== null) {
			toRead.push(weatherAdapter);
		}
	}

	readForecastFromAdapters(toRead, callback);
}

function readForecastFromAdapters(toRead, callback) {
	if(toRead.length < 1) {
		adapter.log.debug('FORECAST READ: ' + JSON.stringify(forecastHours));
		callback(false);
		return;
	}

	let weatherAdapter = toRead.shift();
	adapter.log.debug('GET forecast for ' + weatherAdapter);

	readCloudForecast(weatherAdapter, function(err) {
		if(err) {
			adapter.log.warn('Failed reading cloud forecast info from ' + weatherAdapter);
			callback(err);
		} else {
			readVisibilityForecast(weatherAdapter, function(err) {
				if(err) {
					adapter.log.warn('Failed reading visibilitx forecast info from ' + weatherAdapter);
					callback(err);
				} else {
					readRainForecast(weatherAdapter, function(err) {
						if(err) {
							adapter.log.warn('Failed reading rain forecast info from ' + weatherAdapter);
							callback(err);
						} else {
							readForecastTimes(weatherAdapter, function(err) {
								if(err) {
									adapter.log.warn('Failed reading forecast time info from ' + weatherAdapter);
									callback(err);
								} else {
									readForecastFromAdapters(toRead, callback);
								}
							});
						}
					});
				}
			});
		}
	});

}

function getFcMinMax(weatherAdapter) {
	let min = weatherAdapters[weatherAdapter]['fc_min'];
	let max = weatherAdapters[weatherAdapter]['fc_max'];
	let daymode = (weatherAdapters[weatherAdapter]['fc_mode'] && weatherAdapters[weatherAdapter]['fc_mode'] === 'dayhours');
	let subhours = 0;

	if(daymode === true) {
		max = max * 24;
		min = (new Date()).getHours() + 1;
		subhours = min;
	}

	return {
		'min': min,
		'max': max,
		'daymode': daymode,
		'subhours': subhours
	};
}

function readCloudForecast(weatherAdapter, callback) {
	let fc = getFcMinMax(weatherAdapter);
	readFieldLoop(weatherAdapter, 'sky', fc.min, fc.max, callback, fc.daymode, fc.subhours);
}

function readVisibilityForecast(weatherAdapter, callback) {
	let fc = getFcMinMax(weatherAdapter);
	readFieldLoop(weatherAdapter, 'visibility', fc.min, fc.max, callback, fc.daymode, fc.subhours);
}

function readRainForecast(weatherAdapter, callback) {
	let fc = getFcMinMax(weatherAdapter);
	readFieldLoop(weatherAdapter, 'rain', fc.min, fc.max, callback, fc.daymode, fc.subhours);
}

function readForecastTimes(weatherAdapter, callback) {
	let fc = getFcMinMax(weatherAdapter);
	readFieldLoop(weatherAdapter, 'time', fc.min, fc.max, callback, fc.daymode, fc.subhours);
}

function readFieldLoop(weatherAdapter, field, current, max, callback, daymode, subhours) {
	//adapter.log.info('readFieldLoop(' + weatherAdapter + ', ' + field + ', ' + current + ', ' + max + ', ' + (daymode ? 'true' : 'false') + ', ' + subhours + ')');
	let wfc_id = weatherAdapters[weatherAdapter]['instance'] + '.' + weatherAdapters[weatherAdapter]['fc_id'];
	let wfc_steps = 1;
	if(daymode) {
		let day = Math.floor((current - 1) / 24);
		let hour = current - (day * 24);
		let dayidx = (day + 1) + '';
		wfc_id = wfc_id.replace('%%D%%', dayidx);

		wfc_steps = weatherAdapters[weatherAdapter]['fc_steps'][dayidx];
		if(wfc_steps > 1) {
			hour = 1 + Math.floor((hour - 1) / wfc_steps);
		}

		wfc_id = wfc_id.replace('%%H%%', hour);
	} else {
		wfc_id = wfc_id.replace('%%H%%', current);
	}
	if(!subhours) {
		subhours = 0;
	}

	let wfc_field = weatherAdapters[weatherAdapter][field];
	if(wfc_field === null) {
		callback(false);
		return;
	}
	adapter.getForeignState(wfc_id + '.' + wfc_field, function(err, state) {
		if(err) {
			if(callback) {
				callback(err);
			}
		} else if(!state) {
			adapter.log.warn('Could not read ' + wfc_id + '.' + wfc_field + '. It returned null state.');
			if(current >= max) {
				callback(false);
			} else {
				readFieldLoop(weatherAdapter, field, current + 1, max, callback, daymode, subhours);
			}
		} else {
			let hindex = (current - subhours) + 'h';
			if(!forecastHours[hindex]) {
				forecastHours[hindex] = {
					cloudCover: null,
					cloudCoverData: {},
					visibility: null,
					visibilityData: {},
					time: null,
					minTime: null,
					maxTime: null,
					timeData: {},
					rain: null,
					rainData: {},
					rainChance: null,
					rainChanceData: {}
				};
				forecastHours[hindex]['cloudCoverData'][weatherAdapter] = null;
				forecastHours[hindex]['visibilityData'][weatherAdapter] = null;
				forecastHours[hindex]['timeData'][weatherAdapter] = null;
				forecastHours[hindex]['rainData'][weatherAdapter] = null;
				forecastHours[hindex]['rainChanceData'][weatherAdapter] = null;
			}

			let usefield = field;
			if(field === 'sky' || field === 'cloudCover') {
				usefield = 'cloudCover';
				state.val = getSkyMultiplier(state.val);
			} else if(field === 'time') {
				let tmptime;
				if(daymode) {
					tmptime = new Date();
					tmptime.setUTCHours(tmptime.getUTCHours() + current - subhours);
					tmptime = tmptime.getTime();
				} else {
					tmptime = (new Date(state.val)).getTime();
				}
				state.val = tmptime;
			} else if(field === 'rain' && wfc_steps > 1) {
				state.val = state.val / wfc_steps;
			}

			forecastHours[hindex][usefield + 'Data'][weatherAdapter] = state.val;
			let allValues = [];
			for(let tmp in forecastHours[hindex][usefield + 'Data']) {
				allValues.push(forecastHours[hindex][usefield + 'Data'][tmp]);
			}


			let avgValue;
			if(field === 'sky' || field === 'visibility' || field === 'rain' || field === 'rainChance') {
				avgValue = getArrayCleanAvg(allValues);
			} else {
				avgValue = getArrayAvg(allValues);
			}

			forecastHours[hindex][usefield] = avgValue;

			if(field === 'time') {
				forecastHours[hindex]['minTime'] = getArrayMin(forecastHours[hindex]['timeData']);
				//adapter.log.info('min of hindex ' + hindex + ': ' + JSON.stringify(forecastHours[hindex]['timeData']) + ' -> ' + forecastHours[hindex]['minTime']);
				forecastHours[hindex]['maxTime'] = getArrayMax(forecastHours[hindex]['timeData']);
				//adapter.log.info('max of hindex ' + hindex + ': ' + JSON.stringify(forecastHours[hindex]['timeData']) + ' -> ' + forecastHours[hindex]['maxTime']);
			}

			if(current >= max) {
				callback(false);
			} else {
				readFieldLoop(weatherAdapter, field, current + 1, max, callback, daymode, subhours);
			}
		}
	});
}

function getSunHour(forTime) {
	let sunset = getAstroDate('sunset', forTime.getTime());
	let sunrise = getAstroDate('sunrise', forTime.getTime());
    if(sunrise > sunset) {
        //* We need to get the sunrise from 24h before
        let prevDay = new Date(forTime.getTime());
        prevDay.setDate(prevDay.getDate() - 1);
        sunrise = getAstroDate('sunrise', prevDay.getTime());
    }

	if(forTime < sunrise) {
		return 0;
	} else if(forTime > sunset) {
		return 0;
	}

    let hour = 1 + Math.floor((forTime.getTime() - sunrise.getTime()) / 1000 / 60 / 60);
	return hour;
}

function calcMinSoC(forecastRead, tomorrow) {
	if(!forecastRead) {
		adapter.log.info('Read forecast data before calcMinSoC.');
		readForecastData(function(err) {
			if(!err) {
				calcMinSoC(true);
			} else {
				adapter.log.warn('Failed reading forecast data. Cannot calc MinSoC.');
			}
		});
		return;
	}


	let fcDate = new Date();
	let doMinSoC = false;

	let minSoCDate = new Date();
	minSoCDate.setUTCMinutes(minSoCDate.getUTCMinutes() + 120);
    let sunset = getAstroDate('sunset', minSoCDate.getTime());
	if(minSoCDate > sunset || minSoCDate.getDate() !== fcDate.getDate()) {
		if(tomorrow) {
			doMinSoC = true;
		}
	} else {
		if(!tomorrow) {
			doMinSoC = true;
		}
	}

	if(tomorrow) {
		fcDate.setDate(fcDate.getDate() + 1);
		adapter.log.info('calcMinSoC for day 2.');
	} else {
		adapter.log.info('calcMinSoC for day 1.');
	}

	if(doMinSoC === true) {
		adapter.log.info('Using forecast of day ' + (tomorrow ? '2' : '1') + ' for MinSoC calculation.');
	}

    sunset = getAstroDate('sunset', fcDate.getTime());

    let sunrise = getAstroDate('sunrise', fcDate.getTime());
    if(sunrise > sunset) {
        //* We need to get the sunrise from 24h before
        let prevDay = new Date(fcDate.getTime());
        prevDay.setDate(prevDay.getDate() - 1);
        sunrise = getAstroDate('sunrise', prevDay.getTime());
    }

	let period_id = 'day1';
	if(tomorrow) {
		period_id = 'day2';
	}

	ioBLib.createOrSetState('forecast.' + period_id + '.sun.sunrise', {
		type: 'state',
		common: {
			name: 'Time of sunrise for forecast day',
			type: 'number',
			role: 'date',
			read: true,
			write: false,
			unit: ''
		},
		native: {}
	}, sunrise.getTime());

	ioBLib.createOrSetState('forecast.' + period_id + '.sun.sunset', {
		type: 'state',
		common: {
			name: 'Time of sunset for forecast day',
			type: 'number',
			role: 'date',
			read: true,
			write: false,
			unit: ''
		},
		native: {}
	}, sunset.getTime());

    //* calc hours of daylight
    let sun_hours = (sunset - sunrise) / 1000 / 60 / 60; // TODO: unsused?

    let curTime = new Date();
	if(tomorrow) {
		curTime.setDate(curTime.getDate() + 1);
		curTime.setHours(2, 0, 0, 0);
	}

	let add_id = '.day1';
	if(tomorrow) {
		add_id = '.day2';
	}

	let fc_above_70 = false;
	let sun_hour = 0;
	let sun_hour_step = 0;
	let sunhour_starts = {};
	let sunhour_power = {};
	let sun_power = 0;
	let sun_power_vis = 0;
    let sun_power_clear = 0;
    let powerTime = new Date(sunrise.getTime());
	adapter.log.debug('Calc power from ' + powerTime + ' to ' + sunset + ' now.');
    while(powerTime.getTime() <= sunset.getTime()) {
		sun_hour_step++;
        sun_hour = 1 + Math.floor((powerTime - sunrise) / (3600 * 1000));

		let pwr = getSunPosPower(powerTime);
		let hindex = powerTime.getDate() + 'd' + sun_hour_step;
		let shindex = sun_hour + 'h';

		if(!(shindex in sunhour_power)) {
			sunhour_power[shindex] = {
				clouds: 0,
				vis: 0,
				rain: 0
			};
		}
		if(!(shindex in sunhour_starts)) {
			sunhour_starts[shindex] = powerTime.getTime();
		}

		//adapter.log.info('Sun hour for ' + powerTime + ' is ' + sun_hour + '.');

		let fcData = getForecastDataFor(powerTime);
		if(fcData['cloudCover'] === null) {
			fcData['cloudCover'] = (forecastData[hindex] && 'cloudCover' in forecastData[hindex] ? forecastData[hindex]['cloudCover'] : null);
			if(fcData['cloudCover'] === null) {
				fcData['cloudCover'] = 0; // multiplier - set to zero forecast if we have no weather data!
			}
		}
		if(fcData['visibility'] === null) {
			fcData['visibility'] = (forecastData[hindex] && 'visibility' in forecastData[hindex] ? forecastData[hindex]['visibility'] : null);
			if(fcData['visibility'] === null) {
				fcData['visibility'] = 16;
			}
		}
		if(fcData['rain'] === null) {
			fcData['rain'] = (forecastData[hindex] && 'rain' in forecastData[hindex] ? forecastData[hindex]['rain'] : null);
			if(fcData['rain'] === null) {
				fcData['rain'] = 0;
			}
		}
		if(fcData['rainChance'] === null) {
			fcData['rainChance'] = (forecastData[hindex] && 'rainChance' in forecastData[hindex] ? forecastData[hindex]['rainChance'] : null);
			if(fcData['rainChance'] === null) {
				fcData['rainChance'] = 0;
			}
		}

		forecastData[hindex] = {
			'cloudCover': fcData['cloudCover'],
			'visibility': fcData['visibility'],
			'rain': fcData['rain'],
			'rainChance': fcData['rainChance'],
			'time': powerTime.getTime()
		};

		adapter.log.debug('Possible power at ' + powerTime + ' is: ' + pwr.panelpower + '(alt: ' + pwr.altitude + ', azi: ' + pwr.azimuth + ', fc: ' + JSON.stringify(fcData) + ')');

		let skyMulti = fcData['cloudCover'];
		let visMulti = getVisMultiplier(fcData['visibility']);
		let rainMulti = getRainMultiplier(fcData['rain']);
		let rainChanceMulti = getRainChanceMultiplier(fcData['rainChance']);

		adapter.log.debug('Multipliers for ' + powerTime + ' (' + pwr.panelpower + '): ' + skyMulti + '/' + visMulti + '/' + rainMulti + '/' + rainChanceMulti);

		let skyPower = pwr.panelpower * skyMulti;
		let skyVisPower = skyPower * visMulti;
		let skyRainPower = skyPower * visMulti * rainMulti * rainChanceMulti;

		sun_power += (skyRainPower / 12); // each 5 minutes
		sun_power_vis += (skyVisPower / 12);
		sun_power_clear += (skyPower / 12);

		sunhour_power[shindex]['rain'] += (skyRainPower / 12);
		sunhour_power[shindex]['clouds'] += (skyPower / 12);
		sunhour_power[shindex]['vis'] += (skyVisPower / 12);


		powerTime.setUTCMinutes(powerTime.getUTCMinutes() + 5);
	}

	if(tomorrow || curTime.getTime() < sunrise.getTime()) {
		for(let shindex in sunhour_power) {
			let num_sun_hour = shindex.slice(0, -1);
			let fc_state_id = 'forecast' + add_id + '.power.' + shindex + '.power';
			ioBLib.createOrSetState(fc_state_id, {
				type: 'state',
				common: {
					name: 'Power forecast for sun hour ' + num_sun_hour + ' of day',
					type: 'number',
					role: 'value.power',
					read: true,
					write: false,
					unit: 'Wh'
				},
				native: {}
			}, sunhour_power[shindex]['rain']);

			fc_state_id = 'forecast' + add_id + '.power.' + shindex + '.power_high';
			ioBLib.createOrSetState(fc_state_id, {
				type: 'state',
				common: {
					name: 'Power forecast for sun hour ' + num_sun_hour + ' of day (visibility 100%, no rain)',
					type: 'number',
					role: 'value.power',
					read: true,
					write: false,
					unit: 'Wh'
				},
				native: {}
			}, sunhour_power[shindex]['clouds']);

			fc_state_id = 'forecast' + add_id + '.power.' + shindex + '.time';
			ioBLib.createOrSetState(fc_state_id, {
				type: 'state',
				common: {
					name: 'Sun hour ' + num_sun_hour + ' starts at',
					type: 'number',
					role: 'date',
					read: true,
					write: false,
					unit: ''
				},
				native: {}
			}, sunhour_starts[shindex]);
		}
	}
	
	for(let p = sun_hour + 1; p <= 24; p++) {
		adapter.log.debug('Delete object ' + 'forecast' + add_id + '.power.' + p + 'h.time');
		ioBLib.delObjectIfExists('forecast' + add_id + '.power.' + p + 'h.time');
		adapter.log.debug('Delete object ' + 'forecast' + add_id + '.power.' + p + 'h.power');
		ioBLib.delObjectIfExists('forecast' + add_id + '.power.' + p + 'h.power');
	};

    let state_id = 'forecast.day1.power.day';
	if(tomorrow) {
		state_id = 'forecast.day2.power.day';
	}
	if(tomorrow || curTime.getTime() < sunrise.getTime()) {
		ioBLib.createOrSetState(state_id, {
			type: 'state',
			common: {
				name: 'Power forecast for day',
				type: 'number',
				role: 'value.power',
				read: true,
				write: false,
				unit: 'Wh'
			},
			native: {}
		}, sun_power);

		state_id = 'forecast.day1.power.day_high';
		if(tomorrow) {
			state_id = 'forecast.day2.power.day_high';
		}
		ioBLib.createOrSetState(state_id, {
			type: 'state',
			common: {
				name: 'Power forecast for day (visibility 100%, no rain)',
				type: 'number',
				role: 'value.power',
				read: true,
				write: false,
				unit: 'Wh'
			},
			native: {}
		}, sun_power_clear);
	}

	let fcDay = new Date(sunhour_starts['1h']);
	fcDay.setHours(12, 0, 0, 0);
    state_id = 'forecast.day1.power.date';
	if(tomorrow) {
		state_id = 'forecast.day2.power.date';
	}
	ioBLib.createOrSetState(state_id, {
		type: 'state',
		common: {
			name: 'Date the power forecast is for',
			type: 'number',
			role: 'date',
			read: true,
			write: false,
			unit: ''
		},
		native: {}
	}, fcDay.getTime());

	let powerUntilSunset = 0;
    let powerStartTime = new Date(curTime.getTime());
    if(powerStartTime.getTime() < sunrise.getTime()) {
        powerStartTime.setTime(sunrise.getTime());
    }
    let powerHours = (sunset.getTime() - powerStartTime.getTime()) / 1000 / 60 / 60;
    if(powerHours > 0) {
        adapter.log.debug('There are ' + powerHours + ' of ' + sun_hours + ' hours of sun time left to take into account.');
        let fcH = 0;
        for(let p = powerHours; p > 0; p--) {
            fcH++;
			let shindex = Math.ceil(sun_hours + 1 - p) + 'h';
            let fcPower = (shindex in sunhour_power ? sunhour_power[shindex]['rain'] : null);
            //log('Power for fc hour ' + (powerTime.getHours() + fcH) + ' is ' + fcPower);
            if(fcPower) {
                if(p < 1) {
                    fcPower = fcPower * p;
                    //log('Power for fc hour ' + (powerTime.getHours() + fcH) + ' is ' + fcPower + ' because of factor ' + p);
                }
                powerUntilSunset += fcPower;
            }

			if(!tomorrow) {
				if(fcPower > panelWp * 0.7) {
					adapter.log.debug('(battery management) power for sun hour ' + p + ' exceeds ' + (panelWp * 0.7) + ' setting fc70 to true.');
					fc_above_70 = true;
				}
			}
        }
	}

	if(!tomorrow) {
		ioBLib.createOrSetState('forecast.day1.power.remaining', {
			type: 'state',
			common: {
				name: 'Power forecast for remaining sun hours',
				type: 'number',
				role: 'value.power',
				read: true,
				write: false,
				unit: 'Wh'
			},
			native: {}
		}, powerUntilSunset);

		ioBLib.createOrSetState('forecast.day1.power.day_adjusted', {
			type: 'state',
			common: {
				name: 'Alternative power forecast (generated power + remaining forecast)',
				type: 'number',
				role: 'value.power',
				read: true,
				write: false,
				unit: 'Wh'
			},
			native: {}
		}, (generationData.generation ? generationData.generation : 0) + powerUntilSunset);

		adapter.getState('forecast.consumption.day', function(err, state) {
			if(!err && state) {
				ioBLib.createOrSetState('forecast.consumption.remaining', {
					type: 'state',
					common: {
						name: 'Power consumption forecast for remaining sun hours',
						type: 'number',
						role: 'value.power',
						read: true,
						write: false,
						unit: 'Wh'
					},
					native: {}
				}, state.val * powerHours / sun_hours);
			}
		});
	}

	let useMinSoCId = 'devices.local.battery.MinSoc';
	let setAck = false;
	if(!adapter.config.enable_minsoc) {
		useMinSoCId = 'devices.local.battery.MinSocDummy';
		setAck = true;
	}

	if(!tomorrow && adapter.config.enable_battery_management) {
		let daily_cons = 0;
		let curSoC = 0;
		let curSoCPercentage = 0;

		adapter.getState('forecast.consumption.day', function(err, state) {
			if(!err) {
				daily_cons = state.val;
				daily_cons = daily_cons * powerHours / sun_hours;
			}

			adapter.getState('devices.local.battery.SoC', function(err, state) {
				if(!err) {
					curSoCPercentage = state.val;
					curSoC = curSoCPercentage * adapter.config.battery_capacity / 100;
				}

				adapter.getState(useMinSoCId, function(err, state) {
					let curMinSoC = 5;
					if(!err) {
						curMinSoC = (state ? state.val : null);
					}

					let power_plus = powerUntilSunset - daily_cons + curSoC - adapter.config.battery_capacity;
					adapter.log.debug('Checking battery management: ' + power_plus + ' = ' + powerUntilSunset + ' - ' + daily_cons + ' + ' + curSoC + ' - ' + adapter.config.battery_capacity + ' > ' + panelWp + ' * 0.7 (' + (panelWp * 0.7) + ') -> ' + fc_above_70);
					/*if(power_plus <= panelWp * 0.7) {
						fc_above_70 = false;
					} else if(curSoCPercentage < adapter.config.enable_bm_minsoc) {
						fc_above_70 = false;
					}*/
					if(parseInt(curSoCPercentage) < parseInt(curMinSoC) + 8) {
						adapter.log.info('Disabling battery management because ' + curMinSoC + ' is too high for current SoC ' + curSoCPercentage);
						fc_above_70 = false;
					} else if(power_plus >= 2 * adapter.config.battery_capacity) {
						fc_above_70 = true;
					} else {
						fc_above_70 = false;
					}

					adapter.getState('devices.local.battery.SmartBatteryControl', function(err, state) {
						if(!err) {
							let curValue = (state ? state.val : null);

							if(curValue === null || curValue !== fc_above_70) {
								adapter.log.info((fc_above_70 ? 'Enabling' : 'Disabling') + ' smart battery control feature in converter.');
								adapter.setState('devices.local.battery.SmartBatteryControl', fc_above_70, false);
							}
						}
					});
				});

			});
		});
	}

	if(doMinSoC === false) {
		if(tomorrow) {
			return;
		} else {
			calcMinSoC(true, true);
			return;
		}
	}

	adapter.log.debug('Writing MinSoC value to ' + useMinSoCId);

    //* reduce estimated sun power by cloud coverage
    let max_minSoC = adapter.config.max_minsoc;
	if(!max_minSoC || max_minSoC < 5 || max_minSoC > 100) {
		max_minSoC = 40;
		adapter.log.warn('Invalid maximum MinSoC value set. Valid values are from 5 to 100. Resetting to default (40).');
	}
    let min_minSoC = adapter.config.min_minsoc;
	if(!min_minSoC || min_minSoC < 5 || min_minSoC > 100 || min_minSoC >= max_minSoC) {
		min_minSoC = 5;
		adapter.log.warn('Invalid minimum MinSoC value set. Valid values are from 5 to 100 and lower than maximum MinSoC. Resetting to default (5).');
	}
    let minSoC = 40;

	adapter.getState('forecast.consumption.day', function(err, state) {
		if(!err) {
			let daily_cons = state.val;
			daily_cons = daily_cons * powerHours / sun_hours;

			//* we need at least one daily consumption value otherwise we cannot calc the needed power
			if(daily_cons) {
				//* how many power is left after our estimated home consumption is substracted
				let sun_power_left = sun_power - daily_cons;
				let possibleCharge;
				if(sun_power_left < 0) {
					sun_power_left = 0;
				}

				//* percentage of battery that will possibly be charged tomorrow (or today if we are in astroday time)
				possibleCharge = sun_power_left / adapter.config.battery_capacity;
				minSoC = Math.round(max_minSoC - (100 * possibleCharge)); // reduced this
				//* minSoC must not be below 5
				if(minSoC < min_minSoC) {
					minSoC = min_minSoC;
				}

				adapter.log.debug('As possible charge for generated power (' + sun_power + ') reduced by daily consumption (' + daily_cons + ') leads to a max. charge of ' + sun_power_left + 'Wh (' + Math.round(possibleCharge * 100) + '% of ' + adapter.config.battery_capacity + 'Wh) I will set minSoC to ' + minSoC + ' (min ' + min_minSoC + ', max ' + max_minSoC + ').');

				let curSoC;

				adapter.getState('devices.local.battery.SoC', function(err, state) {
					if(!err && state) {
						curSoC = state.val;
						adapter.log.debug('Current SoC of battery is at ' + curSoC + '.');
						//* minSoC to set should not (highly) exceed the current SoC as this would possibly lead to the battery being charged from grid
						if(adapter.config.enable_minsoc && minSoC > curSoC + 5) {
							if(curSoC < 8 && minSoC >= 8) {
								minSoC = 8;
							} else {
								minSoC = curSoC;
							}
							adapter.log.info('Current SoC of battery is at ' + curSoC + ' so reducing minSoC to ' + minSoC + '.');
						}

						adapter.getState(useMinSoCId, function(err, state) {
							if(!err) {
								let curMinSoC = (state ? state.val : null);

								adapter.log.debug('New and old MinSoC: ' + curMinSoC + ' -> ' + minSoC);
								//* Set new minSoC value if it differs from current
								if(curMinSoC !== minSoC) {
									adapter.setState(useMinSoCId, minSoC, setAck);
								}
							}
						});
					}
				});

			}

		}
	});

	if(!tomorrow) {
		calcMinSoC(true, true); // fc for next day!
	}
}

function login(callback) {
	let nonce = KOSTAL.getNonce();
	let payload = {
		username: 'user',
		nonce: nonce
	};
	apiCall('POST', 'auth/start', payload, function(body, code, headers) {
		if(code !== 200) {
			adapter.log.warn('Login failed with code ' + code + ': ' + body);
			callback && callback(true);
			return;
		}

		var json = JSON.parse(body);
		if(!json.nonce) {
			adapter.log.warn('No nonce in json reply to start: ' + body);
			callback && callback(true);
			return;
		}

		var mainTransactionId = json.transactionId;
		var serverNonce = json.nonce;
		var salt = json.salt;
		var hashRounds = parseInt(json.rounds);

		var r = KOSTAL.pbkdf2(devicePassword, KOSTAL.base64.toBits(salt), hashRounds);
		var sKey = new KOSTAL.hash.hmac(r, KOSTAL.hash.sha256).mac('Client Key');
		var cKey = new KOSTAL.hash.hmac(r, KOSTAL.hash.sha256).mac('Server Key');
		var sHash = KOSTAL.hash.sha256.hash(sKey);
		var hashString = 'n=user,r=' + nonce + ',r=' + serverNonce + ',s=' + salt + ',i=' + hashRounds + ',c=biws,r=' + serverNonce;
		var sHmac = new KOSTAL.hash.hmac(sHash, KOSTAL.hash.sha256).mac(hashString);
		var cHmac = new KOSTAL.hash.hmac(cKey, KOSTAL.hash.sha256).mac(hashString);
		var proof = sKey.map(function(l, n) {
			return l ^ sHmac[n];
		});

		var payload = {
			transactionId: mainTransactionId,
			proof: KOSTAL.base64.fromBits(proof)
		};

		apiCall('POST', 'auth/finish', payload, function(body, code, headers) {
			if(code !== 200) {
				adapter.log.warn('auth/finish failed with code ' + code + ': ' + body);
				callback && callback(true);
				return;
			}

			var json = JSON.parse(body);
			if(!json.token) {
				adapter.log.warn('No nonce in json reply to finish: ' + body);
				callback && callback(true);
				return;
			}

			var bitSignature = KOSTAL.base64.toBits(json.signature);

			if(!KOSTAL.bitArray.equal(bitSignature, cHmac)) {
				adapter.log.warn('Signature verification failed!');
				callback && callback(true);
				return;
			}

			var hashHmac = new KOSTAL.hash.hmac(sHash, KOSTAL.hash.sha256);
			hashHmac.update('Session Key');
			hashHmac.update(hashString);
			hashHmac.update(sKey);
			var digest = hashHmac.digest();
			json.protocol_key = digest;
			json.transactionId = mainTransactionId;

			var pkey = json.protocol_key,
				tok = json.token,
				transId = json.transactionId,
				encToken = KOSTAL.encrypt(pkey, tok);
			var iv = encToken.iv,
				tag = encToken.tag,
				ciph = encToken.ciphertext,
				payload = {
					transactionId: transId,
					iv: KOSTAL.base64.fromBits(iv),
					tag: KOSTAL.base64.fromBits(tag),
					payload: KOSTAL.base64.fromBits(ciph)
				};

			apiCall('POST', 'auth/create_session', payload, function(body, code, headers) {
				if(code !== 200) {
					adapter.log.warn('auth/create_session failed with code ' + code + ': ' + body);
					callback && callback(true);
					return;
				}

				var json = JSON.parse(body);
				if(!json.sessionId) {
					adapter.log.warn('No session id in json reply to create session: ' + body);
					callback && callback(true);
					return;
				}

				loginSessionId = json.sessionId;
				adapter.log.debug('Session id is ' + loginSessionId);

				loginSuccess(callback);
			});
		});
	});
}

function loginSuccess(callback) {
	apiCall('GET', 'auth/me', null, function(body, code, headers) {
		adapter.log.debug('auth/me: ' + body);
	});

	apiCall('GET', 'modules', null, function(body, code, headers) {
		if(code !== 200) {
			adapter.log.warn('Could not get supported modules information. Code: ' + code + ', contents: ' + body);
			adapter.terminate && adapter.terminate() || process.exit();
			return;
		}

		var json = JSON.parse(body);
		if(!json.length) {
			adapter.log.warn('No valid module info in json reply: ' + body);
			adapter.terminate && adapter.terminate() || process.exit();
			return;
		}

		let pvcount = 0;
		for(let i = 0; i < json.length; i++) {
			let obj = json[i];
			if(obj.id.substr(0, 16) === 'devices:local:pv') {
				pvcount++;
			} else if(obj.id === 'devices:local:battery') {
				hasBattery = true;
			}
		}

		PVStringCount = pvcount;
		setObjects();

		pollStates(pollingTime);
	});

	callback && callback(false);
}


function calcPowerAverages() {
	// when last rotate took place?
	let rotate = false;
	if(jsonStates['lastDataRotation']) {
		let lastRot = new Date(jsonStates['lastDataRotation']);
		let now = new Date();
		if(lastRot.getFullYear() !== now.getFullYear() || lastRot.getMonth() !== now.getMonth() || lastRot.getDate() !== now.getDate()) {
			rotate = true;
		}
	} else {
		rotate = true;
	}

    if(rotate) {
        for(let dn of ['day', 'night']) {
			if('undefined' === typeof consumptionData[dn]) {
				consumptionData[dn] = [
					{
						samples: 0,
						consumption: 0,
						average: 0
					},
					{
						samples: 0,
						consumption: 0,
						average: 0
					},
					{
						samples: 0,
						consumption: 0,
						average: 0
					},
					{
						samples: 0,
						consumption: 0,
						average: 0
					}
				];
			}
			consumptionData[dn][3] = consumptionData[dn][2];
			consumptionData[dn][2] = consumptionData[dn][1];
			consumptionData[dn][1] = consumptionData[dn][0];
			consumptionData[dn][0] = {
				samples: 0,
				consumption: 0,
				average: 0
			};
        }
		fs.writeFile(power_jsonfile, JSON.stringify(consumptionData), function(err) {
			if(!err) {
				adapter.log.info('Power consumption statistics written to disk.');
			} else {
				adapter.log.warn('Power consumption statistics not written to disk.');
			}
		});

		if(generationData.hours) {
			let delId;
			for(let hidx in generationData.hours) {
				delId = 'forecast.day1.power.' + hidx + '.generated';
				adapter.log.info('Delete object ' + delId);
				ioBLib.delObjectIfExists(delId);
			}
		}

		generationData = {
			generation: 0,
			time: 0,
			hours: {}
		};
		fs.writeFile(pv_jsonfile, JSON.stringify(generationData), function(err) {
			if(!err) {
				adapter.log.info('Power generation statistics written to disk.');
			} else {
				adapter.log.warn('Power generation statistics not written to disk.');
			}
		});

		cleanUpForecastData();
		fs.writeFile(fc_jsonfile, JSON.stringify(forecastData), function(err) {
			if(!err) {
				adapter.log.info('Forecast data file written to disk.');
			} else {
				adapter.log.warn('Forecast data file not written to disk.');
			}
		});

		jsonStates['lastDataRotation'] = (new Date()).getTime();

		fs.writeFile(state_jsonfile, JSON.stringify(jsonStates), function(err) {
			if(!err) {
				adapter.log.info('JSON states written to disk.');
			} else {
				adapter.log.warn('JSON states not written to disk.');
			}
		});
    }

	let avg = {
        day: 0,
        night: 0
    };

    for(let dn of ['day', 'night']) {
		if(!consumptionData[dn]) {
			consumptionData[dn] = {};
		}
        let cnt = 0;
        let sum = 0;
        for(let d = 0; d < 4; d++) {
			let dx = 'd' + d;
			if(!consumptionData[dn][dx]) {
				consumptionData[dn][dx] = {
					samples: 0,
					consumption: 0,
					average: 0
				};
			}

            let val = consumptionData[dn][dx].consumption;
            if(val) {
                cnt++;
                sum += val;
            }
        }
        avg[dn] = (cnt > 0 ? sum / cnt : 0);
    }

	ioBLib.createOrSetState('forecast.consumption.day', {
		type: 'state',
		common: {
			name: 'Current average power consumption daytime',
			type: 'number',
			role: 'value.power.consumption',
			read: true,
			write: false,
			unit: 'Wh'
		},
		native: {}
	}, avg.day);

	ioBLib.createOrSetState('forecast.consumption.night', {
		type: 'state',
		common: {
			name: 'Current average power consumption nighttime',
			type: 'number',
			role: 'value.power.consumption',
			read: true,
			write: false,
			unit: 'Wh'
		},
		native: {}
	}, avg.night);
}

function updatePowerProduction(state) {
	let sum = 0;
	adapter.getState('devices.local.pv1.P', function(err, state) {
		if(!err && state && state.val) {
			sum += state.val;
		}
		adapter.getState('devices.local.pv2.P', function(err, state) {
			if(!err && state && state.val) {
				sum += state.val;
			}
			adapter.getState('devices.local.pv3.P', function(err, state) {
				if(!err && state && state.val) {
					sum += state.val;
				}
				ioBLib.createOrSetState('devices.local.Pv_P', {
					type: 'state',
					common: {
						name: 'Current plant power',
						type: 'number',
						role: 'value.power',
						read: true,
						write: false,
						unit: 'W'
					},
					native: {}
				}, sum);

				let cursum = (generationData && generationData.generation ? generationData.generation : 0);
				let lastvalue = (generationData && generationData.time ? generationData.time : 0);

				let now = new Date();
				if(!lastvalue) {
					lastvalue = now.getTime() - 1000;
				} else if(now.getTime() - lastvalue > 5 * 60 * 1000) {
					lastvalue = now.getTime() - 30000; // assume 30 seconds
				}

				let powerWh = sum * ((now - lastvalue) / 1000) / 3600;

				let curSunHour = getSunHour(now);
				if(curSunHour > 0) {
					let sunIdx = curSunHour + 'h';
					if(!generationData.hours) {
						generationData.hours = {};
					}
					if(!(sunIdx in generationData.hours)) {
						generationData.hours[sunIdx] = 0;
					}
					generationData.hours[sunIdx] = generationData.hours[sunIdx] + powerWh;
					ioBLib.createOrSetState('forecast.day1.power.' + sunIdx + '.generated', {
						type: 'state',
						common: {
							name: 'Generated plant power for this hour',
							type: 'number',
							role: 'value.power',
							read: true,
							write: false,
							unit: 'Wh'
						},
						native: {}
					}, generationData.hours[sunIdx]);
				}

				generationData.generation = cursum + powerWh;
				generationData.time = now.getTime();

				ioBLib.createOrSetState('forecast.current.power.generated', {
					type: 'state',
					common: {
						name: 'Generated plant power today until now',
						type: 'number',
						role: 'value.power',
						read: true,
						write: false,
						unit: 'Wh'
					},
					native: {}
				}, cursum + powerWh);
			});
		});
	});
}

function updatePowerConsumption(state) {
	adapter.log.debug('Current home consumption changed to ' + state.val + 'W');
	let dn;
	if(isAstroDay()) {
		dn = 'day';
	} else {
		dn = 'night';
	}

	if(!consumptionData[dn]) {
		consumptionData[dn] = {
			d0: {}
		};
	} else if(!consumptionData[dn]['d0']) {
		consumptionData[dn]['d0'] = {
			average: 0,
			samples: 0,
			consumption: 0
		};
	}
	let curavg = (consumptionData[dn]['d0'] ? consumptionData[dn]['d0'].average : 0);
	let curcnt = (consumptionData[dn]['d0'] ? consumptionData[dn]['d0'].samples : 0);

	let newavg = ((curavg * curcnt) + state.val) / (curcnt + 1);
	curcnt++;

	consumptionData[dn]['d0'].average = newavg;
	consumptionData[dn]['d0'].samples = curcnt;

	//* calc consumption
	let now = new Date();
	let sunrise = getAstroDate('sunrise', now.getTime());
	let sunset = getAstroDate('sunset', now.getTime());
	if(sunrise > sunset) {
		let prevDay = new Date(now.getTime());
		prevDay.setDate(prevDay.getDate() - 1);
		sunrise = getAstroDate('sunrise', prevDay.getTime());
	}

	//* calc hours of (possible) sunshine - daylight
	let sun_hours = (sunset - sunrise) / 1000 / 60 / 60;

	//* power sum during sun_hours
	let power_sum;
	if(dn === 'day') {
		power_sum = newavg * sun_hours;
	} else {
		power_sum = newavg * (24 - sun_hours);
	}
	consumptionData[dn]['d0'].consumption = power_sum;

	calcPowerAverages(); // no rotating please!
}

function updateBatteryCharging(state) {
	let charge = 0;
	let discharge = 0;

	if(state.val < 0) {
		charge = state.val * -1;
		discharge = 0;
	} else {
		charge = 0;
		discharge = state.val;
	}

	ioBLib.createOrSetState('devices.local.battery.Charge_P', {
		type: 'state',
		common: {
			name: 'Current charging power',
			type: 'number',
			role: 'value.power',
			read: true,
			write: false,
			unit: 'W'
		},
		native: {}
	}, charge);

	ioBLib.createOrSetState('devices.local.battery.Discharge_P', {
		type: 'state',
		common: {
			name: 'Current discharging power',
			type: 'number',
			role: 'value.power',
			read: true,
			write: false,
			unit: 'W'
		},
		native: {}
	}, discharge);
}

function changeSetting(id, value) {
	let moduleid;
	let settingid;

	for(let i = 0; i < payload_settings.length; i++) {
		for(let idx in payload_settings[i].mappings) {
			if(payload_settings[i].mappings[idx].id === id) {
				moduleid = payload_settings[i].moduleid;
				settingid = idx;
				break;
			}
		}
		if(settingid) {
			break;
		}
	}

	if(!moduleid || !settingid) {
		adapter.log.warn('Found no valid KOSTAL moduleid or settingid for ' + id);
		return false;
	}

	if(boolean_states.includes(id)) {
		value = (value === true ? 1 : 0);
	}

	let payload = [
		{
			"moduleid": moduleid,
			"settings": [
				{
					"id": settingid,
					"value": value + "" // make sure it is a string
				}
			]
		}
	];

	if(settingid === 'Generator:ShadowMgmt:Enable') {
		payload[0].settings.unshift({
			"id": "Generator:ExtModuleControl:Enable",
			"value": "0"
		});
	}

	apiCall('PUT', 'settings', payload, function(body, code, headers) {
		adapter.log.debug('PUT to settings with payload ' + JSON.stringify(payload));
		if(code === 200) {
			// we need to request current value as the response to PUT is not always correct!
			payload = [{
				"moduleid": moduleid,
				"settingids": [settingid]
			}];
			apiCall('POST', 'settings', payload, function(body, code, headers) {
				if(code === 200) {
					processDataResponse(body, 'settings');
				} else {
					adapter.log.warn('Requesting settings (after PUT) - ' + JSON.stringify(payload) + ') failed with code ' + code + ': ' + body);
				}
			});
		} else {
			adapter.log.warn('PUT to settings ' + moduleid + ' / ' + settingid + ' (' + value + ') resulted in code ' + code + ': ' + body);
		}
	});
}

function processDataResponse(data, dataname) {
	let json = JSON.parse(data);
	if('undefined' === typeof json) {
		adapter.log.warn('Invalid json data received: ' + data);
		return;
	}

	if(json.length <= 0 || !json[0]) {
		adapter.log.warn('Invalid json data received: ' + JSON.stringify(data));
		return;
	}

	let mappings_base = (dataname === 'settings' ? payload_settings : payload_data);

	let ac_p = null;
	let home_p = null;
	let grid_p = null;

	let energy_yield = {
		'Day': null,
		'Month': null,
		'Year': null,
		'Total': null
	};

	let energy_own = {
		'Day': null,
		'Month': null,
		'Year': null,
		'Total': null
	};

	for(let j = 0; j < json.length; j++) {
		let moduleid = json[j].moduleid;
		if(json[j][dataname]) {
			for(let i in json[j][dataname]) {
				let setting = json[j][dataname][i];

				let mappings = {};
				for(let m = 0; m < mappings_base.length; m++) {
					if(mappings_base[m].moduleid === moduleid) {
						mappings = mappings_base[m].mappings;
						break;
					}
				}

				if(mappings[setting.id]) {
					let obj = mappings[setting.id];
					let objid = obj.id;
					let objtype = obj.type;

					if(objtype === 'boolean') {
						adapter.log.debug('Converting ' + setting.value + ' to bool for ' + objid);
						setting.value = (setting.value === 1 || setting.value === '1');
					} else if(objtype === 'int') {
						adapter.log.debug('Converting ' + setting.value + ' to int for ' + objid);
						setting.value = parseInt(setting.value);
					} else if(objtype === 'float') {
						adapter.log.debug('Converting ' + setting.value + ' to float for ' + objid);
						setting.value = parseFloat(setting.value);
					} else if(objtype === 'timestamp') {
						adapter.log.debug('Converting ' + setting.value + ' to timestamp for ' + objid);
						setting.value = parseInt(setting.value) * 1000;
					}

					let set_yield_grid = false;
					let set_grid_p = false;
					if(objid === 'devices.local.ac.P') {
						ac_p = setting.value;
						set_grid_p = true;
					} else if(objid === 'devices.local.Home_P') {
						home_p = setting.value;
						set_grid_p = true;
					} else if(objid === 'scb.statistic.EnergyFlow.OwnConsumptionRateDay') {
						energy_own['Day'] = setting.value;
						set_yield_grid = 'Day';
					} else if(objid === 'scb.statistic.EnergyFlow.OwnConsumptionRateMonth') {
						energy_own['Month'] = setting.value;
						set_yield_grid = 'Month';
					} else if(objid === 'scb.statistic.EnergyFlow.OwnConsumptionRateYear') {
						energy_own['Year'] = setting.value;
						set_yield_grid = 'Year';
					} else if(objid === 'scb.statistic.EnergyFlow.OwnConsumptionRateTotal') {
						energy_own['Total'] = setting.value;
						set_yield_grid = 'Total';
					} else if(objid === 'scb.statistic.EnergyFlow.YieldDay') {
						energy_yield['Day'] = setting.value;
						set_yield_grid = 'Day';
					} else if(objid === 'scb.statistic.EnergyFlow.YieldMonth') {
						energy_yield['Month'] = setting.value;
						set_yield_grid = 'Month';
					} else if(objid === 'scb.statistic.EnergyFlow.YieldYear') {
						energy_yield['Year'] = setting.value;
						set_yield_grid = 'Year';
					} else if(objid === 'scb.statistic.EnergyFlow.YieldTotal') {
						energy_yield['Total'] = setting.value;
						set_yield_grid = 'Total';
					}

					if(set_grid_p === true && ac_p !== null && home_p !== null) {
						grid_p = Math.round(ac_p - home_p);
						if(grid_p > 0) {
							adapter.log.debug('Setting devices.local.ToGrid_P to ' + grid_p + " now.");
							adapter.setState('devices.local.ToGrid_P', grid_p, true);
						} else {
							adapter.setState('devices.local.ToGrid_P', 0, true);
						}
					} else if(set_yield_grid !== false && energy_yield[set_yield_grid] !== null && energy_own[set_yield_grid] !== null) {
						grid_p = Math.round(energy_yield[set_yield_grid] * (1 - (energy_own[set_yield_grid] / 100)));
						if(grid_p > 0) {
							adapter.log.debug('Setting scb.statistic.EnergyFlow.EnergyToGrid' + set_yield_grid + ' to ' + grid_p + " now.");
							adapter.setState('scb.statistic.EnergyFlow.EnergyToGrid' + set_yield_grid, grid_p, true);
						} else {
							adapter.setState('scb.statistic.EnergyFlow.EnergyToGrid' + set_yield_grid, 0, true);
						}
					}

					adapter.log.debug('Setting ' + objid + ' to ' + setting.value + " now.");
					adapter.setState(objid, setting.value, true);
				} else {
					adapter.log.warn('Not in mappings: ' + setting.id + ' = ' + setting.value);
				}
			}
		}
	}



}

function pollStates(pollingTime) {
	let payload = [];
	let payload_2 = [];

	for(let p = 0; p < payload_data.length; p++) {
		let pl = payload_data[p];

		if(PVStringCount < 3 && pl.moduleid === 'devices:local:pv3') {
			continue;
		} else if(PVStringCount < 2 && pl.moduleid === 'devices:local:pv2') {
			continue;
		}

		let params = {
			"moduleid": pl.moduleid,
			"processdataids": []
		};
		for(let idx in pl.mappings) {
			if(hasBattery !== true && battery_ids.includes(pl.mappings[idx].id)) {
				continue;
			}
			params.processdataids.push(idx);
		}

		if(params.processdataids.length > 0) {
			adapter.log.debug('Requesting ' + params.processdataids.join(',') + ' from ' + pl.moduleid + ' (processdata)');
			payload.push(params);
		}
	}

	for(let p = 0; p < payload_settings.length; p++) {
		let pl = payload_settings[p];

		let params = {
			"moduleid": pl.moduleid,
			"settingids": []
		};
		for(let idx in pl.mappings) {
			if(hasBattery !== true && battery_ids.includes(pl.mappings[idx].id)) {
				continue;
			}
			params.settingids.push(idx);
		}

		if(params.settingids.length > 0) {
			adapter.log.debug('Requesting ' + params.settingids.join(',') + ' from ' + pl.moduleid + ' (settings)');
			payload_2.push(params);
		}
	}

	apiCall('POST', 'processdata', payload, function(body, code, headers) {
		if(code === 200) {
			processDataResponse(body, 'processdata');
		} else {
			adapter.log.warn('Requesting processdata - ' + JSON.stringify(payload) + ') failed with code ' + code + ': ' + body);
		}

		apiCall('POST', 'settings', payload_2, function(body, code, headers) {
			if(code === 200) {
				processDataResponse(body, 'settings');
			} else {
				adapter.log.warn('Requesting settings - ' + JSON.stringify(payload) + ') failed with code ' + code + ': ' + body);
			}

			polling = setTimeout(function() {
				pollStates(pollingTime);
			}, pollingTime);
		});
	});

}

function setObjects() {
	let channels = {
		'devices': 'Device list',
		'devices.local': 'Local devices',
		'devices.local.ac': 'AC device',
		'devices.local.inverter': 'Inverter',
		'devices.local.battery': 'Battery',
		'devices.local.powermeter': 'Powermeter',
		'devices.local.generator': 'Generator',
		'scb': 'SCB Channel',
		'scb.event': 'SCB Event',
		'scb.export': 'Export',
		'scb.logging': 'Logging',
		'scb.logging.logger1': 'First logger',
		'scb.logging.logger2': 'Second logger',
		'scb.modbus': 'Modbus',
		'scb.network': 'Network',
		'scb.rse': 'RSE', // ???
		'scb.statistic': 'Statistics',
		'scb.statistic.EnergyFlow': 'Energy flow statistics',
		'scb.time': 'Time settings'
	};
	for(let p = 1; p <= PVStringCount; p++) {
		let pid = 'devices.local.pv' + p;
		channels[pid] = 'PV String ' + p;
	}

	for(let idx in channels) {
		adapter.setObjectNotExists(idx, {
			type: 'channel',
			common: {
				name: channels[idx]
			},
			native: {}
		});
	}


	/*adapter.setObjectNotExists('devices.local.inverter.Type', {
		type: 'state',
		common: {
			name: 'Inverter type',
			desc: '???',
			type: 'number',
			role: 'value.info',
			read: true,
			write: false,
			states: {
				0: "???"
			},
			def: 0
		},
		native: {}
	});*/

	adapter.setObjectNotExists('devices.local.inverter.MaxApparentPower', {
		type: 'state',
		common: {
			name: 'Inverter max. power',
			type: 'number',
			role: 'value.max',
			read: true,
			write: false,
			unit: 'W'
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.SupportedTypes', {
		type: 'state',
		common: {
			name: 'Supported battery types',
			desc: 'Supported battery types (by unlock code)',
			type: 'number',
			role: 'value.info',
			read: true,
			write: false,
			states: {
				0: "None",
				2: "PIKO Battery Li",
				4: "BYD B-Box HV",
				6: "PIKO Battery Li / BYD B-Box HV"
			},
			def: 0
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.StateKey0', {
		type: 'state',
		common: {
			name: 'Unlocked battery slot',
			desc: 'Code for unlocking the battery slot state',
			type: 'number',
			role: 'value.info',
			read: true,
			write: false,
			states: {
				78: "Not unlocked",
				85: "Unlocked"
			},
			def: 78
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.CosPhi', {
		type: 'state',
		common: {
			name: 'AC CosPhi',
			desc: 'AC CosPhi',
			type: 'number',
			role: 'value.info',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.Frequency', {
		type: 'state',
		common: {
			name: 'AC frequency',
			desc: 'AC frequency',
			type: 'number',
			role: 'value.info',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L1_I', {
		type: 'state',
		common: {
			name: 'Phase 1 current',
			desc: 'Phase 1 current',
			type: 'number',
			role: 'value.current',
			unit: 'A',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L1_U', {
		type: 'state',
		common: {
			name: 'Phase 1 voltage',
			desc: 'Phase 1 voltage',
			type: 'number',
			role: 'value.voltage',
			unit: 'V',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L1_P', {
		type: 'state',
		common: {
			name: 'Phase 1 power',
			desc: 'Phase 1 power',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L2_I', {
		type: 'state',
		common: {
			name: 'Phase 2 current',
			desc: 'Phase 2 current',
			type: 'number',
			role: 'value.current',
			unit: 'A',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L2_U', {
		type: 'state',
		common: {
			name: 'Phase 2 voltage',
			desc: 'Phase 2 voltage',
			type: 'number',
			role: 'value.voltage',
			unit: 'V',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L2_P', {
		type: 'state',
		common: {
			name: 'Phase 2 power',
			desc: 'Phase 2 power',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L3_I', {
		type: 'state',
		common: {
			name: 'Phase 3 current',
			desc: 'Phase 3 current',
			type: 'number',
			role: 'value.current',
			unit: 'A',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L3_U', {
		type: 'state',
		common: {
			name: 'Phase 3 voltage',
			desc: 'Phase 3 voltage',
			type: 'number',
			role: 'value.voltage',
			unit: 'V',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.L3_P', {
		type: 'state',
		common: {
			name: 'Phase 3 power',
			desc: 'Phase 3 power',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});


	adapter.setObjectNotExists('devices.local.ac.P', {
		type: 'state',
		common: {
			name: 'AC power',
			desc: 'AC power',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.Q', {
		type: 'state',
		common: {
			name: '???',
			desc: '???',
			type: 'number',
			role: 'value',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ac.S', {
		type: 'state',
		common: {
			name: '???',
			desc: '???',
			type: 'number',
			role: 'value',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});

	for(let p = 1; p <= PVStringCount; p++) {
		let pid = 'devices.local.pv' + p;
		adapter.setObjectNotExists(pid + '.I', {
			type: 'state',
			common: {
				name: 'PV string ' + p + ' current',
				type: 'number',
				role: 'value.current',
				unit: 'A',
				read: true,
				write: false
			},
			native: {}
		});

		adapter.setObjectNotExists(pid + '.U', {
			type: 'state',
			common: {
				name: 'PV string ' + p + ' voltage',
				type: 'number',
				role: 'value.voltage',
				unit: 'V',
				read: true,
				write: false
			},
			native: {}
		});

		adapter.setObjectNotExists(pid + '.P', {
			type: 'state',
			common: {
				name: 'PV string ' + p + ' power',
				type: 'number',
				role: 'value.power',
				unit: 'W',
				read: true,
				write: false
			},
			native: {}
		});
	}

	adapter.setObjectNotExists('devices.local.battery.Cycles', {
		type: 'state',
		common: {
			name: 'Battery cycles',
			desc: 'Total battery cycles',
			type: 'number',
			role: 'value.info',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.SoC', {
		type: 'state',
		common: {
			name: 'State of Charge',
			desc: 'Actual state of charge',
			type: 'number',
			role: 'value.battery',
			unit: '%',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.I', {
		type: 'state',
		common: {
			name: 'Battery current',
			desc: 'Battery current',
			type: 'number',
			role: 'value.current',
			unit: 'A',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.U', {
		type: 'state',
		common: {
			name: 'Battery voltage',
			desc: 'Battery voltage',
			type: 'number',
			role: 'value.voltage',
			unit: 'V',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.P', {
		type: 'state',
		common: {
			name: 'Battery power',
			desc: 'Battery power',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.Dc_P', {
		type: 'state',
		common: {
			name: 'DC power',
			desc: 'DC power',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.DigitalIn', {
		type: 'state',
		common: {
			name: '???',
			desc: '???',
			type: 'number',
			role: 'value',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.EM_State', {
		type: 'state',
		common: {
			name: '???',
			desc: '???',
			type: 'number',
			role: 'value',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.HomeBat_P', {
		type: 'state',
		common: {
			name: 'Home Power from battery',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.HomeGrid_P', {
		type: 'state',
		common: {
			name: 'Home Power from grid',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.ToGrid_P', {
		type: 'state',
		common: {
			name: 'Power sent to grid',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.HomeOwn_P', {
		type: 'state',
		common: {
			name: 'Power used from PV',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.HomePv_P', {
		type: 'state',
		common: {
			name: 'Home Power from PV',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.Home_P', {
		type: 'state',
		common: {
			name: 'Home Power total',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.inverter.State', {
		type: 'state',
		common: {
			name: 'Inverter state',
			desc: '???',
			type: 'number',
			role: 'value.info',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.LimitEvuAbs', {
		type: 'state',
		common: {
			name: 'Actual power limit (EVU)',
			type: 'number',
			role: 'value.power',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	/** Statistics */

	let periods = [
		'day', 'month', 'year', 'total'
	];

	let statsStates = [];
	for(let p = 0; p < periods.length; p++) {
		let period = periods[p];
		let periodId = period.substr(0, 1).toUpperCase() + period.substr(1);

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.Autarky' + periodId,
			name: 'Autarky at current ' + period,
			role: 'value',
			unit: '%'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.OwnConsumptionRate' + periodId,
			name: 'Rate of own consumption at current ' + period,
			role: 'value',
			unit: '%'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.CO2Saving' + periodId,
			name: 'Est. CO2 saving at current ' + period,
			role: 'value',
			unit: 'g'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.EnergyHome' + periodId,
			name: 'Home power consumption at current ' + period,
			role: 'value.power.consumption',
			unit: 'Wh'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.EnergyHomeBat' + periodId,
			name: 'Power consumption from battery at current ' + period,
			role: 'value.power.consumption',
			unit: 'Wh'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.EnergyHomeGrid' + periodId,
			name: 'Power consumption from grid at current ' + period,
			role: 'value.power.consumption',
			unit: 'Wh'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.EnergyHomePv' + periodId,
			name: 'Power consumption from PV at current ' + period,
			role: 'value.power.consumption',
			unit: 'Wh'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.EnergyToGrid' + periodId,
			name: 'Power sent to grid at current ' + period,
			role: 'value.power.consumption',
			unit: 'Wh'
		});

		statsStates.push({
			id: 'scb.statistic.EnergyFlow.Yield' + periodId,
			name: 'Total yield at current ' + period,
			role: 'value.power.consumption',
			unit: 'Wh'
		});
	}

	for(let s = 0; s < statsStates.length; s++) {
		let newstate = statsStates[s];
		adapter.setObjectNotExists(newstate.id, {
			type: 'state',
			common: {
				name: newstate.name,
				type: 'number',
				role: newstate.role,
				unit: newstate.unit,
				read: true,
				write: false
			},
			native: {}
		});
	}


	/** settings */
	adapter.setObjectNotExists('scb.export.PortalConActive', {
		type: 'state',
		common: {
			name: 'Portal link active',
			type: 'boolean',
			role: 'indicator',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});

	/** settings (main) */
	adapter.setObjectNotExists('scb.time.NTPuse', {
		type: 'state',
		common: {
			name: 'Use NTP servers',
			type: 'boolean',
			role: 'switch.enable',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.time.NTPservers', {
		type: 'state',
		common: {
			name: 'NTP servers',
			type: 'string',
			role: 'text',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.time.Timezone', {
		type: 'state',
		common: {
			name: 'Time zone',
			type: 'string',
			role: 'text',
			read: true,
			write: true
		},
		native: {}
	});

	/** settings network */
	adapter.setObjectNotExists('scb.network.Hostname', {
		type: 'state',
		common: {
			name: 'Hostname for Plenticore device',
			type: 'string',
			role: 'info.name',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.network.IPv4Address', {
		type: 'state',
		common: {
			name: 'IPv4 address',
			type: 'string',
			role: 'info.address',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.network.IPv4Auto', {
		type: 'state',
		common: {
			name: 'IPv4 use DHCP',
			type: 'boolean',
			role: 'switch.enable',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.network.IPv4DNS1', {
		type: 'state',
		common: {
			name: 'IPv4 DNS server 1',
			type: 'string',
			role: 'text',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.network.IPv4DNS2', {
		type: 'state',
		common: {
			name: 'IPv4 DNS server 2',
			type: 'string',
			role: 'text',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.network.IPv4Gateway', {
		type: 'state',
		common: {
			name: 'IPv4 gateway server',
			type: 'string',
			role: 'text',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.network.IPv4Subnetmask', {
		type: 'state',
		common: {
			name: 'IPv4 subnet mask',
			type: 'string',
			role: 'text',
			read: true,
			write: true
		},
		native: {}
	});

	/** settings modbus */
	adapter.setObjectNotExists('scb.modbus.ModbusEnable', {
		type: 'state',
		common: {
			name: 'Enable Modbus',
			type: 'boolean',
			role: 'switch.enable',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.modbus.ModbusUnitId', {
		type: 'state',
		common: {
			name: 'Unitid for modbus',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			def: 71
		},
		native: {}
	});

	/** settings portal */
	adapter.setObjectNotExists('scb.export.LastExport', {
		type: 'state',
		common: {
			name: 'Last data export',
			type: 'number',
			role: 'date',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.export.LastExportOk', {
		type: 'state',
		common: {
			name: 'Last data export ok',
			type: 'number',
			role: 'date',
			read: true,
			write: false
		},
		native: {}
	});

	/*[{"moduleid":"scb:export","settingids":["AvailablePortals","Portal"]}]
	 ->
	 [{"moduleid":"scb:export","settings":[{"value":"1","id":"AvailablePortals"},{"value":"1","id":"Portal"}]}]*/

	adapter.setObjectNotExists('scb.export.ExportEnable', {
		type: 'state',
		common: {
			name: 'Export to portal enabled',
			type: 'boolean',
			role: 'switch.enable',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.export.Portal', {
		type: 'state',
		common: {
			name: 'Portal',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			states: {
				1: 'KOSTAL Solar Portal'
			},
			def: 1
		},
		native: {}
	});

	/*// Energiemanagement (READONLY)
	 [{"moduleid":"devices:local","settingids":["Inverter:ActivePowerLimitation","Inverter:MinActivePowerLimitation","Inverter:MaxApparentPower","Inverter:MaxActivePowerLimitation","EnergySensor:InstalledSensor","EnergySensor:SupportedSensors","EnergySensor:SensorPosition","EnergySensor:SupportedPositions","DigitalOutputs:Customer:ConfigurationFlags","DigitalInputs:Mode","EnergyMgmt:AcStorage","Battery:Type","Battery:SmartBatteryControl:Enable","Battery:DynamicSoc:Enable"]},{"moduleid":"scb:rse","settingids":["Inverter:PowerCtrlBroadcast:Mode"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"0","id":"Battery:DynamicSoc:Enable"},{"value":"1","id":"Battery:SmartBatteryControl:Enable"},{"value":"4","id":"Battery:Type"},{"value":"0","id":"DigitalInputs:Mode"},{"value":"0","id":"DigitalOutputs:Customer:ConfigurationFlags"},{"value":"0","id":"EnergyMgmt:AcStorage"},{"value":"3","id":"EnergySensor:InstalledSensor"},{"value":"1","id":"EnergySensor:SensorPosition"},{"value":"3","id":"EnergySensor:SupportedPositions"},{"value":"14","id":"EnergySensor:SupportedSensors"},{"value":"6930.0","id":"Inverter:ActivePowerLimitation"},{"value":"1.0","id":"Inverter:MaxActivePowerLimitation"},{"value":"10000.0","id":"Inverter:MaxApparentPower"},{"value":"0.0","id":"Inverter:MinActivePowerLimitation"}]},{"moduleid":"scb:rse","settings":[{"value":"0","id":"Inverter:PowerCtrlBroadcast:Mode"}]}]*/

	 /** Shadow management */

	adapter.setObjectNotExists('devices.local.generator.ExtModuleControl', {
		type: 'state',
		common: {
			name: 'Enable ext. module control',
			type: 'boolean',
			role: 'switch.enable',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.generator.ShadowMgmt', {
		type: 'state',
		common: {
			name: 'Enable shadow management',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			states: {
				0: 'Disabled',
				1: 'PV String 1',
				2: 'PV String 2',
				3: 'PV Strings 1 and 2',
				4: 'PV String 3',
				5: 'PV Strings 1 and 3',
				6: 'PV Strings 2 and 3',
				7: 'PV Strings 1, 2 and 3'
			},
			def: 0
		},
		native: {}
	});

	 /** settings battery */

	adapter.setObjectNotExists('devices.local.battery.DynamicSoc', {
		type: 'state',
		common: {
			name: 'Enable Dynamic SoC',
			type: 'boolean',
			role: 'switch.enable',
			read: true,
			write: true
		},
		native: {}
	});

	 adapter.setObjectNotExists('devices.local.battery.MinHomeConsumption', {
		type: 'state',
		common: {
			name: 'Min. home consumption',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			min: 0,
			max: 10000,
			unit: 'W'
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.MinSoc', {
		type: 'state',
		common: {
			name: 'Minimum SoC',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			min: 0,
			max: 100,
			unit: '%'
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.MinSocDummy', {
		type: 'state',
		common: {
			name: 'Minimum SoC (for monitoring without effect on the battery settings)',
			type: 'number',
			role: 'value',
			read: true,
			write: false,
			min: 0,
			max: 100,
			unit: '%'
		},
		native: {}
	});

	 adapter.setObjectNotExists('devices.local.battery.SmartBatteryControl', {
		type: 'state',
		common: {
			name: 'Smart battery control',
			type: 'boolean',
			role: 'switch.enable',
			read: true,
			write: true
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.Strategy', {
		type: 'state',
		common: {
			name: 'Battery usage strategy',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			states: {
				1: 'auto',
				2: 'auto economy'
			},
			def: 1
		},
		native: {}
	});

	 adapter.setObjectNotExists('devices.local.battery.Type', {
		type: 'state',
		common: {
			name: 'Battery model',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			states: {
				0: 'none',
				2: 'PIKO battery Li',
				4: 'BYD B-Box HV'
			},
			def: 0
		},
		native: {}
	});

	 adapter.setObjectNotExists('devices.local.EnergySensor', {
		type: 'state',
		common: {
			name: 'Energy Sensor',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			states: {
				255: 'not used',
				0: 'B+G SDM6430',
				1: 'TQ EM300',
				3: 'KOSTAL Smart Energy Meter (KSEM)'
			},
			def: 255
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.battery.ExternControl', {
		type: 'state',
		common: {
			name: 'Battery Control',
			type: 'number',
			role: 'level',
			read: true,
			write: true,
			states: {
				0: 'Internal',
				1: 'External (Digital I/O)',
				2: 'External (Modbus TCP)'
			},
			def: 0
		},
		native: {}
	});
}


module.exports = {
	init: init,
	setup: setup,
	unload: unload,
	apiCall: apiCall,
	login: login,
	updatePowerProduction: updatePowerProduction,
	updatePowerConsumption: updatePowerConsumption,
	updateBatteryCharging: updateBatteryCharging,
	calcMinSoC: calcMinSoC,
	changeSetting: changeSetting,
	setObjects: setObjects,
	pollStates: pollStates,
	storeSunPanelData: storeSunPanelData,
	calcPowerAverages: calcPowerAverages,
	weatherAdapters: weatherAdapters
};