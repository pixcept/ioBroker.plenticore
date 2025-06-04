'use strict';

const request = require('request');

let headers = {
    'Accept': '*/*',
    //'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'de-DE,de;q=0.8,en-US;q=0.5,en;q=0.3',
    'Cache-Control': 'no-cache',
    'Connection': 'close',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Origin': 'https://kachelmannwetter.com',
    'Pragma': 'no-cache',
    'Referer': 'https://kachelmannwetter.com/de',
    'TE': 'Trailers',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0',
    'X-Requested-With': 'XMLHttpRequest'
};

let kmJar = request.jar();
let baseRequest = request.defaults({
	headers: headers,
	jar: kmJar
});

let city_url = 'https://kachelmannwetter.com/de/ajax/locatingfc';
let city_id;
let city_name;
let forecast_web_url;

let metno_url = 'https://api.met.no/weatherapi/locationforecast/2.0/';

let forecastHours = {
	'primary': {},
	'secondary': {},
	'metno': {}
};

let currentForecastHours = null;

let adapter;
let pollTimer = null;

function initForecastObject() {
	forecastHours = {
		'primary': {},
		'secondary': {},
		'metno': {}
	};

	let idx;
	for(let i = 0; i < 50; i++) {
		idx = i + 'h';
		for(let h of ['primary', 'secondary', 'metno']) {
			if(i > 35 && h === 'primary') {
				continue;
			} else if(i > 47 && h === 'secondary') {
				continue;
			}
			forecastHours[h][idx] = {
	//			sun: 0,
				clouds: null,
				time: null,
				rain: null,
				rainPeriod: null,
				rainChance: null,
				visibility: null,
	//			suntime: 0,
				cloud_details: {
					low: 0,
					medium: 0,
					high: 0
				}
			};
		}
	}
}

function init(adapterInstance, callback) {
	adapter = adapterInstance;

	initForecastObject();

	getMetnoData(function() {
		getCityId(callback);
	});
}

function unload() {
	if(pollTimer) {
		clearTimeout(pollTimer);
	}
}

function getForecastUrl() {
	if(forecast_web_url) {
		return forecast_web_url;
	} else {
		return null;
	}
}

function getCity() {
	if(city_name) {
		return city_name;
	} else {
		return null;
	}
}

function getHourForTime(time) {
	if(!time) {
		return null;
	}

	let timediff = time - (new Date()).getTime();
	let hours = Math.ceil((timediff + (30 * 60 * 1000)) / (60 * 60 * 1000)) - 1;
	if(hours < 0) {
		hours = 0;
	}

	return hours;
}

function getForecastHour(hour, type) {
	if(currentForecastHours === null) {
		return null;
	}

	if(!type || (type !== 'secondary' && type !== 'metno')) {
		type = 'primary';
	}
	hour += 'h';
	if(currentForecastHours[type][hour]) {
		return currentForecastHours[type][hour];
	} else {
		return null;
	}
}

function getForecastFor(time, force, type) {
	if(currentForecastHours === null) {
		return null;
	}

	if(!time) {
		return null;
	}
	if(!type || (type !== 'secondary' && type !== 'metno')) {
		type = 'primary';
	}

	for(let i in currentForecastHours[type]) {
		if(currentForecastHours[type][i].time && currentForecastHours[type][i].time <= time + (20 * 60 * 1000) && currentForecastHours[type][i].time >= time - (45 * 60 * 1000)) {
			return currentForecastHours[type][i];
		}
	}

	if(force) {
		return currentForecastHours[type]['0h'];
	}

	return null;
}

/*function getSunData(body) {
    let match = body.match(/var\s*hccompact_data_sun\s*=\s*\[[\s\S]*?data:\s*(\[[\s\S]*?\]\s*\])\s*,/);
    if(match && match.length > 0) {
        try {
            let json = JSON.parse(match[1]);
            let el;
            let hindex;

            for(let i = 0; i < json.length; i++) {
                el = json[i];
				hindex = getHourForTime(el[0]);
				if(null !== hindex) {
					hindex += 'h';
					if(!currentForecastHours[hindex]) {
						continue;
					}
					currentForecastHours[hindex]['sun'] = el[1];
					currentForecastHours[hindex]['suntime'] = el[0];
				}
            }
			return true;
        } catch(e) {
			adapter.log.warn('Processing sun data failed with exception: ' + match[1]);
            return false;
        }
    } else {
		adapter.log.warn('Processing sun data failed: ' + body);
		return false;
	}
}*/

function getCloudData(body, second) {
    let match = body.match(/var\s*hccompact_data_clouds\s*=\s*\[[\s\S]*?data:\s*(\[[\s\S]*?\]\s*\])\s*\}\s*/);
    if(match && match.length > 0) {
        try {
            let json = JSON.parse(match[1]);
            let el;
            let time;
            let value;
            let pos;

            let idx;

            let result = [];
            for(let i = 0; i < json.length; i++) {
                el = json[i];
                time = el[0];
                value = el[2];

                idx = result.findIndex(function(obj) {
                    return (obj.time && Math.abs(obj.time - time) < 10 * 60 * 1000);
                });

                pos = 'low';
                if(el[1] === 1) {
                    pos = 'medium';
                } else if(el[1] === 2) {
                    pos = 'high';
                }

                if(idx === -1) {
                    idx = result.push({
                        time: time,
                        low: 0,
                        medium: 0,
                        high: 0,
                        clouds: 0,
						rain: null,
						rainChance: null
                    }) - 1;
                }

				result[idx][pos] = value;
                result[idx]['clouds'] = result[idx]['low'] + result[idx]['medium'] + result[idx]['high'];
                if(result[idx]['clouds'] > 100) {
                    result[idx]['clouds'] = 100;
                }
            }

			let hindex;
			for(let i = 0; i < result.length; i++) {
				hindex = getHourForTime(result[i].time);
				if(null !== hindex) {
					hindex += 'h';
					let tindex = (second ? 'secondary' : 'primary');
					if(!forecastHours[tindex][hindex]) {
						continue;
					}
					forecastHours[tindex][hindex]['time'] = result[i].time;
					forecastHours[tindex][hindex]['clouds'] = result[i].clouds;
					forecastHours[tindex][hindex]['cloud_details'] = {
						low: result[i].low,
						medium: result[i].medium,
						high: result[i].high
					};
				}
			}
			return true;
        } catch(e) {
			adapter.log.warn('Processing cloud data failed with exception: ' + match[1]);
            return false;
        }
    } else {
		adapter.log.warn('Processing cloud data failed: ' + body);
		return false;
	}
}

function normalizeRainData(type) {
	if(!type || (type !== 'secondary' && type !== 'metno')) {
		type = 'primary';
	}
	adapter.log.debug('Normalize ' + type + ' rain data: ' + JSON.stringify(forecastHours[type]));

	// first loop
	let fc;
	let previdx = null;
	let prevfc = null;
	let tofill = [];
	for(let idx in forecastHours[type]) {
		fc = forecastHours[type][idx]['rain'];
		adapter.log.debug('FC for hour ' + idx + ': ' + JSON.stringify(fc));
		if(fc !== null) {
			tofill = [idx];
			prevfc = fc;
		} else if(prevfc !== null) {
			tofill.push(idx);
			// max 1 after prevfc
			let avgval = prevfc / tofill.length;
			for(let i = 0; i < tofill.length; i++) {
				forecastHours[type][tofill[i]]['rain'] = avgval;
			}
			adapter.log.debug('Using ' + avgval + ' (' + prevfc + ') rain value for ' + JSON.stringify(tofill));

			prevfc = null;
			tofill = [];
		} else {
			tofill.push(idx);
		}
	}

	if(prevfc !== null) {
		let avgval = prevfc / (tofill.length > 3 ? tofill.length : 3);
		for(let i = 0; i < tofill.length; i++) {
			forecastHours[type][tofill[i]]['rain'] = avgval;
		}
		adapter.log.debug('Using ' + avgval + ' (' + prevfc + ') rain value for ' + JSON.stringify(tofill));
	}

	// second loop
	for(let idx in forecastHours[type]) {
		fc = forecastHours[type][idx]['rain'];
		if(fc === null) {
			adapter.log.debug('Using zero rain value for ' + idx);
			forecastHours[type][idx]['rain'] = 0;
		}
	}
}

function getRainData(body, second) {
//OLD    let match = body.match(/var\s*hccompact_data_rain\s*=\s*\[[\s\S]*?name:\s*'(Regen|Schnee)'[\s\S]*?data:\s*(\[[\s\S]*?\]\s*\])\s*,\s*[\s\S]*?\}\s*\}\s*(?:,\s*\{[\s\S]*?name:\s*'(Regen|Schnee)'[\s\S]*?data:\s*(\[[\s0\S]*?\]\s*\])\s*,[\s\S]*?\s*\})\s*\]\s*;/);
         let match = body.match(/var\s*hccompact_data_rain\s*=\s*\[[\s\S]*?name:\s*'(Regen|Schnee)'[\s\S]*?data:\s*(\[[\s\S]*?\]\s*)\s*,\s*[\s\S]*?\}\s*\}\s*(?:,\s*\{[\s\S]*?name:\s*'(Regen|Schnee)'[\s\S]*?data:\s*(\[[\s0\S]*?\]\s*)\s*,[\s\S]*?\s*\})\s*\]\s*;/);

	if(match && match.length > 0) {

        try {
            let json_rain;
			let json_snow;

			if(match[1] === 'Regen') {
				 json_rain = JSON.parse(match[2]);
				 json_snow = JSON.parse(match[4]);
			} else {
				 json_rain = JSON.parse(match[4]);
				 json_snow = JSON.parse(match[2]);
			}
//adapter.log.warn('nnn 333333   json_rain ' + JSON.stringify(json_rain));
//adapter.log.warn('nnn 333333   json_snow ' + JSON.stringify(json_snow));

            let el;
            let time;
            let value;

            let idx;

            let result = [];
            for(let i = 0; i < json_rain.length; i++) {
                el = json_rain[i];
                time = el['x'];
                value = el['y'];
//adapter.log.warn('time: ' + time + '    value: ' + value);
				if(json_snow[i]) {
					el = json_snow[i];
					el[1] = el[1] * 1.5;
					value = value + el[1];
				}

                idx = result.findIndex(function(obj) {
                    return (obj.time && Math.abs(obj.time - time) < 10 * 60 * 1000);
                });

                if(idx === -1) {
                    idx = result.push({
                        time: time,
                        low: 0,
                        medium: 0,
                        high: 0,
                        clouds: 0,
						rain: null,
						rainChance: null
                    }) - 1;
                }
                result[idx]['rain'] = value;
            }

			let hindex;
			for(let i = 0; i < result.length; i++) {
				hindex = getHourForTime(result[i].time);
				if(null !== hindex) {
					hindex += 'h';
					let tindex = (second ? 'secondary' : 'primary');
					if(!forecastHours[tindex][hindex]) {
						continue;
					}
					if(!forecastHours[tindex][hindex]['time']) {
						forecastHours[tindex][hindex]['time'] = result[i].time;
					}
					forecastHours[tindex][hindex]['rain'] = result[i].rain;
				}
			}
			return true;
        } catch(e) {
			adapter.log.warn('Processing rain data failed with exception: ' + match[1]);
            return false;
        }
    } else {
		adapter.log.warn('Processing rain data failed: ' + body);
		return false;
	}
}

function getRainChanceData(body, second) {
    let match = body.match(/var\s*hccompact_data_rainpop\s*=\s*\[[\s\S]*?data:\s*(\[[\s\S]*?\]\s*\])\s*[,\}]/);
    if(match && match.length > 0) {
        try {
            let json_rain = JSON.parse(match[1]);

            let el;
            let time;
            let value;

            let idx;

            let result = [];
            for(let i = 0; i < json_rain.length; i++) {
                el = json_rain[i];
                time = el[0];
                value = el[1];

                idx = result.findIndex(function(obj) {
                    return (obj.time && Math.abs(obj.time - time) < 10 * 60 * 1000);
                });

                if(idx === -1) {
                    idx = result.push({
                        time: time,
                        low: 0,
                        medium: 0,
                        high: 0,
                        clouds: 0,
						rain: null,
						rainChance: null
                    }) - 1;
                }
                result[idx]['rainChance'] = value;
            }

			let hindex;
			for(let i = 0; i < result.length; i++) {
				hindex = getHourForTime(result[i].time);
				if(null !== hindex) {
					hindex += 'h';
					let tindex = (second ? 'secondary' : 'primary');
					if(!forecastHours[tindex][hindex]) {
						continue;
					}
					if(!forecastHours[tindex][hindex]['time']) {
						forecastHours[tindex][hindex]['time'] = result[i].time;
					}
					forecastHours[tindex][hindex]['rainChance'] = result[i].rainChance;
					//adapter.log.info('rain chance for ' + hindex + ' (' + (new Date(result[i].time)) + '): ' + result[i].rainChance);
				}
			}
			return true;
        } catch(e) {
			adapter.log.warn('Processing rain chance data failed with exception: ' + match[1]);
            return false;
        }
    } else {
		adapter.log.warn('Processing rain chance data failed: ' + body);
		return false;
	}
}


function onForecastDataReady() {
	adapter.log.debug('Got all internal forecast data, making it available to main process.');

	for(let h of ['primary', 'secondary', 'metno']) {
		if(!('0h' in forecastHours[h])) {
			forecastHours[h]['0h'] = forecastHours[h]['1h'];
			continue;
		}
		for(let d in forecastHours[h]['0h']) {
			if(forecastHours[h]['0h'][d] === null && forecastHours[h]['1h'][d] !== null) {
				forecastHours[h]['0h'][d] = forecastHours[h]['1h'][d];
			}
		}
	}

	currentForecastHours = Object.assign({}, forecastHours);
	initForecastObject();
	adapter.log.info('Got all internal forecast data and made it available to main process.');
}

function getJSONData(callback) {
	pollTimer = null;
	let fc_url = 'https://kachelmannwetter.com/de/ajax_pub/fccompact?city_id=' + city_id + '&lang=de&units=de&tf=1&m=deu-hd';//&c=a94363ec168b84086abc918cc2e527e6
	let fc_url_2 = 'https://kachelmannwetter.com/de/ajax_pub/fccompact?city_id=' + city_id + '&lang=de&units=de&tf=1&m=sui-hd';//&c=a94363ec168b84086abc918cc2e527e6

	baseRequest.get({
		url: fc_url
	}, function(error, response, body) {
		if(!error && response && (response.statusCode === 200 || response.statusCode === 204)) {
			adapter.log.info('Requested weather data from kachelmannwetter.com    fc_url is ' + fc_url);
			/*let ok = getSunData(body);
			if(!ok) {
				adapter.log.warn('Could not process sun data.');
			}*/
            let ok = getCloudData(body);
			if(!ok) {
				adapter.log.warn('Could not process weather data.');
			}

			ok = getRainData(body);
			if(!ok) {
				adapter.log.warn('Could not process weather data (rain).');
			}

			ok = getRainChanceData(body);
			if(!ok) {
				adapter.log.warn('Could not process weather data (rain chance).');
			}

			baseRequest.get({
				url: fc_url_2
			}, function(error, response, body) {
				if(!error && response && (response.statusCode === 200 || response.statusCode === 204)) {
					adapter.log.info('Requested alternative weather data from kachelmannwetter.com');
					/*let ok = getSunData(body);
					if(!ok) {
						adapter.log.warn('Could not process sun data.');
					}*/
					let ok = getCloudData(body, true);
					if(!ok) {
						adapter.log.warn('Could not process weather data.');
					}

					ok = getRainData(body, true);
					if(!ok) {
						adapter.log.warn('Could not process weather data (rain).');
					}

					ok = getRainChanceData(body, true);
					if(!ok) {
						adapter.log.warn('Could not process weather data (rain chance).');
					}
				} else {
					adapter.log.warn('Error getting forecast data from url ' + fc_url_2 + ': ' + error);
				}
				normalizeRainData();
				normalizeRainData('secondary');
				onForecastDataReady();
				callback && callback();
			});

		} else {
			adapter.log.warn('Error getting forecast data from url ' + fc_url + ': ' + error);
			normalizeRainData();
			normalizeRainData('secondary');
			onForecastDataReady();
			callback && callback();
		}

		pollTimer = setTimeout(function() {
			getMetnoData(function() {
				getJSONData();
			});
		}, 15 * 60 * 1000); // next in 15 minutes
	});
}

function getCityId(callback) {
	if(!adapter.config.iob_lat || !adapter.config.iob_lon) {
		return callback(true, {});
	}
    baseRequest.post({
        url:    city_url,
        form:   {
            lat: adapter.config.iob_lat,
            long: adapter.config.iob_lon,
            forecast_action: 'kompakt'
        }
    }, function(error, response, body) {
        if(!error && response && (response.statusCode === 200 || response.statusCode === 204)) {
            let fc_url = body;
            let match = fc_url.match(/vorhersage\/([0-9]+)-([^\/]*)(\/.*)?/);
            if(match && match.length > 0) {
                city_id = match[1];
				city_name = decodeURIComponent(match[2]);
				forecast_web_url = fc_url += '/deu-hd';//1x1';
				adapter.log.info('City id for coordinates ' + adapter.config.iob_lon + '/' + adapter.config.iob_lat + ' is ' + city_id);
				getJSONData(function() {
					callback(false, {});
				});

                return;
            } else {
                adapter.log.warn('Error getting city id from response: ' + JSON.stringify(body));
                return callback(true, {});
            }
        } else {
            adapter.log.warn('Error getting city id for coordinates: ' + error);
            return callback(true, {});
        }
    });
}

function getMetnoData(callback) {
	if(!adapter.config.iob_lat || !adapter.config.iob_lon) {
		return callback(true, {});
	}

	baseRequest.get({
        url: metno_url + 'complete?lat=' + adapter.config.iob_lat + '&lon=' + adapter.config.iob_lon
    }, function(error, response, body) {
        if(!error && response && (response.statusCode === 200 || response.statusCode === 203 || response.statusCode === 204)) {
            parseMetnoData(body, function(err) {
				if(err) {
					adapter.log.warn('Error parsing forecast data from met.no api.');
					callback(true, {});
				} else  {
					adapter.log.debug('Met.no FC Data: ' + JSON.stringify(forecastHours['metno']));
					callback(false, {});
				}
			});
        } else {
            adapter.log.warn('Error getting forecast data from met.no api: ' + error);
            return callback(true, {});
        }
   });
}

function parseMetnoData(json, callback) {
	if(!json) {
		return callback(true);
	}

	const result = JSON.parse(json);
	if(!result) {
		return callback(true);
	}

	const forecastArr = result.properties.timeseries;
	adapter.log.info('got weather data from met.no with ' + forecastArr.length + ' elements.');

	let entry;
	for(let i = 0; i < forecastArr.length; i++) {
		entry = forecastArr[i];

		if(!entry.time || !entry.data) {
			continue;
		}

		adapter.log.debug('Met.no FC from ' + entry.time);

		let hours = 1;
		if(!entry.data.next_1_hours) {
			hours = 6;
			if(!entry.data.next_6_hours) {
				continue; // no valid forecast
			}
		}

		let fromTime = new Date(entry.time);
		let toTime = new Date(entry.time);
		toTime.setUTCHours(toTime.getUTCHours() + hours);

		let forTimes = [fromTime.getTime()];
		toTime.setUTCHours(toTime.getUTCHours() - 1);
		while(toTime.getTime() > fromTime.getTime()) { // rain forecast has 1 hour period while weather forecast has 0 hour period
			forTimes.push(toTime.getTime());
			toTime.setUTCHours(toTime.getUTCHours() - 1);
			if(forTimes.length > 10) {
				adapter.log.warn('Met.no got more than 10 entries in from/to entry. This is bad. Stopping.');
				break;
			}
		}

		let fc_rain = null;
		let fc_clouds = null;
		let fc_clouds_detailed = {
			'low': null,
			'medium': null,
			'high': null
		};
		let fc_visibility = null;

		if(entry.data.next_1_hours && entry.data.next_1_hours.details && 'precipitation_amount' in entry.data.next_1_hours.details) {
			fc_rain = parseFloat(entry.data.next_1_hours.details.precipitation_amount);
		} else if(entry.data.next_6_hours && entry.data.next_6_hours.details && 'precipitation_amount' in entry.data.next_6_hours.details) {
			fc_rain = parseFloat(entry.data.next_6_hours.details.precipitation);
		}

		let orig_fc_rain = fc_rain;

		if(forTimes.length > 1) {
			fc_rain = fc_rain / forTimes.length;
		}
		adapter.log.debug('Met.no FC rain: ' + orig_fc_rain + ' (' + forTimes.length + ') -> ' + fc_rain);

		if(entry.data.instant && entry.data.instant.details && 'cloud_area_fraction' in entry.data.instant.details) {
			fc_clouds = Math.round(parseFloat(entry.data.instant.details.cloud_area_fraction));
			adapter.log.debug('Met.no FC clouds: ' + fc_clouds);
		}

		if(entry.data.instant && entry.data.instant.details && 'cloud_area_fraction_low' in entry.data.instant.details) {
			fc_clouds_detailed['low'] = Math.round(parseFloat(entry.data.instant.details.cloud_area_fraction_low));
			adapter.log.debug('Met.no FC clouds low: ' + fc_clouds_detailed['low']);
		}
		if(entry.data.instant && entry.data.instant.details && 'cloud_area_fraction_medium' in entry.data.instant.details) {
			fc_clouds_detailed['medium'] = Math.round(parseFloat(entry.data.instant.details.cloud_area_fraction_medium));
			adapter.log.debug('Met.no FC clouds medium: ' + fc_clouds_detailed['medium']);
		}
		if(entry.data.instant && entry.data.instant.details && 'cloud_area_fraction_high' in entry.data.instant.details) {
			fc_clouds_detailed['high'] = Math.round(parseFloat(entry.data.instant.details.cloud_area_fraction_high));
			adapter.log.debug('Met.no FC clouds high: ' + fc_clouds_detailed['high']);
		}

		if(entry.data.instant && entry.data.instant.details && 'fog_area_fraction' in entry.data.instant.details) {
			fc_visibility = Math.round(parseFloat(entry.data.instant.details.fog_area_fraction));
			adapter.log.debug('Met.no FC visibility (fog): ' + fc_visibility);
		}

		for(let h = 0; h < forTimes.length; h++) {
			// write data
			let hindex = getHourForTime(forTimes[h]);
			if(hindex < 0 || hindex > 49) {
				continue;
			}
			hindex += 'h';

			adapter.log.debug('Met.no storing values for index ' + hindex);

			forecastHours['metno'][hindex]['time'] = forTimes[h];

			if(fc_rain !== null && forecastHours['metno'][hindex]['rain'] === null) {
				if(forecastHours['metno'][hindex]['rainPeriod'] === null || forecastHours['metno'][hindex]['rainPeriod'] > forTimes.length) {
					forecastHours['metno'][hindex]['rain'] = fc_rain;
					forecastHours['metno'][hindex]['rainPeriod'] = forTimes.length;
				}
			}
			if(fc_clouds !== null) {
				forecastHours['metno'][hindex]['clouds'] = fc_clouds;
			}
			if(fc_clouds_detailed['low'] !== null) {
				forecastHours['metno'][hindex]['cloud_details']['low'] = fc_clouds_detailed['low'];
			}
			if(fc_clouds_detailed['medium'] !== null) {
				forecastHours['metno'][hindex]['cloud_details']['medium'] = fc_clouds_detailed['medium'];
			}
			if(fc_clouds_detailed['high'] !== null) {
				forecastHours['metno'][hindex]['cloud_details']['high'] = fc_clouds_detailed['high'];
			}
			if(fc_visibility !== null) {
				forecastHours['metno'][hindex]['visibility'] = fc_visibility;
			}
		}
	}

	callback(false);
}

module.exports = {
	init: init,
	unload: unload,
	getForecastFor: getForecastFor,
	getForecastHour: getForecastHour,
	getForecastUrl: getForecastUrl,
	getCity: getCity
};