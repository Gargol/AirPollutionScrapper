var http = require('http')
  , fs = require('fs')
  , bl = require('bl')
  , moment = require('moment')
  , _ = require('lodash')
  , Q = require('q')
  , statParser = require('./statisticsParser');

var requestInterval = 1; // defined in minutes

var baseURL = 'http://www.malopolska.pl/_layouts/WrotaMalopolski/XmlData.aspx?data=2&id=';

var stations = [
  baseURL + 6003,
  baseURL + 6004,
  baseURL + 6005,
  baseURL + 6006,
  baseURL + 6007,
  baseURL + 6008,
  baseURL + 6009,
  baseURL + 6010,
  baseURL + 6011,
  baseURL + 6013,
  baseURL + 6014,
  baseURL + 6015,
];

var isTaskRunning = false;
setInterval(function () {
  if (isTaskRunning) {
    console.log('Task was not run because previous task has not finished execution');
    return;
  } else {
    isTaskRunning = true;
    console.log('starting request execution at: ' + new Date());
    ProcessAllEndpoints(stations)
      .then(function () {
        console.log('finished reques execution at: ' + new Date());
        isTaskRunning = false;
      });
  }
}, requestInterval * 30 * 1000)


function ProcessAllEndpoints(endpoints, n, d) {
  n = n || 0;
  d = d || Q.defer();

  if (!endpoints) throw new EventException();

  if (!endpoints[n]) {
    d.resolve();
  } else {
    RequestStats(endpoints[n]).then(function (data) {
      console.log('god data from ' + endpoints[n]);
      console.dir(data);

      // calling next endpoint whenever previos one is processed
      ProcessAllEndpoints(endpoints, n + 1, d);
    });

    return d.promise;
  }
}


function RequestStats(url) {
  var d = Q.defer();
  http.get(url, function (req) {
    req.pipe(bl(function (err, result) {
      if (err) console.log(err);

      console.log('got response from: ' + url);

      ProcessRequestResult(result)
        .then(function (data) {
          d.resolve(data);
        });
    }));
  });

  return d.promise;
}

function ProcessRequestResult(result) {
  var d = Q.defer();
  // string clean up from windows XML Byte-Order-Mark (BOM)
  result = result.toString().replace("\ufeff", "");

  statParser.parse(result).then(function (data) {
    var currentTime = moment().subtract('hours', 1).format('YYYY-MM-DD HH:00:00').toString();
    console.log(currentTime);
    var currentStat = _.first(data, function (obj) {
      return obj.date === currentTime;
    });

    d.resolve(currentStat[0]);
  });

  return d.promise;
}