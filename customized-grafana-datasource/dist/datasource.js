'use strict';

System.register(['lodash'], function (_export, _context) {
  "use strict";

  var _, _createClass, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('GenericDatasource', GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, GenericDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.selectMenu = ['=', '>', '<'];
          this.metricValue = this.metricValue || [];
          this.metricColumn = this.metricColumn || [];
          this.whereSuggest = [];
          //self = this;
        }

        _createClass(GenericDatasource, [{
          key: 'query',
          value: function query(options) {
            var query = this.buildQueryParameters(options, this);
            query.targets = query.targets.filter(function (t) {
              return !t.hide;
            });
            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            return this.backendSrv.datasourceRequest({
              url: this.url + '/query',
              data: query,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }, {
          key: 'testDatasource',
          value: function testDatasource() {
            return this.backendSrv.datasourceRequest({
              url: this.url + '/',
              method: 'GET'
            }).then(function (response) {
              if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
              }
            });
          }
        }, {
          key: 'annotationQuery',
          value: function annotationQuery(options) {
            var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
            var annotationQuery = {
              range: options.range,
              annotation: {
                name: options.annotation.name,
                datasource: options.annotation.datasource,
                enable: options.annotation.enable,
                iconColor: options.annotation.iconColor,
                query: query
              },
              rangeRaw: options.rangeRaw
            };

            return this.backendSrv.datasourceRequest({
              url: this.url + '/annotations',
              method: 'POST',
              data: annotationQuery
            }).then(function (result) {
              return result.data;
            });
          }
        }, {
          key: 'metricFindQuery',
          value: function metricFindQuery(options) {
            var target = typeof options === "string" ? options : options.target;
            var interpolated = {
              target: this.templateSrv.replace(target, null, 'regex'),
              type: "Search"
            };

            return this.backendSrv.datasourceRequest({
              url: this.url + '/search',
              data: interpolated,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(this.mapToTextValue);
          }
        }, {
          key: 'metricFindTables',
          value: function metricFindTables(options) {
            var target = typeof options === "string" ? options : "Find tables";
            var interpolated = {
              target: this.templateSrv.replace(target, null, 'regex'),
              type: "Table"
            };
            return this.backendSrv.datasourceRequest({
              url: this.url + '/search',
              data: interpolated,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(this.mapToTextValue);
          }
        }, {
          key: 'findMetric',
          value: function findMetric(options, metric) {
            var target = typeof options === "string" ? options : options.series;
            var interpolated = {
              target: this.templateSrv.replace(target, null, 'regex'),
              type: metric
            };
            console.log(interpolated);
            return this.backendSrv.datasourceRequest({
              url: this.url + '/search',
              data: interpolated,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(this.mapToTextValue);
          }
        }, {
          key: 'findWhereFields',
          value: function findWhereFields(options, parentIndex, index, like_field, callback) {
            var target = typeof options === "string" ? options : options.series;
            if (options.whereClauseGroup[parentIndex].length > 1) {
              var whereList = options.whereClauseGroup[parentIndex];
              var flag = true;
              var meta_field = "";
              var parent_meta_field = "";
              var parent_meta_field_value = "";
              for (var i = 0; i < whereList.length && flag; i++) {
                if (i != index && typeof whereList[i] != 'undefined') {
                  meta_field = whereList[index].left;
                  parent_meta_field = whereList[i].left;
                  parent_meta_field_value = whereList[i].right;
                  flag = false;
                }
              }
              var interpolated = {
                target: this.templateSrv.replace(target, null, 'regex'),
                meta_field: this.templateSrv.replace(meta_field, null, 'regex'),
                like_field: this.templateSrv.replace(like_field, null, 'regex'),
                parent_meta_field: this.templateSrv.replace(parent_meta_field, null, 'regex'),
                parent_meta_field_value: this.templateSrv.replace(parent_meta_field_value, null, 'regex'),
                type: "Where_Related"
              };

              return this.backendSrv.datasourceRequest({
                url: this.url + '/search',
                data: interpolated,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              }).then(this.mapToArray).then(callback);
            } else {
              var meta_field = options.whereClauseGroup[parentIndex][index].left;
              var interpolated = {
                target: this.templateSrv.replace(target, null, 'regex'),
                meta_field: this.templateSrv.replace(meta_field, null, 'regex'),
                like_field: this.templateSrv.replace(like_field, null, 'regex'),
                type: "Where"
              };
              return this.backendSrv.datasourceRequest({
                url: this.url + '/search',
                data: interpolated,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              }).then(this.mapToArray).then(callback);
            }
          }
        }, {
          key: 'generateDashboard',
          value: function generateDashboard(options, timeFrom, timeTo, DB_title, datasource) {
            var target = typeof options === "string" ? options : options.target;
            var interpolated = {
              query: this.templateSrv.replace(target, null, 'regex'),
              drill: options.drillDownValue,
              timeFrom: timeFrom,
              timeTo: timeTo,
              DB_title: DB_title,
              Data_source: datasource,
              alias: options.drillDownAlias
            };
            return this.backendSrv.datasourceRequest({
              url: this.url + '/dashboard',
              data: interpolated,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(function () {});
          }
        }, {
          key: 'findOperator',
          value: function findOperator() {
            return new Promise(function (resolve, reject) {
              var a = { "data": ['=', '<', '>'], "status": 200, "statusText": "OK" };
              resolve(a);
            }).then(this.mapToTextValue);
          }
        }, {
          key: 'mapToTextValue',
          value: function mapToTextValue(result) {
            var a = _.map(result.data, function (d, i) {
              if (d && d.text && d.value) {
                return { text: d.text, value: d.value };
              } else if (_.isObject(d)) {
                return { text: d, value: i };
              }
              return { text: d, value: d };
            });
            return a;
          }
        }, {
          key: 'mapToArray',
          value: function mapToArray(result) {
            if (result.data.length == 0) {
              result.data = ["No results found"];
            }
            return result.data;
          }
        }, {
          key: 'mapToListValue',
          value: function mapToListValue(result) {
            this.metricValue = result.data;
            console.log(this.metricValue);
          }
        }, {
          key: 'targetContainsTemplate',
          value: function targetContainsTemplate(target) {
            return templateSrv.variableExists(target.target);
          }
        }, {
          key: 'buildQueryParameters',
          value: function buildQueryParameters(options, t) {
            var scopevar = options.scopedVars;
            var query = _.map(options.targets, function (target) {
              if (target.rawQuery) {
                var query = t.templateSrv.replace(target.target, scopevar);
                return query;
              } else {
                var query = 'get ';
                var seriesName = target.series;
                for (var index = 0; index < target.metric_array.length; index++) {
                  query += ' ' + target.metric_array[index];
                  if (index + 1 == target.metric_array.length) {
                    break;
                  }
                  query += ',';
                }

                for (var index = 0; index < target.metricValues_array.length; index++) {
                  query += ', aggregate(values.' + target.metricValues_array[index];
                  if (typeof target.bucketValue[index] === 'undefined' || target.bucketValue[index] === '') query += ', $quantify, ';else query += ', ' + target.bucketValue[index] + ', ';
                  if (target.aggregator[index] == "percentile") query += target.aggregator[index] + '(' + target.percentileValue[index] + '))';else query += target.aggregator[index] + ')';
                }
                query += ' between ($START,$END)';
                if (target.groupby_field != " ") {
                  query += ' by ' + target.groupby_field;
                }
                query += ' from ' + seriesName;
                query += " where ";
                for (var i = 0; i < target.whereClauseGroup.length; i++) {
                  if (i > 0) query += " " + target.outerGroupOperator[i] + " ";
                  query += " ( ";
                  for (var j = 0; j < target.whereClauseGroup[i].length; j++) {
                    if (j > 0) query = query + " " + target.inlineGroupOperator[i][j] + " ";
                    query += target.whereClauseGroup[i][j].left + " " + target.whereClauseGroup[i][j].op + " \"" + target.whereClauseGroup[i][j].right + "\"";
                  }
                  query += " )";
                }

                target.target = query;
                return query;
              }
            }.bind(scopevar));
            var index = 0;
            var targets = _.map(options.targets, function (target) {
              console.log(target);
              return {
                target: query[index++],
                refId: target.refId,
                hide: target.hide,
                type: target.type || 'timeserie',
                alias: target.target_alias
              };
            });
            options.targets = targets;
            return options;
          }
        }]);

        return GenericDatasource;
      }());

      _export('GenericDatasource', GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
