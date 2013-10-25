var PollutionStats = PollutionStats || {};

var _ = require('lodash')
  , Q = require('q')
  , parseString = require('xml2js').parseString;

PollutionStats.WrotaMalopolskiParser = (function () {
  var
    parse = function (XMLString) {
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
            pollutionStat.pollutants.push(
              {
                "pollutant": pollutant.Pollutant[0],
                "concentration": pollutant.Concentration[0],
                "value": pollutant.Value[0]
              }
            );
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