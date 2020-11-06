'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const ioBLib = require('@strathcole/iob-lib').ioBLib;
const plenticore = require('./lib/plenticore');
const weather = require('./lib/weather');

const packageJson = require('./package.json');
const adapterName = packageJson.name.split('.').pop();
const adapterVersion = packageJson.version;

let adapter;
var debugRequests;

let weatherTimer = null;

let reloginTimer = null;

const patchVersion = 'r227';

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: 'plenticore'
	});

	adapter = new utils.Adapter(options);

	ioBLib.init(adapter);
	plenticore.init(adapter, utils, weather);

	adapter.on('unload', function(callback) {
		if(weatherTimer) {
			clearInterval(weatherTimer);
		}
		if(reloginTimer) {
			clearTimeout(reloginTimer);
		}
		weather.unload();
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

			if(state !== null) {
				state = state.val;
			}
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
			adapter.log.info('[START] Starting adapter ' + adapterName + ' v' + adapterVersion + '' + patchVersion);

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
					adapter.log.error('Astro functions not available as system\'s longitude and latitude were not found. Please check ioBroker global system config.');
					adapter.terminate && adapter.terminate() || process.exit();
					return;
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

				if(adapter.config.panel_tilt_2) {
					adapter.config.panel_tilt_2 = parseInt(adapter.config.panel_tilt_2);
					adapter.log.debug('2nd Panel tilt: ' + adapter.config.panel_tilt_2 + '°');
				}
				if(adapter.config.panel_dir_2) {
					adapter.config.panel_dir_2 = parseInt(adapter.config.panel_dir_2);
					adapter.log.debug('2nd Panel direction: ' + adapter.config.panel_dir_2 + '°');
				}
				if(adapter.config.panel_efficiency_2) {
					if(adapter.config.panel_efficiency_2.indexOf(',') > -1) {
						adapter.config.panel_efficiency_2 = adapter.config.panel_efficiency_2.replace(',', '.');
					}
					adapter.config.panel_efficiency_2 = parseFloat(adapter.config.panel_efficiency_2);
					adapter.log.debug('2nd Panel efficiency: ' + adapter.config.panel_efficiency_2 + '%');
				}
				if(adapter.config.panel_surface_2) {
					if(adapter.config.panel_surface_2.indexOf(',') > -1) {
						adapter.config.panel_surface_2 = adapter.config.panel_surface_2.replace(',', '.');
					}
					adapter.config.panel_surface_2 = parseFloat(adapter.config.panel_surface_2);
					adapter.log.debug('2nd Panel surface: ' + adapter.config.panel_surface_2 + 'm²');
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
					} else {
						runSetup = false;
						//adapter.log.warn('Enabling experimental support for Kachelmannwetter.');
						weather.init(adapter, function(err, res) {
							if(err) {
								adapter.log.warn('Kachelmannwetter lib failed to init.');
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

	plenticore.login(function(error) {
		if(error) {
			adapter.log.warn('Failed starting plenticore adapter (login sequence failed). Trying again in 30 seconds.');
			if(reloginTimer) {
				clearTimeout(reloginTimer);
			}
			reloginTimer = setTimeout(function() {
				reloginTimer = null;
				main();
			}, 30000);
			return;
		}
		adapter.subscribeStates('*');

		if(adapter.config.enable_forecast) {
			adapter.log.info('Enabling forecast data.');
			plenticore.storeSunPanelData();
		} else {
			adapter.log.info('Not enabling forecast data.');
		}

		plenticore.calcPowerAverages();

		if(adapter.config.enable_forecast) {
			adapter.log.info('Enabling MinSoC forecast data.');
			weatherTimer = setInterval(function() {
				plenticore.calcMinSoC();
			}, 15 * 60 * 1000); // each 15 min

			let needed = 0;
			for(let weatherAdapter in plenticore.weatherAdapters) {
				needed++;
			}
			for(let weatherAdapter in plenticore.weatherAdapters) {
				adapter.getObjectView('system', 'instance', {
					startkey: 'system.adapter.' + weatherAdapter,
					endkey: 'system.adapter.' + weatherAdapter + '.\u9999'
				}, function(err, doc) {
					if(doc && doc.rows && doc.rows.length) {
						let adapter_id = doc.rows[0].id;
						adapter_id = adapter_id.replace(/^system\.adapter\./, '');
						adapter.log.info('Using ' + adapter_id + ' in weather forcast.');
						plenticore.weatherAdapters[weatherAdapter]['instance'] = adapter_id;
						adapter.subscribeForeignStates(adapter_id + '.*');
					}
					needed--;
					if(needed < 1) {
						plenticore.calcMinSoC();
					} else {
						adapter.log.info('Still ' + needed + ' adapters to check.');
					}
			   });
			}
			if(needed < 1) {
				plenticore.calcMinSoC();
			} else {
				adapter.log.info('Still ' + needed + ' adapters to check.');
			}
		} else {
			adapter.log.info('Not enabling MinSoC forecast data.');
		}
	});
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
	let chkId;
	for(let weatherAdapter in plenticore.weatherAdapters) {
		chkId = plenticore.weatherAdapters[weatherAdapter]['fc_id'];
		chkId = chkId.replace('%%D%%', '1');
		chkId = chkId.replace('%%H%%', plenticore.weatherAdapters[weatherAdapter]['fc_min']);

		if(id === chkId + '.' + plenticore.weatherAdapters[weatherAdapter]['sky']
			|| (plenticore.weatherAdapters[weatherAdapter]['visibility'] !== null && id === chkId + '.' + plenticore.weatherAdapters[weatherAdapter]['visibility'])) {
			plenticore.calcMinSoC();
		}
	}
}

function processStateChange(id, value) {
	adapter.log.debug('StateChange: ' + JSON.stringify([id, value]));

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

