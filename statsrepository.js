var PollutionStats = PollutionStats || {};

var MongoClient = require('mongodb').MongoClient
  , logger = require('./logger')
  , Q = require('q');

PollutionStats.StatsRepository = (function () {
  var
    client = MongoClient
    , connectionURL
    , init = function(config){
      connectionURL = config.connectionUrl;
    }
    , insert = function (data, collectionName) {
      var d = Q.defer();

      client.connect(connectionURL, {}, function (err, db) {
        if (err) {
          logger.error(err);
          d.reject(err);
        } else {
          var collection = db.collection(collectionName);

          collection.insert(data, function (err, inserted) {
            if (err) {
              logger.error(err);
              d.reject(err);
            }
            db.close();
            if (inserted) logger.info('inserted new record into database');

            d.resolve(inserted);
          });
        }
      });

      return d.promise;
    }
    , get = function (id, collectionName){
      var d  = Q.defer();

      logger.info('connectiong to the mongo database at url: ' + connectionURL);
      client.connect(connectionURL,{}, function(err, db){
        if(err){
         db.close();
         logger.error('error while connecting to the database: ' + err);
         d.reject(err);
        }
        var collection = db.collection(collectionName);

        collection.findOne({"_id":id}, function(err, data){
          if(err){
            logger.error('error while finding record: '+err);
            d.reject(err);
          }
          db.close();
          d.resolve(data);
        })
      });

      return d.promise;
    }
    ;
  return{
    insert: insert,
    get: get,
    init: init
  }
}());

module.exports = PollutionStats.StatsRepository;