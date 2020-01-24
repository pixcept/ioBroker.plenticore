'use strict';

const fs = require('fs');
const ioBLib = require('@strathcole/iob-lib').ioBLib;
const KOSTAL = require('./kostal').KOSTAL;
const http = require('http');
const suncalc = require('suncalc2');

const daynight = ['day', 'night'];
const apiurl = '/api/v1/';

let adapter;
let utils;
let weather;
let useInternalForecast = false;
let internalForecastType = false;

let deviceIpAdress;
let devicePassword;
let pollingTime;

let PVStringCount = 2;
let hasBattery = false;

let consumptionData = {};
let generationData = {};
let forecastData = {};
let forecastHours = {};

let polling = null;

let power_jsonfile;
let pv_jsonfile;
let fc_jsonfile;

let loginSessionId;

const boolean_states = [
	'scb.export.PortalConActive',
	'scb.time.NTPuse',
	'scb.network.IPv4Auto',
	'scb.modbus.ModbusEnable',
	'scb.export.LastExportOk',
	'scb.export.ExportEnable',
	'devices.local.generator.ExtModuleControl'
];

const battery_ids = [
	'devices.local.battery.Cycles',
	'devices.local.battery.SoC',
	'devices.local.battery.I',
	'devices.local.battery.U',
	'devices.local.battery.P',
	'devices.local.battery.DynamicSoc',
	'devices.local.battery.SmartBatteryControl',
	"devices.local.battery.DynamicSoc",
	"devices.local.battery.MinHomeConsumption",
	"devices.local.battery.MinSoc",
	"devices.local.battery.SmartBatteryControl",
	"devices.local.battery.Strategy",
	"devices.local.battery.SupportedTypes",
	"devices.local.battery.Type"
];

const payload_data = [
	{
		"moduleid": "devices:local",
		"mappings": {
			"Dc_P": "devices.local.Dc_P",
			"DigitalIn": "devices.local.DigitalIn",
			"EM_State": "devices.local.EM_State",
			"HomeBat_P": "devices.local.HomeBat_P",
			"HomeGrid_P": "devices.local.HomeGrid_P",
			"HomeOwn_P": "devices.local.HomeOwn_P",
			"HomePv_P": "devices.local.HomePv_P",
			"Home_P": "devices.local.Home_P",
			"Inverter:State": "devices.local.inverter.State",
			"LimitEvuAbs": "devices.local.LimitEvuAbs"
		}
	},
	{
		"moduleid": "devices:local:ac",
		"mappings": {
			"CosPhi": "devices.local.ac.CosPhi",
			"Frequency": "devices.local.ac.Frequency",
			"L1_I": "devices.local.ac.L1_I",
			"L1_P": "devices.local.ac.L1_P",
			"L1_U": "devices.local.ac.L1_U",
			"L2_I": "devices.local.ac.L2_I",
			"L2_P": "devices.local.ac.L2_P",
			"L2_U": "devices.local.ac.L2_U",
			"L3_I": "devices.local.ac.L3_I",
			"L3_P": "devices.local.ac.L3_P",
			"L3_U": "devices.local.ac.L3_U",
			"P": "devices.local.ac.P",
			"Q": "devices.local.ac.Q",
			"S": "devices.local.ac.S"
		}
	},
	{
		"moduleid": "devices:local:battery",
		"mappings": {
			"Cycles": "devices.local.battery.Cycles",
			"SoC": "devices.local.battery.SoC",
			"I": "devices.local.battery.I",
			"U": "devices.local.battery.U",
			"P": "devices.local.battery.P"
		}
	},
	{
		"moduleid": "devices:local:pv1",
		"mappings": {
			"I": "devices.local.pv1.I",
			"U": "devices.local.pv1.U",
			"P": "devices.local.pv1.P"
		}
	},
	{
		"moduleid": "devices:local:pv2",
		"mappings": {
			"I": "devices.local.pv2.I",
			"U": "devices.local.pv2.U",
			"P": "devices.local.pv2.P"
		}
	},
	{
		"moduleid": "devices:local:pv3",
		"mappings": {
			"I": "devices.local.pv3.I",
			"U": "devices.local.pv3.U",
			"P": "devices.local.pv3.P"
		}
	},
	{
		"moduleid": "scb:export",
		"mappings": {
			"PortalConActive": "scb.export.PortalConActive"

		}
	},
	{
		"moduleid": "scb:statistic:EnergyFlow",
		"mappings": {
			"Statistic:Autarky:Day": "scb.statistic.EnergyFlow.AutarkyDay",
			"Statistic:Autarky:Month": "scb.statistic.EnergyFlow.AutarkyMonth",
			"Statistic:Autarky:Total": "scb.statistic.EnergyFlow.AutarkyTotal",
			"Statistic:Autarky:Year": "scb.statistic.EnergyFlow.AutarkyYear",
			"Statistic:EnergyHome:Day": "scb.statistic.EnergyFlow.EnergyHomeDay",
			"Statistic:EnergyHome:Month": "scb.statistic.EnergyFlow.EnergyHomeMonth",
			"Statistic:EnergyHome:Total": "scb.statistic.EnergyFlow.EnergyHomeTotal",
			"Statistic:EnergyHome:Year": "scb.statistic.EnergyFlow.EnergyHomeYear",
			"Statistic:EnergyHomeBat:Day": "scb.statistic.EnergyFlow.EnergyHomeBatDay",
			"Statistic:EnergyHomeBat:Month": "scb.statistic.EnergyFlow.EnergyHomeBatMonth",
			"Statistic:EnergyHomeBat:Total": "scb.statistic.EnergyFlow.EnergyHomeBatTotal",
			"Statistic:EnergyHomeBat:Year": "scb.statistic.EnergyFlow.EnergyHomeBatYear",
			"Statistic:EnergyHomeGrid:Day": "scb.statistic.EnergyFlow.EnergyHomeGridDay",
			"Statistic:EnergyHomeGrid:Month": "scb.statistic.EnergyFlow.EnergyHomeGridMonth",
			"Statistic:EnergyHomeGrid:Total": "scb.statistic.EnergyFlow.EnergyHomeGridTotal",
			"Statistic:EnergyHomeGrid:Year": "scb.statistic.EnergyFlow.EnergyHomeGridYear",
			"Statistic:EnergyHomePv:Day": "scb.statistic.EnergyFlow.EnergyHomePvDay",
			"Statistic:EnergyHomePv:Month": "scb.statistic.EnergyFlow.EnergyHomePvMonth",
			"Statistic:EnergyHomePv:Total": "scb.statistic.EnergyFlow.EnergyHomePvTotal",
			"Statistic:EnergyHomePv:Year": "scb.statistic.EnergyFlow.EnergyHomePvYear",
			"Statistic:OwnConsumptionRate:Day": "scb.statistic.EnergyFlow.OwnConsumptionRateDay",
			"Statistic:OwnConsumptionRate:Month": "scb.statistic.EnergyFlow.OwnConsumptionRateMonth",
			"Statistic:OwnConsumptionRate:Total": "scb.statistic.EnergyFlow.OwnConsumptionRateTotal",
			"Statistic:OwnConsumptionRate:Year": "scb.statistic.EnergyFlow.OwnConsumptionRateYear",
			"Statistic:Yield:Day": "scb.statistic.EnergyFlow.YieldDay",
			"Statistic:Yield:Month": "scb.statistic.EnergyFlow.YieldMonth",
			"Statistic:Yield:Total": "scb.statistic.EnergyFlow.YieldTotal",
			"Statistic:Yield:Year": "scb.statistic.EnergyFlow.YieldYear",
			"Statistic:CO2Saving:Day": "scb.statistic.EnergyFlow.CO2SavingDay",
			"Statistic:CO2Saving:Month": "scb.statistic.EnergyFlow.CO2SavingMonth",
			"Statistic:CO2Saving:Year": "scb.statistic.EnergyFlow.CO2SavingYear",
			"Statistic:CO2Saving:Total": "scb.statistic.EnergyFlow.CO2SavingTotal"
		}
	}
];




const payload_settings = [
	{
		"moduleid": "devices:local",
		"mappings": {
			"Battery:DynamicSoc:Enable": "devices.local.battery.DynamicSoc",
			"Battery:MinHomeComsumption": "devices.local.battery.MinHomeConsumption", // YES, it is named Comsumption in the API
			"Battery:MinSoc": "devices.local.battery.MinSoc",
			"Battery:SmartBatteryControl:Enable": "devices.local.battery.SmartBatteryControl",
			"Battery:Strategy": "devices.local.battery.Strategy",
			"Battery:SupportedTypes": "devices.local.battery.SupportedTypes",
			"Battery:Type": "devices.local.battery.Type",
			"Inverter:MaxApparentPower": "devices.local.inverter.MaxApparentPower",
			"EnergySensor:InstalledSensor": "devices.local.EnergySensor",
			"OptionKeys:StateKey0": "devices.local.StateKey0",
			//"Properties:InverterType": "devices.local.inverter.Type",
			"Generator:ExtModuleControl:Enable": "devices.local.generator.ExtModuleControl",
			"Generator:ShadowMgmt:Enable": "devices.local.generator.ShadowMgmt"
			// "Inverter:ActivePowerLimitation","Inverter:MinActivePowerLimitation","Inverter:MaxActivePowerLimitation","EnergySensor:InstalledSensor","EnergySensor:SupportedSensors","EnergySensor:SensorPosition","EnergySensor:SupportedPositions","DigitalOutputs:Customer:ConfigurationFlags","DigitalInputs:Mode","EnergyMgmt:AcStorage
		}
	},
	{
		"moduleid": "scb:network",
		"mappings": {
			"Hostname": "scb.network.Hostname",
			"IPv4Address": "scb.network.IPv4Address",
			"IPv4Auto": "scb.network.IPv4Auto",
			"IPv4DNS1": "scb.network.IPv4DNS1",
			"IPv4DNS2": "scb.network.IPv4DNS2",
			"IPv4Gateway": "scb.network.IPv4Gateway",
			"IPv4Subnetmask": "scb.network.IPv4Subnetmask"
		}
	},
	{
		"moduleid": "scb:time",
		"mappings": {
			"NTPuse": "scb.time.NTPuse",
			"NTPservers": "scb.time.NTPservers",
			"Timezone": "scb.time.Timezone"
		}
	},
	{
		"moduleid": "scb:modbus",
		"mappings": {
			"ModbusEnable": "scb.modbus.ModbusEnable",
			"ModbusUnitId": "scb.modbus.ModbusUnitId"
		}
	},
	{
		"moduleid": "scb:export",
		"mappings": {
			"LastExport": "scb.export.LastExport",
			"LastExportOk": "scb.export.LastExportOk",
			"Portal": "scb.export.Portal",
			"ExportEnable": "scb.export.ExportEnable"
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
	deviceIpAdress = adapter.config.ipaddress;
	devicePassword = adapter.config.password;

	pollingTime = adapter.config.pollinterval || 10000;
	if(pollingTime < 5000) {
		pollingTime = 5000;
	}
	
	if(adapter.config.wfc_instance && adapter.config.wfc_instance.indexOf('kachelmann_') === 0) {
		useInternalForecast = true;
		internalForecastType = adapter.config.wfc_instance.substr(11);
		
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
	} else {
		adapter.getObject('forecast.city', function(err, obj) {
			if(!err && obj) {
				adapter.deleteObject('forecast.city');
			}
		});
		adapter.getObject('forecast.url', function(err, obj) {
			if(!err && obj) {
				adapter.deleteObject('forecast.url');
			}
		});
	}

	adapter.log.info('[INFO] Configured polling interval: ' + pollingTime);

	let dataDir = utils.getAbsoluteInstanceDataDir(adapter);
	
	if (!fs.existsSync(dataDir)){
		fs.mkdirSync(dataDir);
	}
	
	power_jsonfile = dataDir + '/pwrcons.json';
	pv_jsonfile = dataDir + '/pwrgen.json';
	fc_jsonfile = dataDir + '/fcast.json';

	try {
		let tmpJson = fs.readFileSync(power_jsonfile).toString();
		consumptionData = JSON.parse(tmpJson);
	} catch(e) {
		consumptionData = {};
	}

	try {
		let tmpJson = fs.readFileSync(pv_jsonfile).toString();
		generationData = JSON.parse(tmpJson);
	} catch(e) {
		generationData = {};
	}

	try {
		let tmpJson = fs.readFileSync(fc_jsonfile).toString();
		forecastData = JSON.parse(tmpJson);
	} catch(e) {
		forecastData = {};
	}
	
	callback && callback();
}

function unload(callback) {
	if(polling) {
		clearTimeout(polling);
	}
	
	fs.writeFileSync(power_jsonfile, JSON.stringify(consumptionData));
	fs.writeFileSync(pv_jsonfile, JSON.stringify(generationData));
	fs.writeFileSync(fc_jsonfile, JSON.stringify(forecastData));
	
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
    
    let sunpos = suncalc.getPosition(atdate, adapter.config.iob_lat, adapter.config.iob_lon); 
    let altitude = Math.degrees(sunpos.altitude);
    let azimuth =  Math.degrees(sunpos.azimuth) + 180;
 
    var airmass = 1 / Math.cos((90 - altitude) * 4 * Math.asin(1) / 360); 
 
    var Sincident = (1.367 * Math.pow(0.78, Math.pow(airmass, 0.6)));
    var fraction = Math.cos(altitude * 4 * Math.asin(1) / 360) * Math.sin(adapter.config.panel_tilt * 4 * Math.asin(1) / 360) * Math.cos(azimuth * 4 * Math.asin(1) / 360 - adapter.config.panel_dir * 4 * Math.asin(1) / 360) + Math.sin(altitude * 4 * Math.asin(1) / 360) * Math.cos(adapter.config.panel_tilt * 4 * Math.asin(1) / 360);
 
    var SmoduleInt = Sincident * fraction * adapter.config.panel_surface * 1000;
    if(SmoduleInt < 0) {
        SmoduleInt = 0;
    }

	var SmoduleEff = SmoduleInt * adapter.config.panel_efficiency / 100;
 
    if(altitude < 0) {
        SmoduleInt = 0;
        SmoduleEff = 0;
        altitude = 0;
    } else if(altitude < 8.5 && azimuth > 200) {
        SmoduleEff *= 0.18;
        SmoduleInt *= 0.18;
    } else if(altitude < 4.5 && azimuth < 200) {
        SmoduleEff *= 0.25;
        SmoduleInt *= 0.25;
    }
 
	let res = {
        altitude: altitude.toFixed(1),
        azimuth: azimuth.toFixed(),
        panelpower: SmoduleEff.toFixed()
    };
	adapter.log.debug('getSunPosPower result: ' + JSON.stringify(res));
 
    return res;
}

function storeSunPanelSkyData(panel_power, sky, vis) {
	let multisky;
	if(typeof sky === 'object') {
		let m1 = 1 - (0.75 * Math.pow(sky.low/100, 3));
		let m2 = 1 - (0.75 * Math.pow(sky.medium/100, 3));
		let m3 = 1 - (0.75 * Math.pow(sky.high/100, 3));
		multisky = m1 * m2 * m3;
	} else {
		multisky = 1 - (0.75 * Math.pow(sky/100, 3));
	}
    
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
	}, panel_power * multisky * (vis / 16));
}

function storeSunPanelData() {
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
	}, result.altitude);

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
	}, result.azimuth);

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
	}, result.panelpower);

	let sky_done = false;
	let vis_done = false;
	
	let sky = null;
	let vis = null;
	
	if(adapter.config.wfc_instance) {
		if(useInternalForecast === true) {
			let kmFc = weather.getForecastFor((new Date()).getTime(), true);
			adapter.log.debug('Using kmw data for current time: ' + JSON.stringify(kmFc));
			if(kmFc) {
				let setValue;
				if(internalForecastType === 'clouds') {
					setValue = kmFc.clouds;
				} else {
					setValue = Math.round(100 - (100 * kmFc.sun / 60));
				}
				
				ioBLib.createOrSetState('forecast.current.sky', {
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
				
				ioBLib.createOrSetState('forecast.current.visibility', {
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
				
				if(internalForecastType === 'clouds') {
					/*let pLow = 1 - (kmFc.cloud_details.low / 100);
					let pMed = 1 - (kmFc.cloud_details.medium / 100);
					let pHigh = 1 - (kmFc.cloud_details.high / 100);
					
					setValue = kmFc.cloud_details.low + kmFc.cloud_details.medium + kmFc.cloud_details.high;
					if(setValue > 100) {
						setValue = setValue - ((setValue - 100) * pLow * pMed * pHigh);
					}*/
					setValue = kmFc.cloud_details;
				} else {
					setValue = Math.round(100 - (100 * (kmFc.sun - ((120 - (kmFc.sun * 2)) / 60)) / 60));
				}
				
				storeSunPanelSkyData(result.panelpower, setValue, 16);
			}
		} else {
			let wfc_skyid = 'cloudCover';
			let wfc_id = 'current';
			if(adapter.config.wfc_instance.indexOf('weatherunderground.') === 0) {
				wfc_id = 'forecastHourly.0h';
				wfc_skyid = 'sky';
			}
			adapter.getForeignState(adapter.config.wfc_instance + '.' + wfc_id + '.' + wfc_skyid, function(err, state) {
				if(!err) {
					sky = state.val;
					sky_done = true;

					ioBLib.createOrSetState('forecast.current.sky', {
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

					if(sky_done && vis_done) {
						storeSunPanelSkyData(result.panelpower, sky, vis);
					}
				}
			});

			adapter.getForeignObject(adapter.config.wfc_instance, function(err, obj) {
				adapter.log.debug('Obj WFC: ' + JSON.stringify(obj));
			});

			adapter.getForeignState(adapter.config.wfc_instance + '.' + wfc_id + '.visibility', function(err, state) {
				if(!err) {
					if(state.val > 16) {
						state.val = 16;
					}
					vis = state.val;
					vis_done = true;

					ioBLib.createOrSetState('forecast.current.visibility', {
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

					if(sky_done && vis_done) {
						storeSunPanelSkyData(result.panelpower, sky, vis);
					}
				}
			});
		}
	}
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
		port: 80,
		host: deviceIpAdress,
		path: apiurl + endpoint,
		headers: headers
	};

	var request = http.request(reqOpts);
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
				adapter.terminate && adapter.terminate() || process.exit();
				return;
			}
			callback(body, code, headers);
		});
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

function readForecastData(callback) {
	if(useInternalForecast) {
		let fc;
		let hindex;
		let setValue;
		
		for(let i = 0; i < 36; i++) {
			hindex = i + 'h';
			fc = weather.getForecastHour(i);
			if(null !== fc) {
				if(internalForecastType === 'clouds') {
					/*let pLow = 1 - (fc.cloud_details.low / 100);
					let pMed = 1 - (fc.cloud_details.medium / 100);
					let pHigh = 1 - (fc.cloud_details.high / 100);
					
					setValue = 100 - (100 * pLow * pMed * pHigh) + ((fc.cloud_details.low + fc.cloud_details.medium + fc.cloud_details.high) / 30);*/
					setValue = fc.cloud_details;
				} else {
					setValue = Math.round(100 - (100 * (fc.sun - ((120 - (fc.sun * 2)) / 60)) / 60));
				}
				forecastHours[hindex] = {
					cloudCover: setValue,
					visibility: 16,
					time: fc.time
				};
			} else {
				forecastHours[hindex] = {
					cloudCover: null,
					visibility: null,
					time: null
				};
			}
		}
		callback(false, {});
	} else {
		readCloudForecast(function(err) {
			if(err) {
				callback(err);
			} else {
				readVisibilityForecast(function(err) {
					if(err) {
						callback(err);
					} else {
						readForecastTimes(function(err) {
							callback(err);
						});
					}
				});
			}
		});
	}
}

function readCloudForecast(callback) {
	if(!adapter.config.wfc_instance) {
		callback(true, {});
	} else if(adapter.config.wfc_instance.indexOf('weatherunderground.') === 0) {
		readFieldLoop('sky', 0, 35, callback);
	} else {
		readFieldLoop('cloudCover', 0, 35, callback);
	}
}

function readVisibilityForecast(callback) {
	readFieldLoop('visibility', 0, 35, callback);
}

function readForecastTimes(callback) {
	readFieldLoop('time', 0, 35, callback);
}

function readFieldLoop(field, current, max, callback) {
	if(!adapter.config.wfc_instance) {
		adapter.log.warn('No weather forecast adapter instance selected. Not reading forecasts.');
		callback(true);
	} else {
		let wfc_id = 'hourly';
		let wfc_addcurrent = '';
		if(adapter.config.wfc_instance.indexOf('weatherunderground.') === 0) {
			wfc_id = 'forecastHourly';
			wfc_addcurrent = 'h';
		}
		adapter.getForeignState(adapter.config.wfc_instance + '.' + wfc_id + '.' + current + '' + wfc_addcurrent + '.' + field, function(err, state) {
			if(err) {
				if(callback) {
					callback(err);
				}
			} else if(!state) {
				adapter.log.warn('Could not read ' + adapter.config.wfc_instance + '.' + wfc_id + '.' + current + '' + wfc_addcurrent + '.' + field + '. It returned null state.');
				return;
			} else {
				let hindex = current + 'h';
				if(!forecastHours[hindex]) {
					forecastHours[hindex] = {
						cloudCover: null,
						visibility: null,
						time: null
					};
				}
				
				let usefield = field;
				if(field === 'sky') {
					usefield = 'cloudCover';
				}
				forecastHours[hindex][usefield] = state.val;

				if(current >= max) {
					callback(false);
				} else {
					readFieldLoop(field, current + 1, max, callback);
				}
			}
		});
	}
}

function calcMinSoC(forecastRead) {
	if(!forecastRead) {
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

    fcDate.setMinutes(fcDate.getMinutes() + 45);

    let sunset = getAstroDate('sunset', fcDate.getTime());
    if(fcDate > sunset) {
        fcDate.setDate(fcDate.getDate() + 1);
        sunset = getAstroDate('sunset', fcDate.getTime());
    }

    let sunrise = getAstroDate('sunrise', fcDate.getTime());
    if(sunrise > sunset) {
        //* We need to get the sunrise from 24h before
        let prevDay = new Date(fcDate.getTime());
        prevDay.setDate(prevDay.getDate() - 1);
        sunrise = getAstroDate('sunrise', prevDay.getTime());
    }

	ioBLib.createOrSetState('forecast.current.sun.sunrise', {
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
	
	ioBLib.createOrSetState('forecast.current.sun.sunset', {
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
    let sky = [];
    let power = [];
    let skydate = [];
    let skyvis = [];
    let powerdate = [];
	let sunhours = [];

    let wfc_curh = 0;

    let sun_hour = 0;
    let powerTime = new Date(sunrise.getTime());
    while(powerTime.getTime() <= sunset.getTime()) {
        sun_hour++;
        let pwr = getSunPosPower(new Date(powerTime.getTime() - (30*60*1000)));
		let pwr2 = getSunPosPower(new Date(powerTime.getTime() + (30*60*1000)));
		pwr.panelpower = (parseInt(pwr.panelpower) + parseInt(pwr2.panelpower)) / 2;
        powerdate.push(powerTime.getTime());

        //let state_id = 'javascript.0.power.optimize.wufc.' + sun_hour + 'h';
        //let fcTime = new Date(powerTime.getTime());
		sunhours.push(sun_hour);

		let hindex = sun_hour + 'h';
		let curhindex = wfc_curh + 'h';
		
        let wfc_sky;
        let wfc_vis;
        let wfc_fctime = (forecastHours[curhindex] && forecastHours[curhindex].time ? forecastHours[curhindex].time : null);
		if(!wfc_fctime) {
			adapter.log.warn('Time of forecast for sunhour ' + sun_hour + ' is null. That should never happen. Cannot calc MinSoC.');
			return;
		}
        let wfc_fcdate = new Date(wfc_fctime);
        if(wfc_fcdate - powerTime > 1800000) {
            let old_fc = (forecastData[hindex] && forecastData[hindex].sky ? forecastData[hindex].sky : null);
			let old_fcvis = (forecastData[hindex] && forecastData[hindex].vis ? forecastData[hindex].vis : null);
            sky.push(old_fc);
            skyvis.push(old_fcvis);
            skydate.push(wfc_fcdate);
        } else {
            while(wfc_curh < 36) {
				let curhindex = wfc_curh + 'h';
                wfc_fctime = (forecastHours[curhindex] && forecastHours[curhindex].time ? forecastHours[curhindex].time : null);
                wfc_fcdate = new Date(wfc_fctime);
                if(Math.abs(wfc_fcdate - powerTime) <= 1800000) {
                    break;
                }
                wfc_curh++;
            }

            if(wfc_curh < 36) {
				let curhindex = wfc_curh + 'h';
                wfc_sky = (forecastHours[curhindex] ? forecastHours[curhindex].cloudCover : null);
                sky.push(wfc_sky);
                wfc_vis = (forecastHours[curhindex] ? forecastHours[curhindex].visibility : null);
                skyvis.push(wfc_vis);

                skydate.push(wfc_fcdate);
                
				if(!forecastData[hindex]) {
					forecastData[hindex] = {};
				}
				forecastData[hindex].sky = wfc_sky;
				forecastData[hindex].vis = wfc_vis;
            }
        }
        
        adapter.log.debug('Possible power at ' + powerTime + ' is: ' + pwr.panelpower + '(alt: ' + pwr.altitude + ', azi: ' + pwr.azimuth + ', sky: ' + JSON.stringify(sky) + ', vis: ' + JSON.stringify(skyvis) + ', curh:	' + wfc_curh + ', wfctime: ' + wfc_fcdate + ')');
        power.push(pwr.panelpower);
        powerTime.setHours(powerTime.getHours() + 1);
    }

    let skyavg = 0;
	let skyavg_det = {
		low: 0,
		medium: 0,
		high: 0
	};
    let skycnt = 0;
	let skycnt_det = 0;
    for(let s = 0; s < sky.length; s++) {
        if(sky[s] !== null) {
			if(typeof sky[s] === 'object') {
				skyavg_det['low'] += sky[s].low;
				skyavg_det['medium'] += sky[s].medium;
				skyavg_det['high'] += sky[s].high;
				skycnt_det++;
			} else {
				skyavg += sky[s];
				skycnt++;
			}
        }
    }
    if(skycnt > 0) {
        skyavg = skyavg / skycnt;
    }
	if(skycnt_det > 0) {
		skyavg_det['low'] = skyavg_det['low'] / skycnt_det;
		skyavg_det['medium'] = skyavg_det['medium'] / skycnt_det;
		skyavg_det['high'] = skyavg_det['high'] / skycnt_det;
		skyavg = skyavg_det;
	}

    let visavg = 0;
    let viscnt = 0;
    for(let s = 0; s < skyvis.length; s++) {
        if(skyvis[s] !== null) {
            visavg += skyvis[s];
            viscnt++;
        }
    }
    if(viscnt > 0) {
        visavg = visavg / viscnt;
    } else {
		visavg = 16;
	}

    let skypower = [];
    let skyvispower = [];
    let sun_power = 0;
    let sun_power_clear = 0;
	let max_hour = 0;
	let sunhour_power = {};
	let cursky_value;
    for(let p = 0; p < power.length; p++) {
        let multiplier;
        let vis_multiplier;
        if(sky[p] !== null) {
			cursky_value = sky[p];
            //multiplier = 1 - (0.75 * Math.pow(sky[p]/100, 3));//(1 - (Math.pow(sky[p], 1.8) / 4500));
        } else {
			cursky_value = skyavg;
            //multiplier = 1 - (0.75 * Math.pow(skyavg/100, 3)); //(1 - (Math.pow(skyavg, 1.8) / 4500));
        }
		if(typeof cursky_value === 'object') {
			let m1 = 1 - (0.75 * Math.pow(cursky_value.low/100, 3));
			let m2 = 1 - (0.75 * Math.pow(cursky_value.medium/100, 3));
			let m3 = 1 - (0.75 * Math.pow(cursky_value.high/100, 3));
			multiplier = m1 * m2 * m3;
		} else {
			multiplier = 1 - (0.75 * Math.pow(cursky_value/100, 3));
		}

        if(skyvis[p] !== null) {
            vis_multiplier = skyvis[p] / 16;
        } else {
            vis_multiplier = visavg / 16;
        }
		if(vis_multiplier > 1) {
			vis_multiplier = 1;
		}
        
        skypower[p] = power[p] * multiplier;
        skyvispower[p] = skypower[p] * vis_multiplier;

        sun_power = sun_power + skyvispower[p];
        sun_power_clear = sun_power_clear + skypower[p];

		if(sunhours[p] > max_hour) {
			max_hour = sunhours[p];
		}

		let shindex = sunhours[p] + 'h';
		sunhour_power[shindex] = skyvispower[p];
        let fc_state_id = 'forecast.power.' + sunhours[p] + 'h.power';
        ioBLib.createOrSetState(fc_state_id, {
			type: 'state',
			common: {
				name: 'Power forecast for sun hour ' + sunhours[p] + ' of day',
				type: 'number',
				role: 'value.power',
				read: true,
				write: false,
				unit: 'Wh'
			},
			native: {}
		}, skyvispower[p]);
		
        fc_state_id = 'forecast.power.' + sunhours[p] + 'h.time';
        ioBLib.createOrSetState(fc_state_id, {
			type: 'state',
			common: {
				name: 'Sun hour ' + sunhours[p] + ' starts at',
				type: 'number',
				role: 'date',
				read: true,
				write: false,
				unit: ''
			},
			native: {}
		}, powerdate[p]);
    }
	
	let to_delete = [];
	for(let p = max_hour + 1; p <= 24; p++) {
		to_delete.push('forecast.power.' + p + 'h.time');
		to_delete.push('forecast.power.' + p + 'h.power');
	}
	to_delete.forEach(function(id) {
		adapter.getObject(id, function(err, obj) {
			if(!err && obj) {
				adapter.delObject(id);
				adapter.log.info(id + ' deleted.');
			}
		});
	});
	
	
    // , dt: ' + JSON.stringify({sky: skydate, pwr: powerdate}) + '
    adapter.log.debug('Sky: ' + JSON.stringify(sky) + ', Vis: ' + JSON.stringify(skyvis) + ', Pwr: ' + JSON.stringify(power) + ', skypower: ' + JSON.stringify(skypower) + ', skyvispower: ' + JSON.stringify(skyvispower) + ', sum: ' + sun_power);

    let state_id = 'forecast.power.day';
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
	
    state_id = 'forecast.power.day_high';
	ioBLib.createOrSetState(state_id, {
		type: 'state',
		common: {
			name: 'Power forecast for day (visibility 100%)',
			type: 'number',
			role: 'value.power',
			read: true,
			write: false,
			unit: 'Wh'
		},
		native: {}
	}, sun_power_clear);

	let fcDay = new Date(powerdate[0]);
	fcDay.setHours(12, 0, 0, 0);
    state_id = 'forecast.power.date';
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
            let fcPower = sunhour_power[shindex];
            //log('Power for fc hour ' + (powerTime.getHours() + fcH) + ' is ' + fcPower);
            if(fcPower) {
                if(p < 1) {
                    fcPower = fcPower * p;
                    //log('Power for fc hour ' + (powerTime.getHours() + fcH) + ' is ' + fcPower + ' because of factor ' + p);
                }
                powerUntilSunset += fcPower;
            }
        }
	}
	ioBLib.createOrSetState('forecast.power.remaining', {
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

	if(!adapter.config.enable_minsoc) {
		return;
	}

    //* reduce estimated sun power by cloud coverage
    let max_minSoC = 40;
    let min_minSoC = 5;
    let minSoC = 40;

	adapter.getState('forecast.consumption.day', function(err, state) {
		if(!err) {
			let daily_cons = state.val;
			
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
				minSoC = Math.round(max_minSoC - (100 * possibleCharge));
				//* minSoC must not be below 0
				if(minSoC < min_minSoC) {
					minSoC = min_minSoC;
				}

				adapter.log.debug('Avg cloud coverage from ' + (curTime > sunrise ? curTime : sunrise) + ' to ' + sunset + ' is expected to be ' + Math.round(skyavg) + '%', 'debug');
				adapter.log.debug('As possible charge for generated power (' + sun_power + ') reduced by daily consumption (' + daily_cons + ') leads to a max. charge of ' + sun_power_left + 'Wh (' + Math.round(possibleCharge * 100) + '% of ' + adapter.config.battery_capacity + 'Wh) I will set minSoC to ' + minSoC + ' (min ' + min_minSoC + ', max ' + max_minSoC + ').');

				let msgadd = '';
				let curSoC;
				
				adapter.getState('devices.local.battery.SoC', function(err, state) {
					if(!err) {
						curSoC = state.val;
						//* minSoC to set should not (highly) exceed the current SoC as this would possibly lead to the battery being charged from grid
						if(minSoC > curSoC + 5) {
							msgadd = ' (von ' + minSoC + ' auf ' + curSoC + ' reduziert)';
							minSoC = curSoC + 5;
							adapter.log.info('Current SoC of battery is at ' + curSoC + ' so reducing minSoC to ' + minSoC + '.');
						}

						adapter.getState('devices.local.battery.MinSoc', function(err, state) {
							if(!err) {
								let curMinSoC = state.val;

								//* Set new minSoC value if it differs from current
								if(curMinSoC != minSoC) {
									adapter.setState('devices.local.battery.MinSoc', minSoC);
								}
							}
						});
					}
				});
				
			}
			
		}
	});

}

function login() {
	let nonce = KOSTAL.getNonce();
	let payload = {
		username: 'user',
		nonce: nonce
	};
	apiCall('POST', 'auth/start', payload, function(body, code, headers) {
		if(code !== 200) {
			adapter.log.warn('Login failed with code ' + code + ': ' + body);
			return;
		}

		var json = JSON.parse(body);
		if(!json.nonce) {
			adapter.log.warn('No nonce in json reply to start: ' + body);
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
				return;
			}

			var json = JSON.parse(body);
			if(!json.token) {
				adapter.log.warn('No nonce in json reply to finish: ' + body);
				return;
			}

			var bitSignature = KOSTAL.base64.toBits(json.signature);

			if(!KOSTAL.bitArray.equal(bitSignature, cHmac)) {
				adapter.log.warn('Signature verification failed!');
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
					return;
				}

				var json = JSON.parse(body);
				if(!json.sessionId) {
					adapter.log.warn('No session id in json reply to create session: ' + body);
					return;
				}

				loginSessionId = json.sessionId;
				adapter.log.debug('Session id is ' + loginSessionId);

				loginSuccess();
			});
		});


	});
}

function loginSuccess() {
	apiCall('GET', 'auth/me', null, function(body, code, headers) {
		adapter.log.debug('auth/me: ' + body);
	});

	apiCall('GET', 'modules', null, function(body, code, headers) {
		if(code != 200) {
			adapter.log.warn('Could not get supported modules information. Code: ' + code + ', contents: ' + body);
			process.exit();
			return;
		}
		
		var json = JSON.parse(body);
		if(!json.length) {
			adapter.log.warn('No valid module info in json reply: ' + body);
			process.exit();
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

}


function calcPowerAverages(rotate) {
	let avg = {
        day: 0,
        night: 0
    };

    for(let idx in daynight) {
        let dn = daynight[idx];
		
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

    if(rotate) {
        for(let idx in daynight) {
			let dn = daynight[idx];
			
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
		
		generationData = {
			generation: 0,
			time: 0
		};
		fs.writeFile(pv_jsonfile, JSON.stringify(generationData), function(err) {
			if(!err) {
				adapter.log.info('Power generation statistics written to disk.');
			} else {
				adapter.log.warn('Power generation statistics not written to disk.');
			}
		});
    }
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

	calcPowerAverages(false); // no rotating please!
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
			if(payload_settings[i].mappings[idx] === id) {
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
					let objid = mappings[setting.id];
					if(boolean_states.includes(objid)) {
						setting.value = (setting.value == 1);
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
			if(hasBattery !== true && battery_ids.includes(pl.mappings[idx])) {
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
			if(hasBattery !== true && battery_ids.includes(pl.mappings[idx])) {
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
			role: 'value.time',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.export.LastExportOk', {
		type: 'state',
		common: {
			name: 'Last data export ok',
			type: 'boolean',
			role: 'indicator',
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
	calcPowerAverages: calcPowerAverages
};