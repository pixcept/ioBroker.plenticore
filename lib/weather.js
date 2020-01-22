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

let forecastHours = {};
let adapter;
let pollTimer = null;

function init(adapterInstance, callback) {
	adapter = adapterInstance;
	
	let idx;
	for(let i = 0; i < 48; i++) {
		idx = i + 'h';
		forecastHours[idx] = {
			sun: 0,
			clouds: 0,
			time: 0,
			suntime: 0,
			cloud_details: {
				low: 0,
				medium: 0,
				high: 0
			}
		};
	}
	
	getCityId(callback);
}

function unload() {
	if(pollTimer) {
		clearTimeout(pollTimer);
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

function getForecastHour(hour) {
	hour += 'h';
	if(forecastHours[hour]) {
		return forecastHours[hour];
	} else {
		return null;
	}
}

function getForecastFor(time, force) {
	if(!time) {
		return null;
	}
	
	for(let i in forecastHours) {
		if(Math.abs(forecastHours[i].time - time) <= 30 * 60 * 1000) {
			return forecastHours[i];
		}
	}
	
	if(force) {
		return forecastHours['0h'];
	}
	
	return null;
}

function getSunData(body) {
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
}

function getCloudData(body) {
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
                        clouds: 0
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
					if(!forecastHours[hindex]) {
						continue;
					}
					forecastHours[hindex]['time'] = result[i].time;
					forecastHours[hindex]['clouds'] = result[i].clouds;
					forecastHours[hindex]['cloud_details'] = {
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

function getJSONData(callback) {
	pollTimer = null;
	let fc_url = 'https://kachelmannwetter.com/de/ajax_pub/fccompact?city_id=' + city_id + '&lang=de&units=de&tf=1&m=sui-hd';//&c=a94363ec168b84086abc918cc2e527e6

	baseRequest.get({
		url: fc_url
	}, function(error, response, body) {
		if(!error && response && (response.statusCode === 200 || response.statusCode === 204)) {
			adapter.log.info('Requested weather data from kachelmannwetter.com');
			let ok = getSunData(body);
			if(!ok) {
				adapter.log.warn('Could not process sun data.');
			}
            ok = getCloudData(body);
			if(!ok) {
				adapter.log.warn('Could not process weather data.');
			}
		} else {
			adapter.log.warn('Error getting forecast data from url ' + fc_url + ': ' + JSON.stringify([error, response]));
		}
		
		pollTimer = setTimeout(function() {
			getJSONData();
		}, 15 * 60 * 1000); // next in 15 minutes
		
		callback && callback();
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
            let match = fc_url.match(/vorhersage\/([0-9]+)-.*/);
            if(match && match.length > 0) {
                city_id = match[1];
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
	getForecastHour: getForecastHour
};