var http = require('http')
  , fs = require('fs')
  , bl = require('bl')
  , moment = require('moment')
  , _ = require('lodash')
  , Q = require('q')
  , logger = require('./logger')
  , statParser = require('./statisticsParser')
  , configFile = __dirname + '/config.json'
  , repo = require('./statsrepository');

var configData = fs.readFileSync(configFile, 'utf8');

var config = JSON.parse(configData);

var requestInterval = config["checkInterval"]; // defined in minutes
logger.info('initializing request interval to :' + requestInterval);

var stations = config["stations"];
logger.info('initializing stations urls to :\n' + stations);

var isTaskRunning = false;
setInterval(function () {
  if (isTaskRunning) {
    console.log('Task was not run because previous task has not finished execution');
    return;
  } else {
    isTaskRunning = true;
    logger.info('starting request execution at: ' + moment());
    ProcessAllEndpoints(stations)
      .then(function () {
        logger.info('finished reques execution at: ' + moment());
        isTaskRunning = false;
      });
  }
}, requestInterval * 60 * 1000)


function ProcessAllEndpoints(endpoints, n, d) {
  n = n || 0;
  d = d || Q.defer();

  if (!endpoints) throw new EventException();

  if (!endpoints[n]) {
    d.resolve();
  } else {
    RequestStats(endpoints[n]).then(function (data) {
      logger.info('processing data form: ' + endpoints[n]);
      if(data){
        logger.info(data);

        repo.insert(data, 'pollution_stats')
          .then(function(){
            // calling next endpoint whenever previos one is processed
            ProcessAllEndpoints(endpoints, n + 1, d);
          });
      }else{
        logger.error('no data received from endpoint');
        ProcessAllEndpoints(endpoints, n + 1, d);
      }


    });

    return d.promise;
  }
}


function RequestStats(url) {
  var d = Q.defer();
  http.get(url, function (req) {
    req.pipe(bl(function (err, result) {
      if (err) console.log(err);

      logger.info('got response from: ' + url);

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
    logger.info(currentTime);
    var currentStat = _.first(data, function (obj) {
      return obj.date === currentTime;
    });

    d.resolve(currentStat[0]);
  });

  return d.promise;
}