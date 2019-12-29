'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const apiurl = '/api/v1/';

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
	}/*,
	{
		"moduleid": "scb.statistic:EnergyFlow",
		"type": "data",
		"mappings": {
			"Statistic:Autarky:Day","Statistic:Autarky:Month","Statistic:Autarky:Total","Statistic:Autarky:Year","Statistic:EnergyHome:Day","Statistic:EnergyHome:Month","Statistic:EnergyHome:Total","Statistic:EnergyHome:Year","Statistic:EnergyHomeBat:Day","Statistic:EnergyHomeBat:Month","Statistic:EnergyHomeBat:Total","Statistic:EnergyHomeBat:Year","Statistic:EnergyHomeGrid:Day","Statistic:EnergyHomeGrid:Month","Statistic:EnergyHomeGrid:Total","Statistic:EnergyHomeGrid:Year","Statistic:EnergyHomePv:Day","Statistic:EnergyHomePv:Month","Statistic:EnergyHomePv:Total","Statistic:EnergyHomePv:Year","Statistic:OwnConsumptionRate:Day","Statistic:OwnConsumptionRate:Month","Statistic:OwnConsumptionRate:Total","Statistic:OwnConsumptionRate:Year","Statistic:Yield:Day","Statistic:Yield:Month","Statistic:Yield:Total","Statistic:Yield:Year","Statistic:CO2Saving:Day","Statistic:CO2Saving:Month","Statistic:CO2Saving:Year","Statistic:CO2Saving:Total"
		}
	}*/
];

let adapter;
var deviceIpAdress;
var devicePassword;
var debugRequests;
var loginSessionId = null;
var http = require('http');

let hasBattery = false;
let PVStringCount = 2;
let polling;
let pollingTime;

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: 'plenticore'
	});

	adapter = new utils.Adapter(options);

	adapter.on('unload', function(callback) {
		clearInterval(polling);
		try {
			apiCall('POST', 'auth/logout', null, function(body, code, headers) {
				if(code !== 200) {
					adapter.log.warn('Logout failed with code ' + code);
				} else {
					adapter.log.info('Logged out from API');
				}
			});
			http.destroy();
			adapter.log.info('[END] Stopping plenticore adapter...');
			adapter.setState('info.connection', false, true);
			callback();
		} catch(e) {
			callback();
		}
	});

	adapter.on('stateChange', function(id, state) {
		// Warning, state can be null if it was deleted
		try {
			adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

			if(!id) {
				return;
			}
			
			id = id.substring(adapter.namespace.length + 1); // remove instance name and id
			
			/*if(id === 'devices.local.StateKey0') {
				if(state.val == '85') {
					hasBattery = true;
				} else if(state.val == '78') {
					hasBattery = false;
				} else {
					adapter.log.warn('Unknown state value for devices.local.StateKey0:' + state.val);
				}
			}*/
			
			if(state.ack) {
				return;
			}
			
			state = state.val;
			adapter.log.debug("id=" + id);
			
			if(state) {
				processStateChange(id, state);
			}
		} catch(e) {
			adapter.log.info("Error processing stateChange: " + e);
		}
	});

	adapter.on('message', function(obj) {
		if(typeof obj === 'object' && obj.message) {
			if(obj.command === 'send') {
				adapter.log.debug('send command');

				if(obj.callback) {
					adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
				}
			}
		}
	});

	adapter.on('ready', function() {
		if(!adapter.config.ipaddress) {
			adapter.log.warn('[START] IP address not set');
		} else if(!adapter.config.password) {
			adapter.log.warn('[START] Password not set');
		} else {
			debugRequests = (adapter.config.debug ? true : false);
			adapter.log.info('[START] Starting plenticore adapter');
			adapter.setState('info.connection', true, true);
			adapter.getForeignObject('system.config', (err, obj) => {
				if (obj && obj.native && obj.native.secret) {
					//noinspection JSUnresolvedVariable
					adapter.config.password = decrypt(obj.native.secret, adapter.config.password);
				} else {
					//noinspection JSUnresolvedVariable
					adapter.config.password = decrypt('DF5uuSc61xV21', adapter.config.password);
				}
				main();
			});
		}
	});

	return adapter;
}


function main() {
	deviceIpAdress = adapter.config.ipaddress;
	devicePassword = adapter.config.password;

	// setPlenticoreObjects();

	pollingTime = adapter.config.pollinterval || 300000;
	if(pollingTime < 5000) {
		pollingTime = 5000;
	}
	adapter.log.info('[INFO] Configured polling interval: ' + pollingTime);
	adapter.log.debug('[START] Started Adapter with: ' + adapter.config.ipaddress);

	login();

	adapter.subscribeStates('*');
}

function processStateChange(id, value) {
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
	
	return;
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

function pollStatesDebug() {
	
	for(let p = 0; p < payload_data.length; p++) {
		let pl = payload_data[p];
		
		for(let idx in pl.mappings) {
			if(hasBattery !== true && battery_ids.includes(pl.mappings[idx])) {
				continue;
			}
			let params = {
				"moduleid": pl.moduleid,
				"processdataids": []
			};
			params.processdataids.push(idx);
			apiCall('POST', 'processdata', [params], function(body, code, headers) {
				if(code === 200) {
					processDataResponse(body, 'processdata');
				} else {
					adapter.log.warn('Requesting processdata - ' + JSON.stringify(params) + ') failed with code ' + code + ': ' + body);
				}
			});	
		}
	}
	
	for(let p = 0; p < payload_settings.length; p++) {
		let pl = payload_settings[p];
		
		for(let idx in pl.mappings) {
			if(hasBattery !== true && battery_ids.includes(pl.mappings[idx])) {
				continue;
			}
			let params = {
				"moduleid": pl.moduleid,
				"settingids": []
			};
			params.settingids.push(idx);
			apiCall('POST', 'settings', [params], function(body, code, headers) {
				if(code === 200) {
					processDataResponse(body, 'settings');
				} else {
					adapter.log.warn('Requesting settings - ' + JSON.stringify(params) + ') failed with code ' + code + ': ' + body);
				}
			});	
		}		
	}
	
}

function pollStates() {
	let payload = [];
	
	if(debugRequests) {
		return pollStatesDebug();
	}
	
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
	apiCall('POST', 'processdata', payload, function(body, code, headers) {
		if(code === 200) {
			processDataResponse(body, 'processdata');
		} else {
			adapter.log.warn('Requesting processdata - ' + JSON.stringify(payload) + ') failed with code ' + code + ': ' + body);
		}
	});	
	
	payload = [];
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
			payload.push(params);
		}
	}
	apiCall('POST', 'settings', payload, function(body, code, headers) {
		if(code === 200) {
			processDataResponse(body, 'settings');
		} else {
			adapter.log.warn('Requesting settings - ' + JSON.stringify(payload) + ') failed with code ' + code + ': ' + body);
		}
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
		
		setPlenticoreObjects();
		
		polling = setInterval(function() { pollStates(); }, pollingTime);
		if(pollingTime > 5000) {
			setTimeout(function() { pollStates(); }, 5000);
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
				process.exit();
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

function setPlenticoreObjects() {
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

// If started as allInOne/compact mode => return function to create instance
if(module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
} // endElse




/** helper functions */

var KOSTAL = {
	getNonce: function() {
		return KOSTAL.base64.fromBits(KOSTAL.random.randomWords(3));
	},
	hash: {
		sha256: function(t) {
			this.b[0] || this.O(), t ? (this.F = t.F.slice(0), this.A = t.A.slice(0), this.l = t.l) : this.reset();
		},
		hmac: function(t, e) {
			this.W = e = e || KOSTAL.hash.sha256;
			var n, r = [[],[]], i = e.prototype.blockSize / 32;
			for(this.w = [new e, new e], t.length > i && (t = e.hash(t)), n = 0; n < i; n++) {
				r[0][n] = 909522486 ^ t[n];
				r[1][n] = 1549556828 ^ t[n];
			}
			this.w[0].update(r[0]);
			this.w[1].update(r[1]);
			this.R = new e(this.w[0]);
		}
	},
	pbkdf2: function(t, e, n, r, i) {
		n = n || 10000;
		if(0 > r || 0 > n) {
			throw new KOSTAL.exception.invalid('invalid params');
		}
		'string' === typeof t && (t = KOSTAL.utf8String.toBits(t));
		'string' === typeof e && (e = KOSTAL.utf8String.toBits(e));
		t = new (i = i || KOSTAL.hash.hmac)(t);
		var a, s, u, c, l = [], d = KOSTAL.bitArray;
		for(c = 1; 32 * l.length < (r || 1); c++) {
			for(i = a = t.encrypt(d.concat(e, [c])), s = 1; s < n; s++) {
				for(a = t.encrypt(a), u = 0; u < a.length; u++) {
					i[u] ^= a[u];
				}
			}
			l = l.concat(i);
		}
		return r && (l = d.clamp(l, r)), l;
	},
	base64: {
		B: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
		fromBits: function(t, e, n) {
			var r = '', i = 0, a = KOSTAL.base64.B, s = 0, u = KOSTAL.bitArray.bitLength(t);
			for(n && (a = a.substr(0, 62) + '-_'), n = 0; 6 * r.length < u; ) {
				r += a.charAt((s ^ t[n] >>> i) >>> 26);
				6 > i ? (s = t[n] << 6 - i, i += 26, n++) : (s <<= 6, i -= 6);
			}
			for(; 3 & r.length && !e; ) {
				r += '=';
			}
			return r;
		},
		toBits: function(t, e) {
			t = t.replace(/\s|=/g, '');
			var n, r, i = [], a = 0, s = KOSTAL.base64.B, u = 0;
			for(e && (s = s.substr(0, 62) + '-_'), n = 0; n < t.length; n++) {
				if(0 > (r = s.indexOf(t.charAt(n)))) {
					throw new KOSTAL.exception.invalid('no base64 string!');
				}
				26 < a ? (a -= 26, i.push(u ^ r >>> a), u = r << 32 - a) : u ^= r << 32 - (a += 6);
			}
			56 & a && i.push(KOSTAL.bitArray.partial(56 & a, u, 1));
			return i;
		}
	},
	bitArray: {
		bitSlice: function(t, e, n) {
			t = KOSTAL.bitArray.$(t.slice(e / 32), 32 - (31 & e)).slice(1);
			return void 0 === n ? t : KOSTAL.bitArray.clamp(t, n - e);
		},
		extract: function(t, e, n) {
			var r = Math.floor(-e - n & 31);
			return (-32 & (e + n - 1 ^ e) ? t[e / 32 | 0] << 32 - r ^ t[e / 32 + 1 | 0] >>> r : t[e / 32 | 0] >>> r) & (1 << n) - 1;
		},
		concat: function(t, e) {
			if(0 === t.length || 0 === e.length) {
				return t.concat(e);
			}
			var n = t[t.length - 1],
				r = KOSTAL.bitArray.getPartial(n);
			return 32 === r ? t.concat(e) : KOSTAL.bitArray.$(e, r, 0 | n, t.slice(0, t.length - 1));
		},
		bitLength: function(t) {
			var e = t.length;
			return 0 === e ? 0 : 32 * (e - 1) + KOSTAL.bitArray.getPartial(t[e - 1]);
		},
		clamp: function(t, e) {
			if(32 * t.length < e) {
				return t;
			}
			var n = (t = t.slice(0, Math.ceil(e / 32))).length;
			e &= 31;
			0 < n && e && (t[n - 1] = KOSTAL.bitArray.partial(e, t[n - 1] & 2147483648 >> e - 1, 1));
			return t;
		},
		partial: function(t, e, n) {
			return 32 === t ? e : (n ? 0 | e : e << 32 - t) + 1099511627776 * t;
		},
		getPartial: function(t) {
			return Math.round(t / 1099511627776) || 32;
		},
		equal: function(t, e) {
			if(KOSTAL.bitArray.bitLength(t) !== KOSTAL.bitArray.bitLength(e)) {
				return false;
			}
			var n, r = 0;
			for(n = 0; n < t.length; n++) {
				r |= t[n] ^ e[n];
			}
			return 0 === r;
		},
		$: function(t, e, n, r) {
			var i;
			for(i = 0, void 0 === r && (r = []); 32 <= e; e -= 32) {
				r.push(n);
				n = 0;
			}
			if(0 === e) {
				return r.concat(t);
			}
			for(i = 0; i < t.length; i++) {
				r.push(n | t[i] >>> e);
				n = t[i] << 32 - e;
			}
			i = t.length ? t[t.length - 1] : 0;
			t = KOSTAL.bitArray.getPartial(i);
			r.push(KOSTAL.bitArray.partial(e + t & 31, 32 < e + t ? n : r.pop(), 1));
			return r;
		},
		i: function(t, e) {
			return [
				t[0] ^ e[0],
				t[1] ^ e[1],
				t[2] ^ e[2],
				t[3] ^ e[3]
			];
		},
		byteswapM: function(t) {
			var e, n;
			for(e = 0; e < t.length; ++e) {
				n = t[e];
				t[e] = n >>> 24 | n >>> 8 & 65280 | (65280 & n) << 8 | n << 24;
			}
			return t;
		}
	},
	encrypt: function(l, n) {
		var u = new KOSTAL.cipher.aes(l),
			t = KOSTAL.random.randomWords(4),
			e = KOSTAL.gcm.encrypt(u, KOSTAL.utf8String.toBits(n), t);
		return {
			iv: t,
			tag: KOSTAL.bitArray.bitSlice(e, KOSTAL.bitArray.bitLength(e) - 128),
			ciphertext: KOSTAL.bitArray.clamp(e, KOSTAL.bitArray.bitLength(e) - 128)
		};
	},
	cipher: {
		aes: function(t) {
			this.s[0][0][0] || this.O();
			var e, n, r, i, a = this.s[0][4], s = this.s[1], u = 1;
			if(4 !== (e = t.length) && 6 !== e && 8 !== e) {
				throw new KOSTAL.exception.invalid('invalid aes key size');
			}
			for(this.b = [r = t.slice(0), i = []], t = e; t < 4 * e + 28; t++) {
				n = r[t - 1];
				(0 === t % e || 8 === e && 4 === t % e) && (n = a[n >>> 24] << 24 ^ a[n >> 16 & 255] << 16 ^ a[n >> 8 & 255] << 8 ^ a[255 & n], 0 === t % e && (n = n << 8 ^ n >>> 24 ^ u << 24, u = u << 1 ^ 283 * (u >> 7)));
				r[t] = r[t - e] ^ n;
			}
			for(e = 0; t; e++, t--) {
				n = r[3 & e ? t : t - 4];
				i[e] = 4 >= t || 4 > e ? n : s[0][a[n >>> 24]] ^ s[1][a[n >> 16 & 255]] ^ s[2][a[n >> 8 & 255]] ^ s[3][a[255 & n]];
			}
		}
	},
	gcm: {
		name: 'gcm',
		encrypt: function(t, e, n, r, i) {
			var a = e.slice(0);
			return e = KOSTAL.bitArray,
					r = r || [],
					t = KOSTAL.gcm.C(true, t, a, r, n, i || 128),
					e.concat(t.data, t.tag);
		},
		decrypt: function(t, e, n, r, i) {
			var a = e.slice(0),
				s = KOSTAL.bitArray,
				u = s.bitLength(a);

			i = i || 128;
			r = r || [];
			i <= u ? (e = s.bitSlice(a, u - i), a = s.bitSlice(a, 0, u - i)) : (e = a, a = []);
			t = KOSTAL.gcm.C(false, t, a, r, n, i);
			if(!s.equal(t.tag, e)) {
				throw new KOSTAL.exception.corrupt('unmatchin tag');
			}
			return t.data;
		},
		ka: function(t, e) {
			var n, r, i, a, s, u = KOSTAL.bitArray.i;
			for(i = [0, 0, 0, 0], a = e.slice(0), n = 0; 128 > n; n++) {
				(r = 0 !== (t[Math.floor(n / 32)] & 1 << 31 - n % 32)) && (i = u(i, a));
				s = 0 !== (1 & a[3]);
				for(r = 3; 0 < r; r--) {
					a[r] = a[r] >>> 1 | (1 & a[r - 1]) << 31;
				}
				a[0] >>>= 1, s && (a[0] ^= -520093696);
			}
			return i;
		},
		j: function(t, e, n) {
			var r,
				i = n.length;
			for(e = e.slice(0), r = 0; r < i; r += 4) {
				e[0] ^= 4294967295 & n[r];
				e[1] ^= 4294967295 & n[r + 1];
				e[2] ^= 4294967295 & n[r + 2];
				e[3] ^= 4294967295 & n[r + 3];
				e = KOSTAL.gcm.ka(e, t);
			}
			return e;
		},
		C: function(t, e, n, r, i, a) {
			var s, u, c, l, d, h, f, p, _ = KOSTAL.bitArray;
			for(h = n.length, f = _.bitLength(n), p = _.bitLength(r), u = _.bitLength(i), s = e.encrypt([0, 0, 0, 0]), 96 === u ? (i = i.slice(0), i = _.concat(i, [1])) : (i = KOSTAL.gcm.j(s, [0, 0, 0, 0], i), i = KOSTAL.gcm.j(s, i, [0, 0, Math.floor(u / 4294967296), 4294967295 & u])), u = KOSTAL.gcm.j(s, [0, 0, 0, 0], r), d = i.slice(0), r = u.slice(0), t || (r = KOSTAL.gcm.j(s, u, n)), l = 0; l < h; l += 4) {
				d[3]++;
				c = e.encrypt(d);
				n[l] ^= c[0];
				n[l + 1] ^= c[1];
				n[l + 2] ^= c[2];
				n[l + 3] ^= c[3];
			}
			n = _.clamp(n, f);
			t && (r = KOSTAL.gcm.j(s, u, n));
			t = [
				Math.floor(p / 4294967296),
				4294967295 & p,
				Math.floor(f / 4294967296),
				4294967295 & f
			];
			r = KOSTAL.gcm.j(s, r, t);
			c = e.encrypt(i);
			r[0] ^= c[0];
			r[1] ^= c[1];
			r[2] ^= c[2];
			r[3] ^= c[3];
			return {
				tag: _.bitSlice(r, 0, a),
				data: n
			};
		}
	},
	exception: {
		corrupt: function(t) {
			this.toString = function() {
				return 'CORRUPT: ' + this.message;
			};
			this.message = t;
		},
		invalid: function(t) {
			this.toString = function() {
				return 'INVALID: ' + this.message;
			};
			this.message = t;
		}
	},
	utf8String: {
		fromBits: function(t) {
			var e,
				n,
				r = '',
				i = KOSTAL.bitArray.bitLength(t);
			for(e = 0; e < i / 8; e++) {
				if(0 === (3 & e)) { 
					n = t[e / 4];
				}
				r += String.fromCharCode(n >>> 8 >>> 8 >>> 8);
				n <<= 8;
			}
			return decodeURIComponent(escape(r));
		},
		toBits: function(t) {
			t = unescape(encodeURIComponent(t));
			var e,
				n = [],
				r = 0;
			for(e = 0; e < t.length; e++) {
				r = r << 8 | t.charCodeAt(e);
				if(3 === (3 & e)) { 
					n.push(r); r = 0;
				}
			}
			3 & e && n.push(KOSTAL.bitArray.partial(8 * (3 & e), r));
			return n;
		}
	},
	fa: function(t, e) {
		var n, r, o, i = t.F, a = t.b,
			s = i[0],
			u = i[1],
			c = i[2],
			l = i[3],
			d = i[4],
			h = i[5],
			f = i[6],
			p = i[7];
		for(n = 0; 64 > n; n++) {
			16 > n ? r = e[n] : (r = e[n + 1 & 15], o = e[n + 14 & 15], r = e[15 & n] = (r >>> 7 ^ r >>> 18 ^ r >>> 3 ^ r << 25 ^ r << 14) + (o >>> 17 ^ o >>> 19 ^ o >>> 10 ^ o << 15 ^ o << 13) + e[15 & n] + e[n + 9 & 15] | 0);
			r = r + p + (d >>> 6 ^ d >>> 11 ^ d >>> 25 ^ d << 26 ^ d << 21 ^ d << 7) + (f ^ d & (h ^ f)) + a[n];
			p = f;
			f = h;
			h = d;
			d = l + r | 0;
			l = c;
			c = u;
			s = r + ((u = s) & c ^ l & (u ^ c)) + (u >>> 2 ^ u >>> 13 ^ u >>> 22 ^ u << 30 ^ u << 19 ^ u << 10) | 0;
		}
		i[0] = i[0] + s | 0;
		i[1] = i[1] + u | 0;
		i[2] = i[2] + c | 0;
		i[3] = i[3] + l | 0;
		i[4] = i[4] + d | 0;
		i[5] = i[5] + h | 0;
		i[6] = i[6] + f | 0;
		i[7] = i[7] + p | 0;
	},
	c: function(t) {
		t.b = this.l(t).concat(this.l(t));
		t.L = new KOSTAL.cipher.aes(t.b);
	},
	l: function(t) {
		for(var e = 0; 4 > e && (t.h[e] = t.h[e] + 1 | 0, !t.h[e]); e++)
			;
		return t.L.encrypt(t.h);
	},
	i: function(t, e, n) {
		if(4 !== e.length) {
			throw new this.exception.invalid('invalid aes block size');
		}
		var r = t.b[n],
			i = e[0] ^ r[0],
			a = e[n ? 3 : 1] ^ r[1],
			s = e[2] ^ r[2];

		e = e[n ? 1 : 3] ^ r[3];
		var u, c, l, d, h = r.length / 4 - 2, f = 4, p = [0, 0, 0, 0];
		t = (u = t.s[n]) [0];
		var _ = u[1],
			m = u[2],
			y = u[3],
			v = u[4];
		for(d = 0; d < h; d++) {
			u = t[i >>> 24] ^ _[a >> 16 & 255] ^ m[s >> 8 & 255] ^ y[255 & e] ^ r[f];
			c = t[a >>> 24] ^ _[s >> 16 & 255] ^ m[e >> 8 & 255] ^ y[255 & i] ^ r[f + 1];
			l = t[s >>> 24] ^ _[e >> 16 & 255] ^ m[i >> 8 & 255] ^ y[255 & a] ^ r[f + 2];
			e = t[e >>> 24] ^ _[i >> 16 & 255] ^ m[a >> 8 & 255] ^ y[255 & s] ^ r[f + 3];
			f += 4;
			i = u;
			a = c;
			s = l;
		}
		for(d = 0; 4 > d; d++) {
			p[n ? 3 & -d : d] = v[i >>> 24] << 24 ^ v[a >> 16 & 255] << 16 ^ v[s >> 8 & 255] << 8 ^ v[255 & e] ^ r[f++];
			u = i;
			i = a;
			a = s;
			s = e;
			e = u;
		}
		return p;
	}
};

KOSTAL.hash.hmac.prototype.encrypt = KOSTAL.hash.hmac.prototype.mac = function(t) {
	if(this.aa) {
		throw new KOSTAL.exception.invalid('encrypt on already updated hmac called!');
	}
	this.update(t);
	return this.digest(t);
};

KOSTAL.hash.hmac.prototype.reset = function() {
	this.R = new this.W(this.w[0]);
	this.aa = false;
};

KOSTAL.hash.hmac.prototype.update = function(t) {
	this.aa = true;
	this.R.update(t);
};

KOSTAL.hash.hmac.prototype.digest = function() {
	var t = this.R.finalize();
	t = new this.W(this.w[1]).update(t).finalize();
	this.reset();
	return t;
};

KOSTAL.hash.sha256.hash = function(t) {
	return (new KOSTAL.hash.sha256).update(t).finalize();
};

KOSTAL.hash.sha256.prototype = {
	blockSize: 512,
	reset: function() {
		this.F = this.Y.slice(0);
		this.A = [];
		this.l = 0;
		return this;
	},
	update: function(t) {
		'string' === typeof t && (t = KOSTAL.utf8String.toBits(t));
		var e, n = this.A = KOSTAL.bitArray.concat(this.A, t);
		e = this.l;
		if(9007199254740991 < (t = this.l = e + KOSTAL.bitArray.bitLength(t))) {
			throw new KOSTAL.exception.invalid('Cannot hash more than 2^53 - 1 bits');
		}
		if('undefined' !== typeof Uint32Array) {
			var r = new Uint32Array(n),
				i = 0;
			for(e = 512 + e - (512 + e & 511); e <= t; e += 512) {
				KOSTAL.fa(this, r.subarray(16 * i, 16 * (i + 1)));
				i += 1;
			}
			n.splice(0, 16 * i);
		} else {
			for(e = 512 + e - (512 + e & 511); e <= t; e += 512) {
				KOSTAL.fa(this, n.splice(0, 16));
			}
		}
		return this;
	},
	finalize: function() {
		var t,
			e = this.A,
			n = this.F;
		for(t = (e = KOSTAL.bitArray.concat(e, [KOSTAL.bitArray.partial(1, 1)])).length + 2; 15 & t; t++) {
			e.push(0);
		}
		for(e.push(Math.floor(this.l / 4294967296)), e.push(0 | this.l); e.length; ) {
			KOSTAL.fa(this, e.splice(0, 16));
		}
		this.reset();
		return n;
	},
	Y: [],
	b: [],
	O: function() {
		function t(t) {
			return 4294967296 * (t - Math.floor(t)) | 0;
		}
		for(var e, n, r = 0, o = 2; 64 > r; o++) {
			for(n = true, e = 2; e * e <= o; e++) {
				if(0 === o % e) {
					n = false;
					break;
				}
			}
			n && (8 > r && (this.Y[r] = t(Math.pow(o, 0.5))), this.b[r] = t(Math.pow(o, 1 / 3)), r++);
		}
	}
};

KOSTAL.random = {
	c: [new KOSTAL.hash.sha256],
	m: [0],
	P: 0,
	H: {},
	N: 0,
	U: {},
	Z: 0,
	f: 0,
	o: 0,
	ha: 0,
	b: [0, 0, 0, 0, 0, 0, 0, 0],
	h: [0, 0, 0, 0],
	L: void 0,
	M: 6,
	D: false,
	K: {
		progress: {},
		seeded: {}
	},
	u: 0,
	ga: 0,
	I: 1,
	J: 2,
	ca: 65536,
	T: [0, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024],
	da: 30000,
	ba: 80,
	randomWords: function(t, e) {
		var n, r = [], i = [], a, s = 0;
		for(this.Z = r[0] = (new Date).valueOf() + this.da, a = 0; 16 > a; a++) {
			r.push(4294967296 * Math.random() | 0);
		}
		for(a = 0; a < this.c.length && (r = r.concat(this.c[a].finalize()), s += this.m[a], this.m[a] = 0, n || !(this.P & 1 << a)); a++)
			;
		for(this.P >= 1 << this.c.length && (this.c.push(new KOSTAL.hash.sha256), this.m.push(0)), this.f -= s, s > this.o && (this.o = s), this.P++, this.b = KOSTAL.hash.sha256.hash(this.b.concat(r)), this.L = new KOSTAL.cipher.aes(this.b), n = 0; 4 > n && (this.h[n] = this.h[n] + 1 | 0, !this.h[n]); n++)
			;

		for(n = 0; n < t; n += 4) {
			if(0 === (n + 1) % this.ca) {
				KOSTAL.c(this);
			}
			r = KOSTAL.l(this);
			i.push(r[0], r[1], r[2], r[3]);
		}
		KOSTAL.c(this);
		return i.slice(0, t);
	}
};

KOSTAL.cipher.aes.prototype = {
	encrypt: function(t) {
		return KOSTAL.i(this, t, 0);
	},
	decrypt: function(t) {
		return KOSTAL.i(this, t, 1);
	},
	s: [[[], [], [], [], []], [[], [], [], [], []]],
	O: function() {
		var t, e, n, r, o, i, a, s = this.s[0], u = this.s[1], c = s[4], l = u[4], d = [], h = [];
		for(t = 0; 256 > t; t++) {
			h[(d[t] = t << 1 ^ 283 * (t >> 7)) ^ t] = t;
		}
		for(e = n = 0; !c[e]; e ^= r || 1, n = h[n] || 1) {
			for(i = (i = n ^ n << 1 ^ n << 2 ^ n << 3 ^ n << 4) >> 8 ^ 255 & i ^ 99, c[e] = i, l[i] = e, a = 16843009 * (o = d[t = d[r = d[e]]]) ^ 65537 * t ^ 257 * r ^ 16843008 * e, o = 257 * d[i] ^ 16843008 * i, t = 0; 4 > t; t++) {
				s[t][e] = o = o << 24 ^ o >>> 8;
				u[t][i] = a = a << 24 ^ a >>> 8;
			}
		}
		for(t = 0; 5 > t; t++) {
			s[t] = s[t].slice(0);
			u[t] = u[t].slice(0);
		}
	}
};

function decrypt(key, value) {
	var result = '';
	for(var i = 0; i < value.length; ++i) {
		result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
	}
	return result;
}
