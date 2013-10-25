var PollutionStats = PollutionStats || {};

var MongoClient = require('mongodb').MongoClient
  , logger = require('./logger')
  , Q = require('q');

PollutionStats.StatsRepository = (function () {
  var
    client = MongoClient
    , connectionURL = 'mongodb://localhost/pollution_stats'
    , insert = function (data, collectionName) {
      var d = Q.defer();

      client.connect(connectionURL, {}, function (err, db) {
        if (err) logger.error(err);

        var collection = db.collection(collectionName);

        collection.insert(data, function (err, inserted) {
          if (err) logger.error(err);

          if (inserted) logger.info('inserted new record into database');

          d.resolve(inserted);
        });
      });

      return d.promise;
    }
    ;
  return{
    insert: insert
  }
}());

module.exports = PollutionStats.StatsRepository;