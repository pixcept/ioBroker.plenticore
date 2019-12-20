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
	'devices.local.battery.DynamicSoc',
	'devices.local.battery.SmartBatteryControl'
];

let adapter;
var deviceIpAdress;
var devicePassword;
var loginSessionId = null;
var http = require('http');

let polling;
let pollingTime;

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: 'plenticore'
	});

	adapter = new utils.Adapter(options);

	// when adapter shuts down
	adapter.on('unload', function(callback) {
		try {
			apiCall('POST', 'auth/logout', null, function(body, code, headers) {
				if(code !== 200) {
					adapter.log.warn('Logout failed with code ' + code);
				} else {
					adapter.log.info('Logged out from API');
				}
			});
			clearInterval(polling);
			http.destroy();
			adapter.log.info('[END] Stopping plenticore adapter...');
			adapter.setState('info.connection', false, true);
			callback();
		} catch(e) {
			callback();
		}
	});

	// is called if a subscribed object changes
	adapter.on('objectChange', function(id, obj) {
		// Warning, obj can be null if it was deleted
		adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
	});

	// is called if a subscribed state changes
	adapter.on('stateChange', function(id, state) {
		// Warning, state can be null if it was deleted

		try {
			adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
			//adapter.log.debug("Adapter=" + adapter.toString());

			if(!id || state.ack)
				return; // Ignore acknowledged state changes or error states
			id = id.substring(adapter.namespace.length + 1); // remove instance name and id
			state = state.val;
			adapter.log.info("id=" + id);
			
			// you can use the ack flag to detect if it is status (true) or command (false)
			if(state) {
				processStateChange(id, state);
			}
		} catch(e) {
			adapter.log.info("Fehler Befehlsauswertung: " + e);
		}
	});

	// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
	adapter.on('message', function(obj) {
		if(typeof obj === 'object' && obj.message) {
			if(obj.command === 'send') {
				// e.g. send email or pushover or whatever
				adapter.log.debug('send command');

				// Send response in callback if required
				if(obj.callback)
					adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
			}
		}
	});

	// is called when databases are connected and adapter received configuration.
	adapter.on('ready', function() {
		if(!adapter.config.ipaddress) {
			adapter.log.warn('[START] IP address not set');
		} else if(!adapter.config.password) {
			adapter.log.warn('[START] Password not set');
		} else {
			adapter.log.info('[START] Starting plenticore adapter');
			adapter.setState('info.connection', true, true);
			main();
		}
	});

	return adapter;
} // endStartAdapter


function main() {
	// Vars
	deviceIpAdress = adapter.config.ipaddress;
	devicePassword = adapter.config.password;

	setPlenticoreObjects();

	pollingTime = adapter.config.pollinterval || 300000;
	if(pollingTime < 5000) {
		pollingTime = 5000;
	}
	adapter.log.info('[INFO] Configured polling interval: ' + pollingTime);
	adapter.log.debug('[START] Started Adapter with: ' + adapter.config.ipaddress);

	if(!loggedIn()) {
		login();
	}

	// all states changes inside the adapters namespace are subscribed
	adapter.subscribeStates('*');
} // endMain


function loggedIn() {
	return false;
}

function processStateChange(id, value) {
	if(id === 'devices.local.battery.MinSoc') {
		let payload = [
			{
				"moduleid": "devices:local",
				"settings": [
					{
						"id": "Battery:MinSoc",
						"value": value + "" // make sure it is a string
					}
				]
			}
		];
		apiCall('PUT', 'settings', payload, function(body, code, headers) {
			adapter.log.info('PUT to settings battery resulted in code ' + code + ': ' + body);
			if(code === 200) {
				processDataResponse(body, {"Battery:MinSoc": "devices.local.battery.MinSoc"}, 'settings');
			}
		});
	} else {
		adapter.log.warn('State changing of ' + id + ' not yet implemented.');
	}

}

function processDataResponse(data, mappings, dataname) {
	let json = JSON.parse(data);
	if('undefined' === typeof json) {
		adapter.log.warn('Invalid json data received: ' + data);
		return;
	}
	
	if(json.length > 0 && json[0]) {
		json = json[0];
	} else {
		adapter.log.warn('Invalid json data received: ' + JSON.stringify(data));
		return;
	}
	if(json[dataname]) {
		for(let i in json[dataname]) {
			let setting = json[dataname][i];
			if(mappings[setting.id]) {
				let objid = mappings[setting.id];
				if(boolean_states.includes(objid)) {
					setting.value = (setting.value == 1);
				}
				
				adapter.log.info('Setting ' + objid + ' to ' + setting.value + " now.");
				adapter.setState(objid, setting.value, true);
			} else {
				adapter.log.warn('Not in mappings: ' + setting.id + ' = ' + setting.value);
			}
		}
	}
	
}

function pollStates() {
	var payload = [
		{
			"moduleid": "devices:local",
			"type": "settings",
			"mappings": {
				"Battery:DynamicSoc:Enable": "devices.local.battery.DynamicSoc",
				"Battery:MinHomeConsumption": "devices.local.battery.MinHomeConsumption",
				"Battery:MinSoc": "devices.local.battery.MinSoc",
				"Battery:SmartBatteryControl:Enable": "devices.local.battery.SmartBatteryControl",
				"Battery:Strategy": "devices.local.battery.Strategy",
				"Battery:SupportedTypes": "devices.local.battery.SupportedTypes",
				"Battery:Type": "devices.local.battery.Type",
				"EnergySensor:InstalledSensor": "devices.local.EnergySensor",
				"Inverter:MaxApparentPower": "devices.local.inverter.MaxApparentPower",
				"OptionKeys:StateKey0": "devices.local.StateKey0",
				"Properties:InverterType": "devices.local.inverter.Type"
				// "Inverter:ActivePowerLimitation","Inverter:MinActivePowerLimitation","Inverter:MaxApparentPower","Inverter:MaxActivePowerLimitation","EnergySensor:InstalledSensor","EnergySensor:SupportedSensors","EnergySensor:SensorPosition","EnergySensor:SupportedPositions","DigitalOutputs:Customer:ConfigurationFlags","DigitalInputs:Mode","EnergyMgmt:AcStorage","Battery:Type","Battery:SmartBatteryControl:Enable","Battery:DynamicSoc:Enable"
			}
		},
		{
			"moduleid": "devices:local",
			"type": "data",
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
			"type": "data",
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
			"type": "data",
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
			"type": "data",
			"mappings": {
				"I": "devices.local.pv1.I",
				"U": "devices.local.pv1.U",
				"P": "devices.local.pv1.P"
			}
		},
		{
			"moduleid": "devices:local:pv2",
			"type": "data",
			"mappings": {
				"I": "devices.local.pv2.I",
				"U": "devices.local.pv2.U",
				"P": "devices.local.pv2.P"
			}
		},
		{
			"moduleid": "scb:network",
			"type": "settings",
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
			"type": "settings",
			"mappings": {
				"NTPuse": "scb.time.NTPuse",
				"NTPservers": "scb.time.NTPservers",
				"Timezone": "scb.time.Timezone"
			}
		},
		{
			"moduleid": "scb:modbus",
			"type": "settings",
			"mappings": {
				"ModbusEnable": "scb.modbus.ModbusEnable",
				"ModbusUnitId": "scb.modbus.ModbusUnitId"
			}
		},
		{
			"moduleid": "scb:export",
			"type": "data",
			"mappings": {
				"PortalConActive": "scb.export.PortalConActive"
				
			}
		},
		{
			"moduleid": "scb:export",
			"type": "settings",
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
	
	for(let p = 0; p < payload.length; p++) {
		let pl = payload[p];
		
		let params = {
			"moduleid": pl.moduleid
		};
		let act = (pl.type === 'data' ? 'processdata' : 'settings');
		let idname = (pl.type === 'data' ? 'processdataids' : 'settingids');
		params[idname] = [];
		for(let idx in pl.mappings) {
			params[idname].push(idx);
		}
		
		adapter.log.info('Requesting ' + params[idname].join(',') + ' from ' + pl.moduleid + ' (' + act + ')');
		apiCall('POST', act, [params], function(body, code, headers) {
			if(code === 200) {
				processDataResponse(body, pl.mappings, act);
			} else {
				adapter.log.warn(pl.moduleid + ' (' + act + ') failed with code ' + code + ': ' + body);
			}
		});	
	}
}

function loginSuccess() {
	apiCall('GET', 'auth/me', null, function(body, code, headers) {
		adapter.log.info('auth/me: ' + body);
	});

	polling = setInterval(function() { pollStates(); }, pollingTime);
	pollStates();

	/*
	 GET modules
	 ->
	 [{"id":"devices:local","type":"device"},{"id":"devices:local:ac","type":"device:ac"},{"id":"devices:local:battery","type":"device:battery"},{"id":"devices:local:powermeter","type":"device:powermeter"},{"id":"devices:local:pv1","type":"device:pv"},{"id":"devices:local:pv2","type":"device:pv"},{"id":"devices:prober","type":"device"},{"id":"scb:event","type":"service"},{"id":"scb:export","type":"service"},{"id":"scb:logging:logger1","type":"service"},{"id":"scb:logging:logger2","type":"service"},{"id":"scb:modbus","type":"service"},{"id":"scb:network","type":"service"},{"id":"scb:rse","type":"service"},{"id":"scb:statistic:EnergyFlow","type":"service"},{"id":"scb:time","type":"service"}]
	 
	 
	 POST settings
	 [{"moduleid":"scb:network","settingids":["Hostname"]}]
	 ->
	 [{"moduleid":"scb:network","settings":[{"value":"Plenticore","id":"Hostname"}]}]
	 
	 
	 [{"moduleid":"devices:local","settingids":["Properties:InverterType"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"0","id":"Properties:InverterType"}]}]
	 
	 
	 [{"moduleid":"devices:local","settingids":["Battery:SupportedTypes","OptionKeys:StateKey0"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"6","id":"Battery:SupportedTypes"},{"value":"85","id":"OptionKeys:StateKey0"}]}]
	 
	 
	 
	 
	 POST processdata
	 [{"moduleid":"devices:local:ac","processdataids":["CosPhi","Frequency","L1_I","L1_P","L1_U","L2_I","L2_P","L2_U","L3_I","L3_P","L3_U","P","Q","S"]}]
	 ->
	 [{"moduleid":"devices:local:ac","processdata":[{"id":"CosPhi","unit":"","value":1.0},{"id":"Frequency","unit":"","value":49.9816894531},{"id":"L1_I","unit":"","value":0.3743489385},{"id":"L1_P","unit":"","value":16.1116294861},{"id":"L1_U","unit":"","value":231.8003997803},{"id":"L2_I","unit":"","value":0.3835042119},{"id":"L2_P","unit":"","value":6.9983382225},{"id":"L2_U","unit":"","value":231.3774719238},{"id":"L3_I","unit":"","value":0.4313150942},{"id":"L3_P","unit":"","value":9.8052024841},{"id":"L3_U","unit":"","value":233.8445587158},{"id":"P","unit":"","value":33.0},{"id":"Q","unit":"","value":274.2155151367},{"id":"S","unit":"","value":276.1838989258}]}]
	 
	 [{"moduleid":"devices:local:battery","processdataids":["Cycles","SoC","I","U","P"]}]
	 ->
	 [{"moduleid":"devices:local:battery","processdata":[{"id":"Cycles","unit":"","value":7.0},{"id":"I","unit":"","value":-0.8433549404},{"id":"P","unit":"","value":-305.0},{"id":"SoC","unit":"","value":12.0},{"id":"U","unit":"","value":362.9692687988}]}]
	 
	 [{"moduleid":"devices:local:pv1","processdataids":["I","P","U"]},{"moduleid":"devices:local:pv2","processdataids":["I","P","U"]}]
	 ->
	 [{"moduleid":"devices:local:pv1","processdata":[{"id":"I","unit":"","value":0.4049358368},{"id":"P","unit":"","value":188.9914855957},{"id":"U","unit":"","value":470.4332275391}]},{"moduleid":"devices:local:pv2","processdata":[{"id":"I","unit":"","value":0.4040648043},{"id":"P","unit":"","value":190.5612335205},{"id":"U","unit":"","value":469.3612670898}]}]
	 
	 [{"moduleid":"devices:local:battery","processdataids":["Cycles","SoC","I","U","P"]}]
	 ->
	 [{"moduleid":"devices:local:battery","processdata":[{"id":"Cycles","unit":"","value":7.0},{"id":"I","unit":"","value":-0.8420979381},{"id":"P","unit":"","value":-305.0},{"id":"SoC","unit":"","value":12.0},{"id":"U","unit":"","value":362.9721374512}]}]
	 
	 [{"moduleid":"devices:local","processdataids":["Dc_P","DigitalIn","HomeOwn_P","Home_P","HomeBat_P","HomeGrid_P","HomePv_P","Inverter:State","LimitEvuAbs","EM_State"]}]
	 ->
	 [{"moduleid":"devices:local","processdata":[{"id":"Dc_P","unit":"","value":60.6196289062},{"id":"DigitalIn","unit":"","value":0.0},{"id":"EM_State","unit":"","value":0.0},{"id":"HomeBat_P","unit":"","value":0.0},{"id":"HomeGrid_P","unit":"","value":487.0},{"id":"HomeOwn_P","unit":"","value":22.0},{"id":"HomePv_P","unit":"","value":22.0},{"id":"Home_P","unit":"","value":512.0},{"id":"Inverter:State","unit":"","value":6.0},{"id":"LimitEvuAbs","unit":"","value":7447.5869140625}]}]
	 
	 
	 [{"moduleid":"scb:statistic:EnergyFlow","processdataids":["Statistic:Autarky:Day","Statistic:Autarky:Month","Statistic:Autarky:Total","Statistic:Autarky:Year","Statistic:EnergyHome:Day","Statistic:EnergyHome:Month","Statistic:EnergyHome:Total","Statistic:EnergyHome:Year","Statistic:EnergyHomeBat:Day","Statistic:EnergyHomeBat:Month","Statistic:EnergyHomeBat:Total","Statistic:EnergyHomeBat:Year","Statistic:EnergyHomeGrid:Day","Statistic:EnergyHomeGrid:Month","Statistic:EnergyHomeGrid:Total","Statistic:EnergyHomeGrid:Year","Statistic:EnergyHomePv:Day","Statistic:EnergyHomePv:Month","Statistic:EnergyHomePv:Total","Statistic:EnergyHomePv:Year","Statistic:OwnConsumptionRate:Day","Statistic:OwnConsumptionRate:Month","Statistic:OwnConsumptionRate:Total","Statistic:OwnConsumptionRate:Year","Statistic:Yield:Day","Statistic:Yield:Month","Statistic:Yield:Total","Statistic:Yield:Year","Statistic:CO2Saving:Day","Statistic:CO2Saving:Month","Statistic:CO2Saving:Year","Statistic:CO2Saving:Total"]}]
	 ->
	 [{"moduleid":"scb:statistic:EnergyFlow","processdata":[{"id":"Statistic:Autarky:Day","unit":"","value":4.0658699562},{"id":"Statistic:Autarky:Month","unit":"","value":25.8886794751},{"id":"Statistic:Autarky:Total","unit":"","value":28.7488473504},{"id":"Statistic:Autarky:Year","unit":"","value":28.7488473504},{"id":"Statistic:CO2Saving:Day","unit":"","value":401.3860040663},{"id":"Statistic:CO2Saving:Month","unit":"","value":114212.3564591543},{"id":"Statistic:CO2Saving:Total","unit":"","value":155409.1707773388},{"id":"Statistic:CO2Saving:Year","unit":"","value":155409.1707773388},{"id":"Statistic:EnergyHome:Day","unit":"","value":13976.6658198425},{"id":"Statistic:EnergyHome:Month","unit":"","value":421974.8506074052},{"id":"Statistic:EnergyHome:Total","unit":"","value":509314.0935181878},{"id":"Statistic:EnergyHome:Year","unit":"","value":509314.0935181878},{"id":"Statistic:EnergyHomeBat:Day","unit":"","value":226.399048583},{"id":"Statistic:EnergyHomeBat:Month","unit":"","value":48112.2674714212},{"id":"Statistic:EnergyHomeBat:Total","unit":"","value":67549.9723851297},{"id":"Statistic:EnergyHomeBat:Year","unit":"","value":67549.9723851297},{"id":"Statistic:EnergyHomeGrid:Day","unit":"","value":13417.7634211703},{"id":"Statistic:EnergyHomeGrid:Month","unit":"","value":312810.1753719257},{"id":"Statistic:EnergyHomeGrid:Total","unit":"","value":362978.2161863383},{"id":"Statistic:EnergyHomeGrid:Year","unit":"","value":362978.2161863383},{"id":"Statistic:EnergyHomePv:Day","unit":"","value":341.8038645739},{"id":"Statistic:EnergyHomePv:Month","unit":"","value":61131.1375588205},{"id":"Statistic:EnergyHomePv:Total","unit":"","value":78871.1048897565},{"id":"Statistic:EnergyHomePv:Year","unit":"","value":78871.1048897565},{"id":"Statistic:OwnConsumptionRate:Day","unit":"","value":99.10438717},{"id":"Statistic:OwnConsumptionRate:Month","unit":"","value":66.9547533633},{"id":"Statistic:OwnConsumptionRate:Total","unit":"","value":65.9519328127},{"id":"Statistic:OwnConsumptionRate:Year","unit":"","value":65.9519328127},{"id":"Statistic:Yield:Day","unit":"","value":573.4085772376},{"id":"Statistic:Yield:Month","unit":"","value":163160.5092273633},{"id":"Statistic:Yield:Total","unit":"","value":222013.101110484},{"id":"Statistic:Yield:Year","unit":"","value":222013.101110484}]}]
	 
	 [{"moduleid":"scb:export","processdataids":["PortalConActive"]}]
	 ->
	 [{"moduleid":"scb:export","processdata":[{"id":"PortalConActive","unit":"","value":1.0}]}]
	 
	 
	 POST SETTINGS
	 // Grundeinstellungen
	 [{"moduleid":"scb:time","settingids":["NTPuse"]}]
	 ->
	 [{"moduleid":"scb:time","settings":[{"value":"1","id":"NTPuse"}]}]
	 
	 [{"moduleid":"scb:time","settingids":["NTPservers","Timezone"]},{"moduleid":"scb:network","settingids":["Hostname"]}]
	 ->
	 [{"moduleid":"scb:time","settings":[{"value":"time.google.com","id":"NTPservers"},{"value":"Europe\/Berlin","id":"Timezone"}]},{"moduleid":"scb:network","settings":[{"value":"Plenticore","id":"Hostname"}]}]
	 
	 
	 // Netzwerk
	 [{"moduleid":"scb:time","settings":[{"id":"NTPservers","value":" time.google.com "},{"id":"Timezone","value":"Europe/Berlin"},{"id":"NTPuse","value":"1"}]},{"moduleid":"scb:network","settings":[{"id":"Hostname","value":"PlenticoreWR"}]}]
	 ->
	 [{"moduleid":"scb:network","settings":[{"value":"192.168.2.48","id":"IPv4Address"},{"value":"1","id":"IPv4Auto"},{"value":"192.168.2.1","id":"IPv4DNS1"},{"value":"","id":"IPv4DNS2"},{"value":"192.168.2.1","id":"IPv4Gateway"},{"value":"255.255.255.0","id":"IPv4Subnetmask"}]}]
	 
	 
	 // Modbus
	 [{"moduleid":"scb:modbus","settingids":["ModbusEnable","ModbusUnitId"]}]
	 ->
	 [{"moduleid":"scb:modbus","settings":[{"value":"1","id":"ModbusEnable"},{"value":"71","id":"ModbusUnitId"}]}]
	 
	 
	 // Portal
	 [{"moduleid":"scb:export","settingids":["LastExport","LastExportOk"]}]
	 ->
	 [{"moduleid":"scb:export","settings":[{"value":"1576860783","id":"LastExport"},{"value":"1576860783","id":"LastExportOk"}]}]
	 
	 [{"moduleid":"scb:export","settingids":["AvailablePortals","Portal"]}]
	 ->
	 [{"moduleid":"scb:export","settings":[{"value":"1","id":"AvailablePortals"},{"value":"1","id":"Portal"}]}]
	 
	 [{"moduleid":"scb:export","settingids":["ExportEnable","Portal"]}]
	 ->
	 [{"moduleid":"scb:export","settings":[{"value":"1","id":"ExportEnable"},{"value":"1","id":"Portal"}]}]
	 
	 
	 // Energiemanagement (READONLY)
	 [{"moduleid":"devices:local","settingids":["Inverter:ActivePowerLimitation","Inverter:MinActivePowerLimitation","Inverter:MaxApparentPower","Inverter:MaxActivePowerLimitation","EnergySensor:InstalledSensor","EnergySensor:SupportedSensors","EnergySensor:SensorPosition","EnergySensor:SupportedPositions","DigitalOutputs:Customer:ConfigurationFlags","DigitalInputs:Mode","EnergyMgmt:AcStorage","Battery:Type","Battery:SmartBatteryControl:Enable","Battery:DynamicSoc:Enable"]},{"moduleid":"scb:rse","settingids":["Inverter:PowerCtrlBroadcast:Mode"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"0","id":"Battery:DynamicSoc:Enable"},{"value":"1","id":"Battery:SmartBatteryControl:Enable"},{"value":"4","id":"Battery:Type"},{"value":"0","id":"DigitalInputs:Mode"},{"value":"0","id":"DigitalOutputs:Customer:ConfigurationFlags"},{"value":"0","id":"EnergyMgmt:AcStorage"},{"value":"3","id":"EnergySensor:InstalledSensor"},{"value":"1","id":"EnergySensor:SensorPosition"},{"value":"3","id":"EnergySensor:SupportedPositions"},{"value":"14","id":"EnergySensor:SupportedSensors"},{"value":"6930.0","id":"Inverter:ActivePowerLimitation"},{"value":"1.0","id":"Inverter:MaxActivePowerLimitation"},{"value":"10000.0","id":"Inverter:MaxApparentPower"},{"value":"0.0","id":"Inverter:MinActivePowerLimitation"}]},{"moduleid":"scb:rse","settings":[{"value":"0","id":"Inverter:PowerCtrlBroadcast:Mode"}]}]
	 
	 
	 // Generatoreinstellungen
	 [{"moduleid":"devices:local","settingids":["Generator:ExtModuleControl:Enable","Generator:ShadowMgmt:Enable"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"0","id":"Generator:ExtModuleControl:Enable"},{"value":"0","id":"Generator:ShadowMgmt:Enable"}]}]
	 
	 
	 // Batterieeinstellungen
	 [{"moduleid":"devices:local","settingids":["Battery:SupportedTypes","Inverter:MaxApparentPower","Battery:Type","Battery:Strategy","Battery:MinSoc","Battery:MinHomeComsumption","Battery:SmartBatteryControl:Enable","Battery:DynamicSoc:Enable","EnergySensor:InstalledSensor","EnergyMgmt:AcStorage"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"0","id":"Battery:DynamicSoc:Enable"},{"value":"100.0","id":"Battery:MinHomeComsumption"},{"value":"15","id":"Battery:MinSoc"},{"value":"1","id":"Battery:SmartBatteryControl:Enable"},{"value":"1","id":"Battery:Strategy"},{"value":"6","id":"Battery:SupportedTypes"},{"value":"4","id":"Battery:Type"},{"value":"0","id":"EnergyMgmt:AcStorage"},{"value":"3","id":"EnergySensor:InstalledSensor"},{"value":"10000.0","id":"Inverter:MaxApparentPower"}]}]
	 // Battery:Type: 0 -> no, 2 -> piko -> 4 BYD
	 // Battery:Strategy: 1 -> auto, 2 -> auto economy
	 
	 
	 // Zusatzoptionen
	 [{"moduleid":"devices:local","settingids":["OptionKeys:StateKey0","OptionKeys:StateKey1","OptionKeys:StateKey2","OptionKeys:StateKey3","OptionKeys:StateKey4","Properties:InverterType"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"85","id":"OptionKeys:StateKey0"},{"value":"78","id":"OptionKeys:StateKey1"},{"value":"78","id":"OptionKeys:StateKey2"},{"value":"78","id":"OptionKeys:StateKey3"},{"value":"78","id":"OptionKeys:StateKey4"},{"value":"0","id":"Properties:InverterType"}]}]
	 // 85 -> aktiv (Key0 Batterieeingang)
	 
	 
	 
	 PUT settings
	 [{"moduleid":"scb:time","settings":[{"id":"NTPservers","value":" time.google.com  pool.ntp.org"},{"id":"Timezone","value":"Europe/Berlin"},{"id":"NTPuse","value":"1"}]},{"moduleid":"scb:network","settings":[{"id":"Hostname","value":"Plenticore"}]}]
	 ->
	 [{"moduleid":"scb:time","settings":[{"id":"NTPservers","value":" time.google.com  pool.ntp.org"},{"id":"Timezone","value":"Europe/Berlin"},{"id":"NTPuse","value":"1"}]},{"moduleid":"scb:network","settings":[{"id":"Hostname","value":"Plenticore"}]}]
	 
	 
	 PUT Batterieeinstellungen
	 [{"moduleid":"devices:local","settings":[{"id":"Battery:Type","value":"4"}]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"id":"Battery:Type","value":"4"}]}]
	 
	 [{"moduleid":"devices:local","settings":[{"id":"Battery:Strategy","value":"1"}]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"1","id":"Battery:Strategy"}]}]
	 
	 [{"moduleid":"devices:local","settings":[{"id":"Battery:MinHomeComsumption","value":"100"}]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"100.0","id":"Battery:MinHomeComsumption"}]}]
	 
	 [{"moduleid":"devices:local","settings":[{"id":"Battery:MinSoc","value":"20"}]}]  0 + Dynamic enabled!
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"15","id":"Battery:MinSoc"}]}]
	 
	 [{"moduleid":"devices:local","settings":[{"id":"Battery:DynamicSoc:Enable","value":"0"}]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"0","id":"Battery:DynamicSoc:Enable"}]}]
	 
	 [{"moduleid":"devices:local","settings":[{"id":"Battery:SmartBatteryControl:Enable","value":"1"}]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"1","id":"Battery:SmartBatteryControl:Enable"}]}]
	 
	 
	 
	 
	 
	 */
}


function login() {
	let nonce = getNonce();
	let payload = {
		username: 'user',
		nonce: nonce
	};
	apiCall('POST', 'auth/start', payload, function(body, code, headers) {
		adapter.log.info('login start result is ' + code);
		if(code !== 200) {
			return;
		}

		var json = JSON.parse(body);
		if(!json.nonce) {
			adapter.log.warn('No nonce in json reply to start: ' + body);
			return;
		}
		//		{"nonce":"HcamZyTBedEOBV0RldQTw3FPOZ8JYp4G","transactionId":"a80b7901092b1ad79a2f41af1769755e75b326b496dd37f97cd18da0b0a693cf","salt":"jk9A5Yenvjf4E2Xv","rounds":29000}

		var e = json.transactionId;
		var i = json.nonce;
		var a = json.salt;
		var o = parseInt(json.rounds);

		var r = hash.pbkdf2(devicePassword, base64.toBits(a), o);
		var s = new hash.hmac(r, hash.sha256).mac('Client Key');
		var c = new hash.hmac(r, hash.sha256).mac('Server Key');
		var _ = hash.sha256.hash(s);
		var d = 'n=user,r=' + nonce + ',r=' + i + ',s=' + a + ',i=' + o + ',c=biws,r=' + i;
		adapter.log.info('hash base string: ' + d);
		var g = new hash.hmac(_, hash.sha256).mac(d);
		var p = new hash.hmac(c, hash.sha256).mac(d);
		var f = s.map(function(l, n) {
			return l ^ g[n];
		});
		var payload = {
			transactionId: e,
			proof: base64.fromBits(f)
		};
		//{"transactionId":"a80b7901092b1ad79a2f41af1769755e75b326b496dd37f97cd18da0b0a693cf","proof":"OcRFTOuL7y2oIuNN+Rf6W9uvchu5lU2cIclHF+Ut/HY="}

		apiCall('POST', 'auth/finish', payload, function(body, code, headers) {
			// {"token":"345c162f887f4626dacea8bc01f6e1c41c4a00abd42f4a8409b8e88f81fef3f3","signature":"v9z0scla\/\/aVKg3kYrDESxVHFSBD2lNbId0KZhMo9z0="}
			adapter.log.info('login finish result is ' + code);
			if(code !== 200) {
				return;
			}

			var json = JSON.parse(body);
			if(!json.token) {
				adapter.log.warn('No nonce in json reply to finish: ' + body);
				return;
			}

			var b = base64.toBits(json.signature);

			if(!bitArray.equal(b, p)) {
				adapter.log.warn('Signature verification failed!');
				return;
			}

			var y = new hash.hmac(_, hash.sha256);
			y.update('Session Key');
			y.update(d);
			y.update(s);
			var P = y.digest();
			json.protocol_key = P;
			json.transactionId = e;

			var pkey = json.protocol_key,
					tok = json.token,
					transId = json.transactionId,
					t = hash.encrypt(pkey, tok);
			var iv = t.iv,
					tag = t.tag,
					ciph = t.ciphertext,
					payload = {
						transactionId: transId,
						iv: base64.fromBits(iv),
						tag: base64.fromBits(tag),
						payload: base64.fromBits(ciph)
					};
			// {"transactionId":"a80b7901092b1ad79a2f41af1769755e75b326b496dd37f97cd18da0b0a693cf","iv":"bYjFOn7amFiafHuCqaPQGQ==","tag":"lPBQC9CanUDNsZQpjxboUw==","payload":"AVHcFsyokAGKIQOyM930+qKzhrnkTU/re27LNZTwHpXM0Hk9m0sbMozDC78rptBKJg3r5z8avqb3LZH01pmsKQ=="}
			apiCall('POST', 'auth/create_session', payload, function(body, code, headers) {
				// {"sessionId":"bd95aac1efe2bce7c4a82f77ce5bb5ad4fff4ee798fa28b34e5d1b757ed6f601"}

				adapter.log.info('login create session result is ' + code);
				if(code !== 200) {
					return;
				}

				var json = JSON.parse(body);
				if(!json.sessionId) {
					adapter.log.warn('No session id in json reply to create session: ' + body);
					return;
				}

				loginSessionId = json.sessionId;
				adapter.log.info('Session id is ' + loginSessionId);

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
		'devices.local.pv1': 'PV line 1',
		'devices.local.pv2': 'PV Line 2',
		'devices.prober': 'Prober', // ???
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
	
	for(let idx in channels) {
		adapter.setObjectNotExists(idx, {
			type: 'channel',
			common: {
				name: channels[idx]
			},
			native: {}
		});
	}

	
	adapter.setObjectNotExists('devices.local.inverter.Type', {
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
	});
	
	adapter.setObjectNotExists('devices.local.inverter.MaxApparentPower', {
		type: 'state',
		common: {
			name: 'Inverter max. power',
			type: 'number',
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});
	
	adapter.setObjectNotExists('devices.local.pv1.I', {
		type: 'state',
		common: {
			name: 'PV line 1 current',
			type: 'number',
			role: 'value.info',
			unit: 'A',
			read: true,
			write: false
		},
		native: {}
	});
	
	adapter.setObjectNotExists('devices.local.pv1.U', {
		type: 'state',
		common: {
			name: 'PV line 1 voltage',
			type: 'number',
			role: 'value.info',
			unit: 'V',
			read: true,
			write: false
		},
		native: {}
	});
	
	adapter.setObjectNotExists('devices.local.pv1.P', {
		type: 'state',
		common: {
			name: 'PV line 1 power',
			type: 'number',
			role: 'value.info',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('devices.local.pv2.I', {
		type: 'state',
		common: {
			name: 'PV line 2 current',
			type: 'number',
			role: 'value.info',
			unit: 'A',
			read: true,
			write: false
		},
		native: {}
	});
	
	adapter.setObjectNotExists('devices.local.pv2.U', {
		type: 'state',
		common: {
			name: 'PV line 2 voltage',
			type: 'number',
			role: 'value.info',
			unit: 'V',
			read: true,
			write: false
		},
		native: {}
	});
	
	adapter.setObjectNotExists('devices.local.pv2.P', {
		type: 'state',
		common: {
			name: 'PV line 2 power',
			type: 'number',
			role: 'value.info',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});

	
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
			unit: 'W',
			read: true,
			write: false
		},
		native: {}
	});
	
	/** Statistics */
	/*adapter.setObjectNotExists('scb.statistic.EnergyFlow.', {
		type: 'state',
		common: {
			name: '',
			type: 'number',
			role: 'value.info',
			unit: '',
			read: true,
			write: false
		},
		native: {}
	});*/
	
	adapter.setObjectNotExists('scb.export.PortalConActive', {
		type: 'state',
		common: {
			name: 'Portal link active',
			type: 'boolean',
			role: 'value.info',
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
			role: 'value.info',
			read: true,
			write: true,
		},
		native: {}
	});

	adapter.setObjectNotExists('scb.time.NTPservers', {
		type: 'state',
		common: {
			name: 'NTP servers',
			type: 'string',
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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

	 /* // Generatoreinstellungen
	 [{"moduleid":"devices:local","settingids":["Generator:ExtModuleControl:Enable","Generator:ShadowMgmt:Enable"]}]
	 ->
	 [{"moduleid":"devices:local","settings":[{"value":"0","id":"Generator:ExtModuleControl:Enable"},{"value":"0","id":"Generator:ShadowMgmt:Enable"}]}]*/

	 /** settings battery */
	 
	 adapter.setObjectNotExists('devices.local.battery.DynamicSoc', {
		type: 'state',
		common: {
			name: 'Enable Dynamic SoC',
			type: 'boolean',
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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
			role: 'value.info',
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


	/*adapter.setObjectNotExists('', {
		type: 'state',
		common: {
			name: '',
			desc: '',
			type: '',
			role: 'value.info',
			read: true,
			write: true,
			states: {
				0: "???"
			},
			def: 0
		},
		native: {}
	});*/
	

	
	
}

// If started as allInOne/compact mode => return function to create instance
if(module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
} // endElse












/** helper functions */

function getNonce() {
	return base64.fromBits(random.randomWords(3))
}


var hash = {
	sha256: function(t) {
		this.b[0] || this.O(), t ? (this.F = t.F.slice(0), this.A = t.A.slice(0), this.l = t.l) : this.reset()
	},
	pbkdf2: function(t, e, n, r, i) {
		if(n = n || 10000, 0 > r || 0 > n)
			throw new exception.invalid('invalid params to pbkdf2');
		'string' == typeof t && (t = utf8String.toBits(t)),
				'string' == typeof e && (e = utf8String.toBits(e)),
				t = new (i = i || hash.hmac)(t);
		var a,
				s,
				u,
				c,
				l = [
				],
				d = bitArray;
		for(c = 1; 32 * l.length < (r || 1); c++) {
			for(i = a = t.encrypt(d.concat(e, [
					c
			])), s = 1; s < n; s++)
				for(a = t.encrypt(a), u = 0; u < a.length; u++)
					i[u] ^= a[u];
			l = l.concat(i)
		}
		return r && (l = d.clamp(l, r)),
				l
	},
	hmac: function(t, e) {
		this.W = e = e || hash.sha256;
		var n,
				r = [
					[],
					[
					]
				],
				i = e.prototype.blockSize / 32;
		for(this.w = [
				new e,
				new e
		], t.length > i && (t = e.hash(t)), n = 0; n < i; n++)
			r[0][n] = 909522486 ^ t[n],
					r[1][n] = 1549556828 ^ t[n];
		this.w[0].update(r[0]),
				this.w[1].update(r[1]),
				this.R = new e(this.w[0])
	},
	encrypt: function(l, n) {
		var u = new cipher.aes(l),
				t = random.randomWords(4),
				e = gcm.encrypt(u, utf8String.toBits(n), t);
		return {
			iv: t,
			tag: bitArray.bitSlice(e, bitArray.bitLength(e) - 128),
			ciphertext: bitArray.clamp(e, bitArray.bitLength(e) - 128)
		}
	}
};

var gcm = {
	name: 'gcm',
	encrypt: function(t, e, n, r, i) {
		var a = e.slice(0);
		return e = bitArray,
				r = r || [
				],
				t = gcm.C(!0, t, a, r, n, i || 128),
				e.concat(t.data, t.tag)
	},
	decrypt: function(t, e, n, r, i) {
		var a = e.slice(0),
				s = bitArray,
				u = s.bitLength(a);
		if(i = i || 128, r = r || [
		], i <= u ? (e = s.bitSlice(a, u - i), a = s.bitSlice(a, 0, u - i)) : (e = a, a = [
		]), t = gcm.C(!1, t, a, r, n, i), !s.equal(t.tag, e))
			throw new exception.corrupt('gcm: tag doesn\'t match');
		return t.data
	},
	ka: function(t, e) {
		var n,
				r,
				i,
				a,
				s,
				u = bitArray.i;
		for(i = [
			0,
			0,
			0,
			0
		], a = e.slice(0), n = 0; 128 > n; n++) {
			for((r = 0 != (t[Math.floor(n / 32)] & 1 << 31 - n % 32)) && (i = u(i, a)), s = 0 != (1 & a[3]), r = 3; 0 < r; r--)
				a[r] = a[r] >>> 1 | (1 & a[r - 1]) << 31;
			a[0] >>>= 1,
					s && (a[0] ^= -520093696)
		}
		return i
	},
	j: function(t, e, n) {
		var r,
				i = n.length;
		for(e = e.slice(0), r = 0; r < i; r += 4)
			e[0] ^= 4294967295 & n[r],
					e[1] ^= 4294967295 & n[r + 1],
					e[2] ^= 4294967295 & n[r + 2],
					e[3] ^= 4294967295 & n[r + 3],
					e = gcm.ka(e, t);
		return e
	},
	C: function(t, e, n, r, i, a) {
		var s,
				u,
				c,
				l,
				d,
				h,
				f,
				p,
				_ = bitArray;
		for(h = n.length, f = _.bitLength(n), p = _.bitLength(r), u = _.bitLength(i), s = e.encrypt([0,
				0,
				0,
				0]), 96 === u ? (i = i.slice(0), i = _.concat(i, [
				1
		]))  : (i = gcm.j(s, [
				0,
				0,
				0,
				0
		], i), i = gcm.j(s, i, [
				0,
				0,
				Math.floor(u / 4294967296),
				4294967295 & u
		])), u = gcm.j(s, [
				0,
				0,
				0,
				0
		], r), d = i.slice(0), r = u.slice(0), t || (r = gcm.j(s, u, n)), l = 0; l < h; l += 4)
			d[3]++,
					c = e.encrypt(d),
					n[l] ^= c[0],
					n[l + 1] ^= c[1],
					n[l + 2] ^= c[2],
					n[l + 3] ^= c[3];
		return n = _.clamp(n, f),
				t && (r = gcm.j(s, u, n)),
				t = [
					Math.floor(p / 4294967296),
					4294967295 & p,
					Math.floor(f / 4294967296),
					4294967295 & f
				],
				r = gcm.j(s, r, t),
				c = e.encrypt(i),
				r[0] ^= c[0],
				r[1] ^= c[1],
				r[2] ^= c[2],
				r[3] ^= c[3],
				{
					tag: _.bitSlice(r, 0, a),
					data: n
				}
	}
};
hash.hmac.prototype.encrypt = hash.hmac.prototype.mac = function(t) {
	if(this.aa)
		throw new exception.invalid('encrypt on already updated hmac called!');
	return this.update(t),
			this.digest(t)
};
hash.hmac.prototype.reset = function() {
	this.R = new this.W(this.w[0]),
			this.aa = !1
};
hash.hmac.prototype.update = function(t) {
	this.aa = !0,
			this.R.update(t)
};
hash.hmac.prototype.digest = function() {
	var t = this.R.finalize();
	t = new this.W(this.w[1]).update(t).finalize();
	return this.reset(),
			t
};

var bitArray = {
	bitSlice: function(t, e, n) {
		return t = bitArray.$(t.slice(e / 32), 32 - (31 & e)).slice(1),
				void 0 === n ? t : bitArray.clamp(t, n - e)
	},
	extract: function(t, e, n) {
		var r = Math.floor(-e - n & 31);
		return (-32 & (e + n - 1 ^ e) ? t[e / 32 | 0] << 32 - r ^ t[e / 32 + 1 | 0] >>> r : t[e / 32 | 0] >>> r) & (1 << n) - 1
	},
	concat: function(t, e) {
		if(0 === t.length || 0 === e.length)
			return t.concat(e);
		var n = t[t.length - 1],
				r = bitArray.getPartial(n);
		return 32 === r ? t.concat(e) : bitArray.$(e, r, 0 | n, t.slice(0, t.length - 1))
	},
	bitLength: function(t) {
		var e = t.length;
		return 0 === e ? 0 : 32 * (e - 1) + bitArray.getPartial(t[e - 1])
	},
	clamp: function(t, e) {
		if(32 * t.length < e)
			return t;
		var n = (t = t.slice(0, Math.ceil(e / 32))).length;
		return e &= 31,
				0 < n && e && (t[n - 1] = bitArray.partial(e, t[n - 1] & 2147483648 >> e - 1, 1)),
				t
	},
	partial: function(t, e, n) {
		return 32 === t ? e : (n ? 0 | e : e << 32 - t) + 1099511627776 * t
	},
	getPartial: function(t) {
		return Math.round(t / 1099511627776) || 32
	},
	equal: function(t, e) {
		if(bitArray.bitLength(t) !== bitArray.bitLength(e))
			return !1;
		var n,
				r = 0;
		for(n = 0; n < t.length; n++)
			r |= t[n] ^ e[n];
		return 0 === r
	},
	$: function(t, e, n, r) {
		var i;
		for(i = 0, void 0 === r && (r = [
		]); 32 <= e; e -= 32)
			r.push(n),
					n = 0;
		if(0 === e)
			return r.concat(t);
		for(i = 0; i < t.length; i++)
			r.push(n | t[i] >>> e),
					n = t[i] << 32 - e;
		return i = t.length ? t[t.length - 1] : 0,
				t = bitArray.getPartial(i),
				r.push(bitArray.partial(e + t & 31, 32 < e + t ? n : r.pop(), 1)),
				r
	},
	i: function(t, e) {
		return [t[0] ^ e[0],
			t[1] ^ e[1],
			t[2] ^ e[2],
			t[3] ^ e[3]]
	},
	byteswapM: function(t) {
		var e,
				n;
		for(e = 0; e < t.length; ++e)
			n = t[e],
					t[e] = n >>> 24 | n >>> 8 & 65280 | (65280 & n) << 8 | n << 24;
		return t
	}
};

var exception = {
	corrupt: function(t) {
		this.toString = function() {
			return 'CORRUPT: ' + this.message
		},
				this.message = t
	},
	invalid: function(t) {
		this.toString = function() {
			return 'INVALID: ' + this.message
		},
				this.message = t
	},
	bug: function(t) {
		this.toString = function() {
			return 'BUG: ' + this.message
		},
				this.message = t
	},
	notReady: function(t) {
		this.toString = function() {
			return 'NOT READY: ' + this.message
		},
				this.message = t
	}
};

var base64 = {
	B: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
	fromBits: function(t, e, n) {
		var r = '',
				i = 0,
				a = base64.B,
				s = 0,
				u = bitArray.bitLength(t);
		for(n && (a = a.substr(0, 62) + '-_'), n = 0; 6 * r.length < u; )
			r += a.charAt((s ^ t[n] >>> i) >>> 26),
					6 > i ? (s = t[n] << 6 - i, i += 26, n++) : (s <<= 6, i -= 6);
		for(; 3 & r.length && !e; )
			r += '=';
		return r
	},
	toBits: function(t, e) {
		t = t.replace(/\s|=/g, '');
		var n,
				r,
				i = [
				],
				a = 0,
				s = base64.B,
				u = 0;
		for(e && (s = s.substr(0, 62) + '-_'), n = 0; n < t.length; n++) {
			if(0 > (r = s.indexOf(t.charAt(n))))
				throw new exception.invalid('this isn\'t base64!');
			26 < a ? (a -= 26, i.push(u ^ r >>> a), u = r << 32 - a) : u ^= r << 32 - (a += 6)
		}
		return 56 & a && i.push(bitArray.partial(56 & a, u, 1)),
				i
	}
};

hash.sha256.hash = function(t) {
	return (new hash.sha256).update(t).finalize()
};
hash.sha256.prototype = {
	blockSize: 512,
	reset: function() {
		return this.F = this.Y.slice(0),
				this.A = [
				],
				this.l = 0,
				this
	},
	update: function(t) {
		'string' == typeof t && (t = utf8String.toBits(t));
		var e,
				n = this.A = bitArray.concat(this.A, t);
		if(e = this.l, 9007199254740991 < (t = this.l = e + bitArray.bitLength(t)))
			throw new exception.invalid('Cannot hash more than 2^53 - 1 bits');
		if('undefined' != typeof Uint32Array) {
			var r = new Uint32Array(n),
					i = 0;
			for(e = 512 + e - (512 + e & 511); e <= t; e += 512)
				a(this, r.subarray(16 * i, 16 * (i + 1))),
						i += 1;
			n.splice(0, 16 * i)
		} else
			for(e = 512 + e - (512 + e & 511); e <= t; e += 512)
				a(this, n.splice(0, 16));
		return this
	},
	finalize: function() {
		var t,
				e = this.A,
				n = this.F;
		for(t = (e = bitArray.concat(e, [
				bitArray.partial(1, 1)
		])).length + 2; 15 & t; t++)
			e.push(0);
		for(e.push(Math.floor(this.l / 4294967296)), e.push(0 | this.l); e.length; )
			a(this, e.splice(0, 16));
		return this.reset(),
				n
	},
	Y: [
	],
	b: [
	],
	O: function() {
		function t(t) {
			return 4294967296 * (t - Math.floor(t)) | 0
		}
		for(var e, n, r = 0, o = 2; 64 > r; o++) {
			for(n = !0, e = 2; e * e <= o; e++)
				if(0 == o % e) {
					n = !1;
					break
				}
			n && (8 > r && (this.Y[r] = t(Math.pow(o, 0.5))), this.b[r] = t(Math.pow(o, 1 / 3)), r++)
		}
	}
};

var utf8String = {
	fromBits: function(t) {
		var e,
				n,
				r = '',
				i = bitArray.bitLength(t);
		for(e = 0; e < i / 8; e++)
			0 == (3 & e) && (n = t[e / 4]),
					r += String.fromCharCode(n >>> 8 >>> 8 >>> 8),
					n <<= 8;
		return decodeURIComponent(escape(r))
	},
	toBits: function(t) {
		t = unescape(encodeURIComponent(t));
		var e,
				n = [
				],
				r = 0;
		for(e = 0; e < t.length; e++)
			r = r << 8 | t.charCodeAt(e),
					3 == (3 & e) && (n.push(r), r = 0);
		return 3 & e && n.push(bitArray.partial(8 * (3 & e), r)),
				n
	}
};

var cipher = {
	aes: function(t) {
		this.s[0][0][0] || this.O();
		var e,
				n,
				r,
				i,
				a = this.s[0][4],
				s = this.s[1],
				u = 1;
		if(4 !== (e = t.length) && 6 !== e && 8 !== e)
			throw new exception.invalid('invalid aes key size');
		for(this.b = [
				r = t.slice(0),
				i = [
				]
		], t = e; t < 4 * e + 28; t++)
			n = r[t - 1],
					(0 == t % e || 8 === e && 4 == t % e) && (n = a[n >>> 24] << 24 ^ a[n >> 16 & 255] << 16 ^ a[n >> 8 & 255] << 8 ^ a[255 & n], 0 == t % e && (n = n << 8 ^ n >>> 24 ^ u << 24, u = u << 1 ^ 283 * (u >> 7))),
					r[t] = r[t - e] ^ n;
		for(e = 0; t; e++, t--)
			n = r[3 & e ? t : t - 4],
					i[e] = 4 >= t || 4 > e ? n : s[0][a[n >>> 24]] ^ s[1][a[n >> 16 & 255]] ^ s[2][a[n >> 8 & 255]] ^ s[3][a[255 & n]]
	}
};
cipher.aes.prototype = {
	encrypt: function(t) {
		return i(this, t, 0)
	},
	decrypt: function(t) {
		return i(this, t, 1)
	},
	s: [
		[[],
			[
			],
			[
			],
			[
			],
			[
			]],
		[
			[],
			[
			],
			[
			],
			[
			],
			[
			]
		]
	],
	O: function() {
		var t,
				e,
				n,
				r,
				o,
				i,
				a,
				s = this.s[0],
				u = this.s[1],
				c = s[4],
				l = u[4],
				d = [
				],
				h = [
				];
		for(t = 0; 256 > t; t++)
			h[(d[t] = t << 1 ^ 283 * (t >> 7)) ^ t] = t;
		for(e = n = 0; !c[e]; e ^= r || 1, n = h[n] || 1)
			for(i = (i = n ^ n << 1 ^ n << 2 ^ n << 3 ^ n << 4) >> 8 ^ 255 & i ^ 99, c[e] = i, l[i] = e, a = 16843009 * (o = d[t = d[r = d[e]]]) ^ 65537 * t ^ 257 * r ^ 16843008 * e, o = 257 * d[i] ^ 16843008 * i, t = 0; 4 > t; t++)
				s[t][e] = o = o << 24 ^ o >>> 8,
						u[t][i] = a = a << 24 ^ a >>> 8;
		for(t = 0; 5 > t; t++)
			s[t] = s[t].slice(0),
					u[t] = u[t].slice(0)
	}
};

var random = {
	c: [new hash.sha256],
	m: [
		0
	],
	P: 0,
	H: {
	},
	N: 0,
	U: {
	},
	Z: 0,
	f: 0, o: 0, ha: 0,
	b: [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	],
	h: [
		0,
		0,
		0,
		0
	],
	L: void 0,
	M: 6,
	D: !1,
	K: {
		progress: {
		},
		seeded: {
		}
	},
	u: 0,
	ga: 0,
	I: 1,
	J: 2,
	ca: 65536,
	T: [
		0,
		48,
		64,
		96,
		128,
		192,
		256,
		384,
		512,
		768,
		1024
	],
	da: 30000,
	ba: 80,
	randomWords: function(t, e) {
		var n,
				r = [],
				i = [
				];

		var a,
				s = 0;
		for(this.Z = r[0] = (new Date).valueOf() + this.da, a = 0; 16 > a; a++)
			r.push(4294967296 * Math.random() | 0);
		for(a = 0; a < this.c.length && (r = r.concat(this.c[a].finalize()), s += this.m[a], this.m[a] = 0, n || !(this.P & 1 << a)); a++)
			;
		for(this.P >= 1 << this.c.length && (this.c.push(new hash.sha256), this.m.push(0)), this.f -= s, s > this.o && (this.o = s), this.P++, this.b = hash.sha256.hash(this.b.concat(r)), this.L = new cipher.aes(this.b), n = 0; 4 > n && (this.h[n] = this.h[n] + 1 | 0, !this.h[n]); n++)
			;

		for(n = 0; n < t; n += 4)
			0 == (n + 1) % this.ca && c(this),
					r = l(this),
					i.push(r[0], r[1], r[2], r[3]);
		return c(this),
				i.slice(0, t)
	}
};

function a(t, e) {
	var n,
			r,
			o,
			i = t.F,
			a = t.b,
			s = i[0],
			u = i[1],
			c = i[2],
			l = i[3],
			d = i[4],
			h = i[5],
			f = i[6],
			p = i[7];
	for(n = 0; 64 > n; n++)
		16 > n ? r = e[n] : (r = e[n + 1 & 15], o = e[n + 14 & 15], r = e[15 & n] = (r >>> 7 ^ r >>> 18 ^ r >>> 3 ^ r << 25 ^ r << 14) + (o >>> 17 ^ o >>> 19 ^ o >>> 10 ^ o << 15 ^ o << 13) + e[15 & n] + e[n + 9 & 15] | 0),
				r = r + p + (d >>> 6 ^ d >>> 11 ^ d >>> 25 ^ d << 26 ^ d << 21 ^ d << 7) + (f ^ d & (h ^ f)) + a[n],
				p = f,
				f = h,
				h = d,
				d = l + r | 0,
				l = c,
				c = u,
				s = r + ((u = s) & c ^ l & (u ^ c)) + (u >>> 2 ^ u >>> 13 ^ u >>> 22 ^ u << 30 ^ u << 19 ^ u << 10) | 0;
	i[0] = i[0] + s | 0,
			i[1] = i[1] + u | 0,
			i[2] = i[2] + c | 0,
			i[3] = i[3] + l | 0,
			i[4] = i[4] + d | 0,
			i[5] = i[5] + h | 0,
			i[6] = i[6] + f | 0,
			i[7] = i[7] + p | 0
}

function c(t) {
	t.b = l(t).concat(l(t)),
			t.L = new cipher.aes(t.b)
}
function l(t) {
	for(var e = 0; 4 > e && (t.h[e] = t.h[e] + 1 | 0, !t.h[e]); e++)
		;
	return t.L.encrypt(t.h)
}
function i(t, e, n) {
	if(4 !== e.length)
		throw new exception.invalid('invalid aes block size');
	var r = t.b[n],
			i = e[0] ^ r[0],
			a = e[n ? 3 : 1] ^ r[1],
			s = e[2] ^ r[2];
	e = e[n ? 1 : 3] ^ r[3];
	var u,
			c,
			l,
			d,
			h = r.length / 4 - 2,
			f = 4,
			p = [
				0,
				0,
				0,
				0
			];
	t = (u = t.s[n]) [0];
	var _ = u[1],
			m = u[2],
			y = u[3],
			v = u[4];
	for(d = 0; d < h; d++)
		u = t[i >>> 24] ^ _[a >> 16 & 255] ^ m[s >> 8 & 255] ^ y[255 & e] ^ r[f],
				c = t[a >>> 24] ^ _[s >> 16 & 255] ^ m[e >> 8 & 255] ^ y[255 & i] ^ r[f + 1],
				l = t[s >>> 24] ^ _[e >> 16 & 255] ^ m[i >> 8 & 255] ^ y[255 & a] ^ r[f + 2],
				e = t[e >>> 24] ^ _[i >> 16 & 255] ^ m[a >> 8 & 255] ^ y[255 & s] ^ r[f + 3],
				f += 4,
				i = u,
				a = c,
				s = l;
	for(d = 0; 4 > d; d++)
		p[n ? 3 & -d : d] = v[i >>> 24] << 24 ^ v[a >> 16 & 255] << 16 ^ v[s >> 8 & 255] << 8 ^ v[255 & e] ^ r[f++],
				u = i,
				i = a,
				a = s,
				s = e,
				e = u;
	return p
}