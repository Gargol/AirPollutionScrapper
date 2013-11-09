var PollutionStats = PollutionStats || {};

var _ = require('lodash')
  , Q = require('q')
  , parseString = require('xml2js').parseString;

PollutionStats.WrotaMalopolskiParser = (function () {
  var
    // taken from here http://monitoring.krakow.pios.gov.pl/iseo/
    norms ={
      "SO2": 350,
      "NO": 40,
      "NO2": 200,
      "CO":  10000,
      "PM2.5":25,
      "O3":120,
      "C6H6": 5,
      "PM10": 50
    }
  /**
   * adds norm parameters and allowed
   * pollution percent calculations to pollutant object
   * @param pollutant
   */
    , getDecoratedPollutant = function(pollutant){
      var decorated = {
          "pollutant": pollutant.Pollutant[0],
          "concentration": pollutant.Concentration[0],
          "value": parseFloat(pollutant.Value[0])
        };

      if(norms.hasOwnProperty(decorated.pollutant)){
        decorated.norm = norms[decorated.pollutant];
        decorated.normPercent = Math.round((decorated.value / decorated.norm ) * 100 * 100)/100;
      }

      return decorated;
    }
    , parse = function (XMLString) {
      var d = Q.defer();

      parseString(XMLString, function (err, parsedJSON) {
        if (err) throw err;

        var groupedPollutionResults = _.groupBy(parsedJSON.Current.Item, function (obj) {
          return obj.City && obj.Date;
        });

        var pollutionByHour = [];
        _.each(groupedPollutionResults, function (obj) {
          var pollutionStat = {};
          pollutionStat.pollutants = [];
          pollutionStat.city = obj[0].City[0];
          pollutionStat.date = obj[0].Date[0];

          _.each(obj, function (pollutant) {
            var decoratedPollutant = getDecoratedPollutant(pollutant);
            pollutionStat.pollutants.push(decoratedPollutant);
          });

          pollutionByHour.push(pollutionStat);
        });

        d.resolve(pollutionByHour);
      });

      return d.promise;
    };

  return {
    parse: parse
  }
}());

module.exports = PollutionStats.WrotaMalopolskiParser;