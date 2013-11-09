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
stations.forEach(function(station){
  logger.info('initializing station url to :\n' + station.url + ", key: " + station.key);
});

repo.init({"connectionUrl": config["connectionString"]})


var isTaskRunning = false;
setInterval(function () {
  if (isTaskRunning) {
    logger.info('Task was not run because previous task has not finished execution');
    return;
  } else {
    isTaskRunning = true;
    logger.info('starting request execution');
    ProcessAllEndpoints(stations)
      .then(function () {
        logger.info('finished request execution');
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
    var stationURL = endpoints[n].url;
    RequestStats(stationURL).then(function (data) {
      logger.info('processing data from: ' + stationURL);
      if(data){
        data["_id"] = endpoints[n].key +'-'+ data.date;
        data["station_id"] = endpoints[n].key;

        repo.get(data["_id"], 'pollution_stats').then(function(repoStat){
          if(!repoStat){
            logger.info('inserting new stats: ' );
            logger.info(data);
            repo.insert(data, 'pollution_stats')
              .then(function(){
                // calling next endpoint whenever previos one is processed
                ProcessAllEndpoints(endpoints, n + 1, d);
              });
          }else{
            logger.info('received data has already been processed');
            ProcessAllEndpoints(endpoints, n + 1, d);
          }
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
      if (err) logger.log(err);

      logger.info('got response from: ' + url);

      GetLatestStats(result)
        .then(function (data) {
          d.resolve(data);
        });
    }));
  });

  return d.promise;
}

function GetLatestStats(result) {
  var d = Q.defer();
  // string clean up from windows XML Byte-Order-Mark (BOM)
  result = result.toString().replace("\ufeff", "");

  statParser.parse(result).then(function (data) {
    var currentTime = moment().subtract('hours', 1).format('YYYY-MM-DD HH:00:00').toString();
    logger.info(currentTime);

    var data = _.sortBy(data, function(stat){
      return stat.date;
    });
    data.reverse();

    d.resolve(data[0]);
  });

  return d.promise;
}