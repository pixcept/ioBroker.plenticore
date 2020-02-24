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

let forecastHours = {
	'primary': {},
	'secondary': {}
};
let adapter;
let pollTimer = null;

function init(adapterInstance, callback) {
	adapter = adapterInstance;
	
	let idx;
	for(let i = 0; i < 48; i++) {
		idx = i + 'h';
		for(let h of ['primary', 'secondary']) {
			if(i > 35 && h === 'primary') {
				continue;
			}
			forecastHours[h][idx] = {
	//			sun: 0,
				clouds: 0,
				time: 0,
				rain: null,
	//			suntime: 0,
				cloud_details: {
					low: 0,
					medium: 0,
					high: 0
				}
			};
		}
	}
	
	getCityId(callback);
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
	if(!type || type !== 'secondary') {
		type = 'primary';
	}
	hour += 'h';
	if(forecastHours[type][hour]) {
		return forecastHours[type][hour];
	} else {
		return null;
	}
}

function getForecastFor(time, force, type) {
	if(!time) {
		return null;
	}
	if(!type || type !== 'secondary') {
		type = 'primary';
	}
	
	for(let i in forecastHours[type]) {
		if(Math.abs(forecastHours[type][i].time - time) <= 30 * 60 * 1000) {
			return forecastHours[type][i];
		}
	}
	
	if(force) {
		return forecastHours[type]['0h'];
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
					if(!forecastHours[hindex]) {
						continue;
					}
					forecastHours[hindex]['sun'] = el[1];
					forecastHours[hindex]['suntime'] = el[0];
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
    let match = body.match(/var\s*hccompact_data_clouds\s*=\s*\[[\s\S]*?data:\s*(\[[\s\S]*?\])\s*\}\s*\]\s*;/);
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
						rain: null
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
	if(!type || type !== 'secondary') {
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
			tofill.push(idx);
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
    let match = body.match(/var\s*hccompact_data_rain\s*=\s*\[[\s\S]*?name:\s*'(Regen|Schnee)'[\s\S]*?data:\s*(\[[\s\S]*?\]\s*\])\s*,\s*[\s\S]*?\}\s*\}\s*(?:,\s*\{[\s\S]*?name:\s*'(Regen|Schnee)'[\s\S]*?data:\s*(\[[\s0\S]*?\]\s*\])\s*,[\s\S]*?\s*\})\s*\]\s*;/);
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
			
            let el;
            let time;
            let value;

            let idx;

            let result = [];
            for(let i = 0; i < json_rain.length; i++) {
                el = json_rain[i];
                time = el[0];
                value = el[1];
				
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
						rain: null
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
			adapter.log.warn('Processing cloud data failed with exception: ' + match[1]);
            return false;
        }
    } else {
		adapter.log.warn('Processing cloud data failed: ' + body);
		return false;
	}
}

function getJSONData(callback) {
	pollTimer = null;
	let fc_url = 'https://kachelmannwetter.com/de/ajax_pub/fccompact?city_id=' + city_id + '&lang=de&units=de&tf=1&m=rapid-hd';//&c=a94363ec168b84086abc918cc2e527e6
	let fc_url_2 = 'https://kachelmannwetter.com/de/ajax_pub/fccompact?city_id=' + city_id + '&lang=de&units=de&tf=1&m=sui-hd';//&c=a94363ec168b84086abc918cc2e527e6

	baseRequest.get({
		url: fc_url
	}, function(error, response, body) {
		if(!error && response && (response.statusCode === 200 || response.statusCode === 204)) {
			adapter.log.info('Requested weather data from kachelmannwetter.com');
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
				} else {
					adapter.log.warn('Error getting forecast data from url ' + fc_url_2 + ': ' + JSON.stringify([error, response]));
				}
				normalizeRainData();
				normalizeRainData('secondary');
				callback && callback();
			});
			
		} else {
			adapter.log.warn('Error getting forecast data from url ' + fc_url + ': ' + JSON.stringify([error, response]));
			normalizeRainData();
			normalizeRainData('secondary');
			callback && callback();
		}
		
		pollTimer = setTimeout(function() {
			getJSONData();
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
				forecast_web_url = fc_url += '/rapid-hd';//1x1';
				adapter.log.info('City id for coordinates ' + adapter.config.iob_lon + '/' + adapter.config.iob_lat + ' is ' + city_id);
				getJSONData(function() {
					callback(false, {});
				});

                return;
            } else {
                adapter.log.warn('Error getting city id from response: ' + JSON.stringify([body, response]));
                return callback(true, {});
            } 
        } else {
            adapter.log.warn('Error getting city id for coordinates: ' + JSON.stringify([error, response]));
            return callback(true, {});
        }
    });
}

module.exports = {
	init: init,
	unload: unload,
	getForecastFor: getForecastFor,
	getForecastHour: getForecastHour,
	getForecastUrl: getForecastUrl,
	getCity: getCity
};