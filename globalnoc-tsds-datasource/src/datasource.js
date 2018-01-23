// The MIT License (MIT)

// Copyright (c) 2016 Grafana
// Copyright (c) 2017 Trustees of Indiana University

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import _ from "lodash";
import {ResponseHandler} from './response_handler';

class GenericDatasource {
    /**
     * Create a GenericDatasource
     *
     * @param {Object} instanceSettings - A
     * @param {Object} $q - A
     * @param {Object} backendSrv - A
     * @param {Object} templateSrv - A
     */
    constructor(instanceSettings, $q, backendSrv, templateSrv) {
        this.type = instanceSettings.type;
        this.url = instanceSettings.url;
        this.name = instanceSettings.name;
        this.q = $q;
        this.basicAuth = instanceSettings.basicAuth;
        this.withCredentials = instanceSettings.withCredentials;
        this.backendSrv = backendSrv;
        this.templateSrv = templateSrv;
        this.variables = this.templateSrv.variables;
        this.selectMenu = ['=','>','<'];
        this.metricValue = this.metricValue||[];
        this.metricColumn =this.metricColumn||[];
        this.whereSuggest =[];

        this.tsdsURL = 'https://netsage-archive.grnoc.iu.edu/tsds/services-basic/';
    }

    query(options) {
      return this.buildQueryParameters(options, this).then((query) => {
        query.targets = query.targets.filter(t => !t.hide);
        if (query.targets.length <= 0) { return this.q.when({data: []}); }

        if (typeof angular === 'undefined') {
          var ops = {
            url: this.url + '/query',
            data:query,
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
          };

          return this.post(query.targets, ops).then(function(response){
            let data = new ResponseHandler(query.targets, response.data).getData();
            console.log(data);
            return data;
          });
        }

        console.log(query);
        let start = Date.parse(query.range.from) / 1000;
        let end   = Date.parse(query.range.to) / 1000;
        let duration = (end - start);

        let output = [];

        let requests = query.targets.map((target) => {
          return new Promise((resolve, reject) => {
            let form = new FormData();
            form.append('method', 'query');
            form.append('query', target.target);

            let request = {
              data: form,
              headers: {'Content-Type' : 'multipart/form-data'},
              method: 'POST',
              url: `${this.tsdsURL}query.cgi`
            };

            if (this.basicAuth || this.withCredentials) {
              request.withCredentials = true;
            }

            if (this.basicAuth) {
              request.headers.Authorization = self.basicAuth;
            }

            let aliases  = target.targetAliases;
            let query    = target.target;
            let template = target.alias !== '' ? target.alias.split(' ') : null; // Value of 'Target Name'

            return this.backendSrv.datasourceRequest(request).then((response) => {
              response.data.results.forEach((result) => {

                // TSDS modifies the target expression of extrapolate
                // functions on return, such that a request like
                // 'extrapolate(..., 1526705726)' will return with a
                // key of 'extrapolate(..., Date(1526705726))'; This
                // breaks our alias mappings. Ensure the key from TSDS
                // no longer includes the Date method.
                let newval = null;
                let newkey = null;

                for (let key in result) {
                  if (key.indexOf('extrapolate') !== -1) {
                    newval = result[key];
                    newkey = key.replace(/Date\(\d+\)/g, function(x) {
                      return x.match(/\d+/);
                    });
                  }

                  if (newval !== null) {
                    result[newkey] = newval;
                    delete result[key];
                  }
                }

                let targetObjects = this.getTargetNames(result, template, aliases);
                console.log(targetObjects);

                targetObjects.forEach((targetObject) => {
                  let datapoints = result[targetObject['name']];

                  if (Array.isArray(datapoints)) {
                    // TSDS returns [timestamp, value], but Grafana
                    // wants [value, timestamp] in milliseconds.
                    targetObject['datapoints'] = datapoints.map(datapoint => [datapoint[1], datapoint[0] * 1000]);
                  } else {
                    // It's possible that a user may request
                    // something like sum(aggregate(...)) which will
                    // result in a single datapoint being returned.
                    targetObject['datapoints'] = [[datapoints, end]];
                  }

                  output.push(targetObject);
                });
              });

              output.sort(function(a, b) {
                var nameA = a.target.toUpperCase();
                var nameB = b.target.toUpperCase();
                if (nameA < nameB) {
                  return -1;
                }
                if (nameA > nameB) {
                  return 1;
                }

                return 0;
              });

              resolve(output);
            });
          });
        });

        return Promise.all(requests).then((responses) => {
          console.log(output);
          return {data: output, error: null};
        });
      });
    }

  getHumanTime(seconds) {
    if (seconds >= 86400) {
      let count = seconds/86400;
      return `${count}d`;
    }

    if (seconds >= 3600) {
      let count = seconds/3600;
      return `${count}h`;
    }

    if (seconds >= 60) {
      let count = seconds/3600;
      return `${count}m`;
    }

    return `${seconds}s`;
  }

  getTargetNames(result, template, aliases) {
    let returnNames = [];

    for (let key in result) {

      // Aggregate functions will have '.values' in the key. The rest
      // are metric names.
      if (key.indexOf('values.') === -1) {
        continue;
      }

      let args = key.split(/[(,)]/).map(x => x.trim());
      let name = null;

      if (aliases.hasOwnProperty(key) && aliases[key] !== '') {
        name = aliases[key];
      } else if (args[0] !== 'aggregate') {
        name = key;
      } else if (key.indexOf('percentile') !== -1) {
        let measurement = args[1].replace('values.', '');
        measurement = measurement.charAt(0).toUpperCase() + measurement.slice(1);
        let humanTime   = this.getHumanTime(args[2]);
        let aggregation = args[3];
        let percentile  = args[4];

        name = `${measurement} ${humanTime} ${percentile}th ${aggregation}s`;
      } else {
        let measurement = args[1].replace('values.', '');
        measurement = measurement.charAt(0).toUpperCase() + measurement.slice(1);
        let humanTime   = this.getHumanTime(args[2]);
        let aggregation = args[3];

        name = `${measurement} (${humanTime} ${aggregation}s)`;
      }
      console.log(name);

      let targetNames = [name];
      if (template !== null) {
        console.log(template);

       for (let i = 0; i < template.length; i++) {
         if (template[i].charAt(0) !== '$') {
           targetNames.push(template[i]);
           continue;
         }

         let alias = template[i].replace('$', '');
         if (result.hasOwnProperty(alias)) {
           targetNames.push(result[alias]);
         } else if (alias === 'VALUE') {
           targetNames.shift();
           targetNames.push(name);
         }
       }
      } else {
        targetNames = targetNames.concat(this.getMetricLabel(result));
      }

      for (let i = 0; i < targetNames.length; i++) {
        if (targetNames[i] === null) {
          targetNames[i] = '';
        }
      }

      returnNames.push({
        name:   key,
        target: targetNames.join(' ')
      });
    }

    return returnNames;
  }

  getMetricLabel(tsdsResult) {
    return Object.keys(tsdsResult)
      .sort()
      .filter(x => x.indexOf('values.') === -1)
      .map(x => tsdsResult[x]);
  }

  /**
   * getAdhocQueryString takes an adhoc filter and converts it into a
   * 'where' component for a TSDS query. If the filter's key is '*' a
   * request to TSDS will be made for all available metric types.
   */
    getAdhocQueryString(filter) {
      return new Promise((resolve, reject) => {
        // Replace Grafana's like operator with TSDS' equivalent
        if (filter.operator === '=~') filter.operator = ' like ';

        if (filter.key !== '*') {
          resolve(`${filter.key}${filter.operator}"${filter.value}"`);
        }

        this.getTagKeys().then((response) => {
          let query = response.filter(function(field) {
            return (field.text === '*') ? false : true;
          }).map(function(field) {
            return `${field.text}${filter.operator}"${filter.value}"`;
          }).join(' or ');

          resolve(query);
        });
      });
    }

    /**
     * Makes a datasourceRequest and handle errors Resolves to check
     * errors in response.
     */
    post(targets,options) {
        return this.backendSrv.datasourceRequest(options).then(function(results) {
            results.data.config = results.config;
            return results;
        }).catch(error => {
            // datasourceRequest rejected, throw a query error!
            if(error.data && error.data.error){
                /***** Example throw error for the Grafana inspector to catch *****/
                //throw { message: 'TSDS Query Error: ' + err.data[0]['Error Text'] }

                throw new ResponseHandler(targets, error).getErrorInfo({}, error);
            }
            throw error;
        });
    }

    /**
     * testDatasource queries for TSDS measurement types. If the
     * request is successful the plugin is configured correctly.
     */
    testDatasource() {
      let form = new FormData();
      form.append('method', 'get_measurement_types');

      let request = {
          headers: {'Content-Type' : 'multipart/form-data'},
          method: 'POST',
          data: form,
          url: `${this.tsdsURL}metadata.cgi`
      };

      if (this.basicAuth || this.withCredentials) {
        request.withCredentials = true;
      }

      if (this.basicAuth) {
        request.headers.Authorization = self.basicAuth;
      }

      return this.backendSrv.datasourceRequest(request)
        .then((response) => {
          if (response.status === 200) {
            return { status: "success", message: "Data source is working", title: "Success" };
          }

          return { error: "Data source isn't working" };
        });
    }

    /**
     * getMeasurementType returns the TSDS measurement type to use
     * when looking up measurement type values and metadata. The
     * result of this function defaults to 'interface', but may be
     * overridden by defining the name of an adhoc template
     * variable. If multiple adhoc template variables are defined the
     * name of the first is used.
    */
    getMeasurementType() {
        var target = 'interface';
        if (typeof this.templateSrv.variables !== 'undefined') {
            var adhocVariables = this.templateSrv.variables.filter(filter => filter.type === 'adhoc');
            target = adhocVariables[0].name;
        }
        return target;
    }

    /**
    * getParentMetaFields returns the parent meta fields of fieldName
    * as an array. getParentMetaFields should only return adhoc
    * filters defined to the left of fieldName, and all other template
    * variables.
    */
    getParentMetaFields(fieldName) {
        var fields = [];

        this.templateSrv.variables.forEach(function(element) {
        if (element.type === 'adhoc') {
            return;
        }

        fields.push({
            key:   element.name,
            value: element.current.value
        });
        });

        if (typeof this.templateSrv.getAdhocFilters === 'undefined') {
            return fields;
        }

        var adhocFilters = this.templateSrv.getAdhocFilters(this.name);
        for (var i = 0; i < adhocFilters.length; i++) {
            if (adhocFilters[i].key === fieldName) {
                break;
            }

            fields.push({
                key:   adhocFilters[i].key,
                value: adhocFilters[i].value
            });
        }

        return fields;
    }

    getTagKeys(options) {
        var payload = {
            url: this.url + '/search',
            data: { type: 'Column', target: this.getMeasurementType() },
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        if (this.basicAuth || this.withCredentials) {
            payload.withCredentials = true;
        }
        if (this.basicAuth) {
            payload.headers.Authorization = self.basicAuth;
        }

        return this.backendSrv.datasourceRequest(payload).then((result) => {
            // Adding * option for generic search.
            let mTypes = this.mapToTextValue(result);
            mTypes.splice(0, 0, {text: "*", value: "*"});
            return mTypes;
        });
    }

    getTagValues(options) {
        var like = '';
        if (typeof this.templateSrv.getAdhocFilters !== 'undefined') {
            // TODO Update like field as user types
            // console.log(this.templateSrv.getAdhocFilters(this.name));
        }

        var payload = {
            url: this.url + '/search',
            data: {
                target: this.getMeasurementType(),
                parent_meta_fields: this.getParentMetaFields(options.key),
                meta_field: options.key,
                like_field: like,
                type: 'Where_Related'
            },
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        if (this.basicAuth || this.withCredentials) {
            payload.withCredentials = true;
        }
        if (this.basicAuth) {
            payload.headers.Authorization = self.basicAuth;
        }

        return this.backendSrv.datasourceRequest(payload).then(this.mapToTextValue);
    }

    annotationQuery(options) {
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

        var payload = {
            url: this.url + '/annotations',
            method: 'POST',
            data: annotationQuery
        };
        if (this.basicAuth || this.withCredentials) {
            payload.withCredentials = true;
        }
        if (this.basicAuth) {
            payload.headers.Authorization = self.basicAuth;
        }

        return this.backendSrv.datasourceRequest(payload).then(result => {
            return result.data;
        });
    }

    /**
     * metricFindQuery is called once for every template variable, and
     * returns a list of values that may be used for each. This method
     * implements part of the Grafana Datasource specification.
     *
     * @param {string} options - A TSDS query
     */
    metricFindQuery(options) {
      var target = typeof options === "string" ? options : options.target;

      // By default the dashboard's selected time range is not passed
      // to metricFindQuery. Use the angular object to retrieve it or
      // if the angular object doesn't exist we're in test.
      if (typeof angular === 'undefined') {
        let request = {
          headers: {'Content-Type' : 'multipart/form-data'},
          method: 'POST',
          data: { method: 'query', query: target },
          url: `${this.tsdsURL}query.cgi`
        };

        return this.backendSrv.datasourceRequest(request).then((response) => {
          return response.data.map((x) => { return {text: x, value: x}; });
        });
      }

      let range = angular.element('grafana-app').injector().get('timeSrv').timeRange();
      let start = Date.parse(range.from) / 1000;
      let end   = Date.parse(range.to) / 1000;
      let duration = (end - start);

      target = target.replace("$START", start.toString());
      target = target.replace("$END", end.toString());
      target = target.replace("$TIMESPAN", duration.toString());
      target = this.templateSrv.replace(target, null, 'regex');

      // Nested template variables are escaped, which tsds doesn't
      // expect. Remove any `\` characters from the template
      // variable query to craft a valid tsds query.
      target = target.replace(/\\/g, "");

      let form = new FormData();
      form.append('method', 'query');
      form.append('query', target);

      let request = {
        headers: {'Content-Type' : 'multipart/form-data'},
        method: 'POST',
        data: form,
        url: `${this.tsdsURL}query.cgi`
      };

      if (this.basicAuth || this.withCredentials) {
        request.withCredentials = true;
      }

      if (this.basicAuth) {
        request.headers.Authorization = self.basicAuth;
      }

      return this.backendSrv.datasourceRequest(request)
        .then((response) => {
          let dataType = target.split(' ')[1];
          let data = response.data.results.map((x) => {
            return {text: x[dataType], value: x[dataType]};
          });

          return data;
        });
    }

    metricFindTables(options) {
        var target = typeof (options) === "string" ? options : "Find tables";
        var interpolated = {
            target: this.templateSrv.replace(target, null, 'regex'),
            type: "Table"
        };

        var payload = {
            url: this.url + '/search',
            data: interpolated,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        if (this.basicAuth || this.withCredentials) {
            payload.withCredentials = true;
        }
        if (this.basicAuth) {
            payload.headers.Authorization = self.basicAuth;
        }
        return this.backendSrv.datasourceRequest(payload).then(this.mapToTextValue);
    }

    findMetric(options, metric) {
        var target = typeof (options) === "string" ? options : options.series;
        var interpolated = {
            target: this.templateSrv.replace(target, null, 'regex'),
            type:metric
        };

        var payload = {
            url: this.url + '/search',
            data: interpolated,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        if (this.basicAuth || this.withCredentials) {
            payload.withCredentials = true;
        }
        if (this.basicAuth) {
            payload.headers.Authorization = self.basicAuth;
        }
        return this.backendSrv.datasourceRequest(payload).then((resp) => {
            this.mapToTextValue(resp);
        });
    }

    /**
     * getMetaFields returns a list of metadata fields that can be
     * used to filter datasets of the specified type.
     *
     * @param {string} type - A measurement structure type
     */
    getMetaFields(type) {
      let form = new FormData();
      form.append('method', 'get_meta_fields');
      form.append('measurement_type', this.templateSrv.replace(type, null, 'regex'));

      let request = {
          data: form,
          headers: {'Content-Type' : 'multipart/form-data'},
          method: 'POST',
          url: `${this.tsdsURL}metadata.cgi`
      };

      if (this.basicAuth || this.withCredentials) {
        request.withCredentials = true;
      }

      if (this.basicAuth) {
        request.headers.Authorization = self.basicAuth;
      }

      return this.backendSrv.datasourceRequest(request)
        .then((response) => {
          return response.data.results.map((x) => { return {text: x.name, value: x.name}; });
        });
    }

    /**
     * getMetaFieldValues passes a list of metadata field values to
     * callback.
     *
     * @param {string} type - A measurement structure type
     * @param {Object[]} where - An array of where clause groups
     * @param {integer} groupIndex - Index of selected where clause group
     * @param {integer} index - Index of selected where clause
     * @param {function} callback - Success callback for query results
     */
    getMetaFieldValues(type, where, groupIndex, index, callback) {
      let form = new FormData();
      form.append('method', 'get_meta_field_values');
      form.append('measurement_type', this.templateSrv.replace(type, null, 'regex'));
      form.append('limit', 1000);
      form.append('offset', 0);

      if (where[groupIndex].length >1) {
        let whereList = where[groupIndex];
        let meta_field = "";
        let like_field = "";
        let parent_meta_field = "";
        let parent_meta_field_value = "";

        for(var i = 0; i < whereList.length; i++){
          if (i != index && typeof whereList[i] != 'undefined') {
            meta_field = whereList[index].left;
            meta_field = this.templateSrv.replace(meta_field, null, 'regex');

            like_field = whereList[index].right;
            like_field = this.templateSrv.replace(like_field, null, 'regex');

            parent_meta_field = whereList[i].left;
            parent_meta_field = this.templateSrv.replace(parent_meta_field, null, 'regex');

            parent_meta_field_value = whereList[i].right;
            parent_meta_field_value = this.templateSrv.replace(parent_meta_field_value, null, 'regex');
            break;
          }
        }

        form.append('meta_field', meta_field);

        let like_field_name = `${meta_field}_like`;
        form.append(like_field_name, like_field);

        form.append('parent_meta_field', parent_meta_field);
        form.append('parent_meta_field_value', parent_meta_field_value);
      } else {
        let meta_field = where[groupIndex][index].left;
        meta_field = this.templateSrv.replace(meta_field, null, 'regex');

        let like_field = where[groupIndex][index].right;
        like_field = this.templateSrv.replace(like_field, null, 'regex');

        form.append('meta_field', meta_field);

        let like_field_name = `${meta_field}_like`;
        form.append(like_field_name, like_field);
      }

      var payload = {
        data: form,
        headers: { 'Content-Type': 'multipart/form-data' },
        method: 'POST',
        url: `${this.tsdsURL}metadata.cgi`
      };

      if (this.basicAuth || this.withCredentials) {
        payload.withCredentials = true;
      }

      if (this.basicAuth) {
        payload.headers.Authorization = self.basicAuth;
      }

      return this.backendSrv.datasourceRequest(payload)
        .then((response) => {
          let data = response.data.results.map((x) => { return x.value; });
          return callback(data);
        });
    }

    mapToTextValue(result) {
        let isTestData = _.isArray(result.data) || typeof result.data.data === 'undefined';
        let data = result.data;

        if (!isTestData) {
            if (result.data.error) {
                return [];
            }

            data = result.data.data;
        }

        var a =  _.map(data, (d, i) => {
            if (d && d.text && d.value) {
                return { text: d.text, value: d.value };
            } else if (_.isObject(d)) {
                return { text: d, value: i};
            }
            return { text: d, value: d };
        });
        return a;
    }

    mapToArray(result){
        if (result.data.length == 0) {
            result.data = ["No results found"];
        }
        return result.data;
    }

    mapToListValue(result) {
        this.metricValue = result.data;
    }

    /**
     * buildQueryParameters generates a TSDS database query for each
     * Grafana target. For each new panel, there is one Grafana target
     * by default.
     */
    buildQueryParameters(options, t) {

      // Returns each template variable and its selected value has a
      // hash. i.e. {'metric':'average', 'example':
      // 'another_metric'}. getVariableDetails excludes any adhoc
      // variables from the the result.
      function getVariableDetails(){
        let varDetails = {};
        t.templateSrv.variables.forEach(function(item){
          if (item.type !== 'adhoc') {
            varDetails[item.name] = item.current.value;
          }
        });
        return varDetails;
      }

      // Builds the aggregation statement for a TSDS query from
      // target.func.
      function TSDSQuery(func, parentQuery) {
        let query = '';
        let query_list = [];
        if (func.type === 'Singleton') {
          if (func.title === 'Extrapolate') {
            let endpoint = Date.parse(options.range.to) / 1000;
            query = `extrapolate(${parentQuery}, ${endpoint})`;
          } else {
            query = `${func.title.toLowerCase()}(${parentQuery})`;
          }
        } else if (func.type === 'Percentile') {
          let percentile = func.percentile || 85;
          query = `percentile(${parentQuery}, ${percentile})`;
        } else {
          let bucket = func.bucket || '$quantify';
          let method = func.method || 'average';
          let target = func.target || 'input';
          let templates = getVariableDetails();
          let targets = templates[func.target.replace('$','')]; // array of targets; 
          if (method == 'percentile') {
            method = `percentile(${func.percentile})`;
          } else if (method == 'template') {
            let template_variables = getVariableDetails();
            method = template_variables[func.template.replace('$', '')];
          }
          if(targets) {
            if(func.wrapper.length === 0) {  
              query_list = targets.map(target => {
                query = `aggregate(values.${target}, ${bucket}, ${method})`;
                return query;
              });
              if(query_list.length>0) {
                query = query_list.map(q => q).join(', ');
              }
            } else {
              return targets.map(target => TSDSQuery(func.wrapper[0], `aggregate(values.${target},${bucket}, ${method})`)).join(', ');      
            }
          } else{
	      query = `aggregate(values.${target}, ${bucket}, ${method})`;
          }
        }
	
        if (func.wrapper.length === 0) {
          return query;
        }
        return TSDSQuery(func.wrapper[0], query);
      }

      var queries = options.targets.map(function(target) {
        return new Promise((resolve, reject) => {
          if (typeof(target) === "string"){
            return resolve({
              target: target,
              targetAliases: target.metricValueAliasMappings,
              targetBuckets: target.bucket,
              refId: target.refId,
              hide: target.hide,
              type: target.type || 'timeserie',
              alias : target.target_alias
            });
          }

          if (target.rawQuery) {
            let query = t.templateSrv.replace(target.target, options.scopedVars);
            let oldQ = query.substr(query.indexOf("{"), query.length);
            let formatQ = oldQ.replace(/,/gi, " or ");
            query = query.replace(oldQ, formatQ);

            return resolve({
              target: query,
              targetAliases: target.metricValueAliasMappings,
              targetBuckets: target.bucket,
              refId: target.refId,
              hide: target.hide,
              type: target.type || 'timeserie',
              alias : target.target_alias
            });
          }

          target.metricValueAliasMappings = {};

          let query = 'get ';

          target.metric_array.forEach((metric) => {
            query += `${metric}, `;
          });

          let start = Date.parse(options.range.from) / 1000;
          let end   = Date.parse(options.range.to) / 1000;
          let duration = (end - start);

          let functions = target.func.map((f) => {
            let aggregation = TSDSQuery(f);
            let template_variables = getVariableDetails();
            let defaultBucket = duration / options.maxDataPoints;
            let size = (f.bucket === '') ? defaultBucket : parseInt(f.bucket);

            if (duration >= 7776000) {
              size = Math.max(86400, size);
            } else if (duration >= 259200) {
              size = Math.max(3600, size);
            } else {
              size = Math.max(60, size);
            }

            aggregation = aggregation.replace(/\$quantify/g, size.toString());
            let alias_value = template_variables[f.alias.replace('$', '')] ? template_variables[f.alias.replace('$', '')] : f.alias;
            target.metricValueAliasMappings[aggregation] = alias_value;

            return aggregation;
          }).join(', ');

          query += `${functions} between (${start}, ${end}) `;

          if (target.groupby_field) query += `by ${target.groupby_field} `;

          query += `from ${target.series} where `;

          target.whereClauseGroup.forEach((whereClauseGroup, groupIndex) => {
            if (groupIndex > 0) query += ` ${target.outerGroupOperator[groupIndex]} `;
            query += '(';

            let groupOperators = target.inlineGroupOperator[groupIndex];
            let whereClauses   = target.whereClauseGroup[groupIndex];

            whereClauses.forEach((clause, clauseIndex) => {
              if (clauseIndex > 0) query += ` ${groupOperators[clauseIndex]} `;
              query += `${clause.left}${clause.op}"${clause.right}"`;
            });

            query += ')';
          });

          let filters = [];
          if (typeof t.templateSrv.getAdhocFilters !== 'undefined') {
            filters = t.templateSrv.getAdhocFilters(t.name);
          }

          // Generate adhoc query components. Use Promise.all to wait
          // for all components to resolve then join each with the
          // 'and' operator and append to the final query.
          let filterQueryGenerators = filters.map(this.getAdhocQueryString.bind(this));

          return Promise.all(filterQueryGenerators).then((filterQueries) => {
            let adhocQuery = filterQueries.join(', ');
            if (adhocQuery !== '') query += ` and (${adhocQuery}) `;

            if (target.orderby_field) query += `ordered by ${target.orderby_field}`;

            query = t.templateSrv.replace(query, options.scopedVars);
            var oldQ = query.substr(query.indexOf("{"), query.length);
            var formatQ = oldQ.replace(/,/gi, " or ");
            query = query.replace(oldQ, formatQ);
            target.target = query;

            // Log final query for debugging.
            console.log(query);

            return resolve({
              target: query,
              targetAliases: target.metricValueAliasMappings,
              targetBuckets: target.bucket,
              refId: target.refId,
              hide: target.hide,
              type: target.type || 'timeserie',
              alias : target.target_alias
            });
          });

        }).catch((e) => {
          console.log(e);
        });
      }.bind(this));

      return Promise.all(queries).then((targets) => {
        options.targets = targets;
        return Promise.resolve(options);
      });
    }
}

export {GenericDatasource};
