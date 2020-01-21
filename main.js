'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const ioBLib = require('@strathcole/iob-lib').ioBLib;
const plenticore = require('./lib/plenticore');

const schedule = require('node-schedule');
const adapterName = require('./package.json').name.split('.').pop();

let adapter;
var debugRequests;

let sunSchedule;
let dailySchedule;

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: 'plenticore'
	});

	adapter = new utils.Adapter(options);

	ioBLib.init(adapter);
	plenticore.init(adapter, utils);

	adapter.on('unload', function(callback) {
		if(sunSchedule) {
			sunSchedule.cancel();
		}
		if(dailySchedule) {
			dailySchedule.cancel();
		}
		plenticore.unload(function() {
			callback();
		});
	});

	adapter.on('stateChange', function(id, state) {
		// Warning, state can be null if it was deleted
		try {
			adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

			if(!id) {
				return;
			}
			
			if(state && id.substr(0, adapter.namespace.length + 1) !== adapter.namespace + '.') {
				processStateChangeForeign(id, state);
				return;
			}
			id = id.substring(adapter.namespace.length + 1); // remove instance name and id
			
			if(state && state.ack) {
				processStateChangeAck(id, state);
				return;
			}
			
			state = state.val;
			adapter.log.debug("id=" + id);
			
			if('undefined' !== typeof state && null !== state) {
				processStateChange(id, state);
			}
		} catch(e) {
			adapter.log.info("Error processing stateChange: " + e);
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
				let runSetup = true;

				if (obj && obj.native && obj.native.secret) {
					//noinspection JSUnresolvedVariable
					adapter.config.password = ioBLib.decrypt(obj.native.secret, adapter.config.password);
				} else {
					//noinspection JSUnresolvedVariable
					adapter.config.password = ioBLib.decrypt('Zgfr56gFe87jJOM', adapter.config.password);
				}

				if(obj && obj.common) {
					adapter.config.iob_lon = obj.common.longitude;
					adapter.config.iob_lat = obj.common.latitude;
				}

				if(!adapter.config.iob_lon || !adapter.config.iob_lat) {
					adapter.log.warn('Astro functions not available as system\'s longitude and latitude were not found. Please check ioBroker global system config.');
				}

				if(adapter.config.panel_tilt) {
					adapter.config.panel_tilt = parseInt(adapter.config.panel_tilt);
					adapter.log.debug('Panel tilt: ' + adapter.config.panel_tilt + '°');
				}
				if(adapter.config.panel_dir) {
					adapter.config.panel_dir = parseInt(adapter.config.panel_dir);
					adapter.log.debug('Panel direction: ' + adapter.config.panel_dir + '°');
				}
				if(adapter.config.panel_efficiency) {
					if(adapter.config.panel_efficiency.indexOf(',') > -1) {
						adapter.config.panel_efficiency = adapter.config.panel_efficiency.replace(',', '.');
					}
					adapter.config.panel_efficiency = parseFloat(adapter.config.panel_efficiency);
					adapter.log.debug('Panel efficiency: ' + adapter.config.panel_efficiency + '%');
				}
				if(adapter.config.panel_surface) {
					if(adapter.config.panel_surface.indexOf(',') > -1) {
						adapter.config.panel_surface = adapter.config.panel_surface.replace(',', '.');
					}
					adapter.config.panel_surface = parseFloat(adapter.config.panel_surface);
					adapter.log.debug('Panel surface: ' + adapter.config.panel_surface + 'm²');
				}


				if(adapter.config.enable_minsoc && !adapter.config.battery_capacity) {
					adapter.log.warn('Could not enable dynamic MinSoC setting because no battery capacity was entered.');
					adapter.config.enable_minsoc = false;
				}

				if(adapter.config.enable_forecast) {
					if(!adapter.config.iob_lon || !adapter.config.iob_lat) {
						adapter.log.warn('Could not enable forecast because the system\'s longitude and latitude were not found. Please check system config.');
						adapter.config.enable_forecast = false;
					} else if(!adapter.config.panel_tilt && adapter.config.panel_tilt !== '0') {
						adapter.log.warn('Could not enable forecast because the panel tilt was not set.');
						adapter.config.enable_forecast = false;
					} else if(!adapter.config.panel_dir && adapter.config.panel_dir !== '0') {
						adapter.log.warn('Could not enable forecast because the panel orientation (azimuth) was not set.');
						adapter.config.enable_forecast = false;
					} else if(!adapter.config.wfc_instance) {
						adapter.log.warn('Could not enable forecast because no weather forecast instance was selected.');
						adapter.config.enable_forecast = false;
					} else {
						runSetup = false;
						adapter.getForeignObject(adapter.config.wfc_instance, function(err, obj) {
							if(err) {
								adapter.log.warn('Could not enable forecast because the selected weather forecast instance was not found.');
								adapter.config.enable_forecast = false;
							}

							plenticore.setup(function() {
								main();
							});
						});
					}
				}
				
				if(runSetup === true) {
					plenticore.setup(function() {
						main();
					});
				} 
			});
		}
	});

	return adapter;
}


function main() {
	
	adapter.log.debug('[START] Started Adapter with: ' + adapter.config.ipaddress);

	plenticore.login();

	adapter.subscribeStates('*');
	
	if(adapter.config.enable_forecast) {
		adapter.log.info('Enabling forecast data.');
		sunSchedule = schedule.scheduleJob('* * * * *', function(){
			plenticore.storeSunPanelData();
		});
		plenticore.storeSunPanelData();
	} else {
		adapter.log.info('Not enabling forecast data.');
	}
	
	dailySchedule = schedule.scheduleJob('0 0 * * *', function() {
		plenticore.calcPowerAverages(true);
	});
	
	plenticore.calcPowerAverages(false);
	
	if(adapter.config.wfc_instance && adapter.config.enable_forecast) {
		adapter.log.info('Enabling MinSoC forecast data.');
		adapter.subscribeForeignStates(adapter.config.wfc_instance + '.*');
		plenticore.calcMinSoC();
	} else {
		adapter.log.info('Not enabling MinSoC forecast data.');
	}
}

function processStateChangeAck(id, state) {
	if(id === 'devices.local.Home_P') {
		plenticore.updatePowerConsumption(state);
	} else if(id === 'devices.local.pv1.P' || id === 'devices.local.pv2.P' || id === 'devices.local.pv3.P') {
		plenticore.updatePowerProduction(state);
	} else if(id === 'devices.local.battery.P') {
		plenticore.updateBatteryCharging(state);
	}
}

function processStateChangeForeign(id, state) {
	if(adapter.config.wfc_instance && (
			id === adapter.config.wfc_instance + '.hourly.0.cloudCover'
			|| id === adapter.config.wfc_instance + '.hourly.0.visibility'
			|| id === adapter.config.wfc_instance + '.forecastHourly.0h.sky'
			|| id === adapter.config.wfc_instance + '.forecastHourly.0h.visibility')) {
		plenticore.calcMinSoC();
	}
}

function processStateChange(id, value) {
	adapter.log.info('StateChange: ' + JSON.stringify([id, value]));
	
	plenticore.changeSetting(id, value);
	return;
}


// If started as allInOne/compact mode => return function to create instance
if(module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
} // endElse

