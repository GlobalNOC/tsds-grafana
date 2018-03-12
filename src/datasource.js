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
    }

    /**
     * query sends a query request to TSDS based on the visual or raw
     * query builder. This is a special Grafana method specifically
     * for Datasource plugins.
     *
     * <p>Throws an object on error.
     * <pre><code>
     *   { message: 'Error string for the user.', data: response_object };
     * </code></pre>
     *
     */
    query(options) {
      //this.templateSearch();
      return this.buildQueryParameters(options, this).then((query) => {
        query.targets = query.targets.filter(t => !t.hide);
        if (query.targets.length <= 0) { return this.q.when({data: []}); }

        // Section for testing
        if (typeof angular === 'undefined') {
          var ops = {
            url: this.url + '/query',
            data:query,
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
          };

          return this.backendSrv.datasourceRequest(ops).then(function(results) {
            results.data.config = results.config;
            return new ResponseHandler(query.targets, results.data).getData();
          }).catch(error => {
            if(error.data && error.data.error){
              /***** Example throw error for the Grafana inspector to catch *****/
              // throw { message: 'TSDS Query Error: ' + err.data[0]['Error Text'] }
              throw new ResponseHandler(query.targets, error).getErrorInfo({}, error);
            }

            throw error;
          });
        }

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
              url: `${this.url}/query.cgi`
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

              if (typeof response.data.error !== 'undefined') {
                reject(response);
              }

              response.data.results.forEach((result) => {

                // TSDS modifies the target expression of extrapolate
                // functions on return, such that a request like
                // 'extrapolate(..., 1526705726)' will return with a
                // key of 'extrapolate(..., Date(1526705726))'; This
                // breaks our alias mappings. Ensure the key from TSDS
                // no longer includes the Date method.
                for (let key in result) {
                  if (key.indexOf('extrapolate') !== -1) {
                    let newkey = key.replace(/Date\(\d+\)/g, function(x) {
                      return x.match(/\d+/);
                    });
                    result[newkey] = result[key];
                    delete result[key];
                  }
                }

                let targetObjects = this.getTargetNames(result, template, aliases);
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
                    targetObject['datapoints'] = [[datapoints, end * 1000]];
                  }

                  output.push(targetObject);
                });
              });
              resolve(output);
            });
          });
        });

        return Promise.all(requests).then(responses => {
          console.log(output);

          if (typeof options.targets[0].displayFormat === 'undefined' || options.targets[0].displayFormat === 'series') {
            console.log('Formating result as a series.');
            return {data: output};
          }

          let table       = {columns: [{text: 'target', type: 'text', sort: true, desc: true}], rows: [], type: 'table'};
          let dateOptions = {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short'};

          let datasetsAtTimestamp = {};
          output.forEach((dataset, i) => {
            table.rows.push([dataset.target]);

            dataset.datapoints.forEach((datapoint, j) => {
              let milliseconds = datapoint[1];
              if (typeof datasetsAtTimestamp[milliseconds] === 'undefined') {
                datasetsAtTimestamp[milliseconds] = Array(output.length).fill('-');
              }

              datasetsAtTimestamp[milliseconds][i] = datapoint;
            });
          });

          Object.keys(datasetsAtTimestamp).sort().reverse().forEach(milliseconds => {
            let datapoints = datasetsAtTimestamp[milliseconds];
            let dateStr    = new Date(parseInt(milliseconds));

            table.columns.push({text: dateStr.toLocaleDateString("en-US", dateOptions), type: 'text'});

            for (let i = 0; i < datapoints.length; i++) {
              table.rows[i].push(datapoints[i][0]);
            }
          });

          console.log('Formating result as a table.');
          return {
            data: [table]
          };
        }).catch(error => {
          console.log(error);
          throw {message: error.data.error_text, data: error};
        });
      });
    }

    // function that takes a string and tokenizes on a delimiter[" ", ":", ";"]
    tokenizeString(str_literal, delimiter){
        return str_literal.split(delimiter);
    }

    getHumanTime(seconds) {
        if (seconds >= 86400) {
            let count = seconds/86400;
            if (count % 1 !== 0) { count = count.toFixed(1); }
            return `${count}d`;
        }

        if (seconds >= 3600) {
            let count = seconds/3600;
            if (count % 1 !== 0) { count = count.toFixed(1); }
            return `${count}h`;
        }

        if (seconds >= 120) {
            let count = seconds/60;
            if (count % 1 !== 0) { count = count.toFixed(1); }
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
        if (aggregation === 'max') { aggregation = 'maxe'; }
        name = `${measurement} (${humanTime} ${aggregation}s)`;
      }

      let targetNames = [];
      if (template !== null) {
       for (let i = 0; i < template.length; i++) {
         if (template[i].charAt(0) !== '$') {
           targetNames.push(template[i]);
           continue;
         }

         let alias = template[i].replace('$', '');
         if (result.hasOwnProperty(alias)) {
           targetNames.push(result[alias]);
         } else if (alias === 'VALUE') {
           targetNames.push(name);
         }
       }
      } else {
        targetNames.push(name);
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
          url: `${this.url}/metadata.cgi`
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
        
        if(element.type !== 'query') return;

        fields.push({
            key:   element.query.split(' ')[1],
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

    /**
     * getTagKeys returns an array of TSDS meta fields that can be
     * used to filter datasets returned by a query. This is a special
     * Grafana method specifically for adhoc filters.
     *
     * @param {Object} options - An unused parameter
     */
    getTagKeys(options) {
        let form = new FormData();
        form.append('method', 'get_meta_fields');
        form.append('measurement_type', this.templateSrv.replace(this.getMeasurementType(), null, 'regex'));
        const payload = {
            url: `${this.url}/metadata.cgi`,
            data: form,
            method: 'POST',
            headers: { 'Content-Type': 'multipart/form-data' }
        };

        if (this.basicAuth || this.withCredentials) {
            payload.withCredentials = true;
        }
        if (this.basicAuth) {
            payload.headers.Authorization = self.basicAuth;
        }

         return this.backendSrv.datasourceRequest(payload).then((result) => {
            result.data.error = null;
            let output = [];
            _.forEach(result.data.results, function(eachDict) {
                if("fields" in eachDict) {
                    _.forEach(eachDict.fields, function(field) {
                        output.push(eachDict.name+"."+field.name); 
                    });
                } else {
                    output.push(eachDict.name);
                }
            });
            result.data.data = output;
            let metTypes = result.data.data.map((x) => { return {text: x, value: x}; });
            // Adding * option for generic search
            metTypes.splice(0, 0, {text: "*", value: "*"});
            return metTypes;
        });
    }

    /**
     * getTagValues returns an array of TSDS meta field values that
     * can be used to filter datasets returned by a query. This is a
     * special Grafana method specifically for adhoc filters.
     *
     * @param {Object} options - An Object containing a single parameter named key
     */
    getTagValues(options) {
        if(options.key === "*") {
            return Promise.resolve("No autocomplete for *");
        }
        var like = '';
        if (typeof this.templateSrv.getAdhocFilters !== 'undefined') {
            // TODO Update like field as user types
            // console.log(this.templateSrv.getAdhocFilters(this.name));
        }
        let form = new FormData();
        form.append('method', 'get_distinct_meta_field_values');
        form.append('measurement_type', this.templateSrv.replace(this.getMeasurementType(), null, 'regex'));
        let parent_meta_fields = this.getParentMetaFields(options.key);
        let that = this;
        _.forEach(parent_meta_fields, function(parent_meta) {
            form.append(`${parent_meta.key}_like`, parent_meta.value);
        });
        form.append('meta_field',options.key);
        form.append(`${options.key}_like`, like);
        form.append('limit',1000);
        form.append('offset',0);  
        
        const payload = {
            url: `${this.url}/metadata.cgi`,
            data: form,
            method: 'POST',
            headers: { 'Content-Type': 'multipart/form-data' }
        }; 

        if (this.basicAuth || this.withCredentials) {
            payload.withCredentials = true;
        }
        if (this.basicAuth) {
            payload.headers.Authorization = self.basicAuth;
        }

        return this.backendSrv.datasourceRequest(payload).then((result) => {
            result.data.error = null;
            let output = [];
            _.forEach(result.data.results, function(dict){
                output.push(dict.value);
            });
            result.data.data = output;
            return result.data.data.map(x => { return {text: x, value: x}; });;
        });
    }

    // function that takes fields and tokens to craft the where clause for "Template Search functionality"
    buildWhere(fields, tokens){
        let where = [];
        // where  (field = value or field = value)
        
        _.forEach(tokens, function(tkn){
            let partials = [];
            _.forEach(fields, function(field){
                partials.push(field+' like '+'"'+tkn+'"');
            });
            let partial_clause = `(${partials.join(" or ")})`;
            where.push(partial_clause);
        });
        return where;
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

        if (typeof angular === 'undefined') {
            let request = {
                headers: {'Content-Type' : 'multipart/form-data'},
                method: 'POST',
                data: { method: 'query', query: target },
                url: `${this.url}/query.cgi`
            };

            return this.backendSrv.datasourceRequest(request).then((response) => {
                return response.data.map((x) => { return {text: x, value: x}; });
            });
        }

        let queryObject = null;

        try {
            queryObject = JSON.parse(target);
        }
        catch (error) {
            queryObject = {query: target, type: 'query'};
            // throw {message: error.message};
        }

        if (typeof queryObject.type === 'undefined') {
            throw {message: 'Required query type was not specified.'};
        }

        let validTypes = ['query', 'values', 'search'];
        if (!validTypes.includes(queryObject.type)) {
            throw {message: 'Invalid query type was specified.'};
        }

        if (queryObject.type === 'values') {
            let form = new FormData();
            form.append('method', 'get_measurement_type_values');
            form.append('measurement_type', queryObject.measurement_type);

            let request = {
            data: form,
            headers: {'Content-Type' : 'multipart/form-data'},
            method: 'POST',
            url: `${this.url}/metadata.cgi`
            };

            if (this.basicAuth || this.withCredentials) {
                request.withCredentials = true;
            }

            if (this.basicAuth) {
                request.headers.Authorization = self.basicAuth;
            }

            return this.backendSrv.datasourceRequest(request).then((response) => {
                return response.data.results.map(x => { return {text: x.description, value: x.name}; });
            });
        }

        if (queryObject.type === 'search'){
            console.log("I'm a search query"); 
            // build the search query here. 
            if(queryObject.get === undefined || queryObject.get.length<1){
                throw {message: "Required get field was not specified."}
            }
            const get_fields = queryObject.get.join(",");
            var query = `get ${get_fields} between ($START, $END)`;
            if ("by" in queryObject){
                query+=` by ${queryObject.by}`; 
            }else {
                throw {message: "Required by field was not specified."};
            }
            if ("from" in queryObject){
                query+=` from ${queryObject.from}`;
            }else {
                throw {message: "Required from field was not specified."}
            }
            let search_variable;
            if("search" in queryObject){
                let s_name=queryObject.search.replace("$","");
                search_variable = this.templateSrv.variables.filter(x => x.name === s_name);
                if(search_variable) {
                    search_variable = search_variable[0];
                }
            }else {
                throw {message: "Required search field was not specified."}
            }
            let tokens = this.tokenizeString(search_variable.current.value, " ");
            if("fields" in queryObject){
                let where = this.buildWhere(queryObject.fields, tokens);
                let where_clause = ` where ${where.join(" and ")}`;
                query+=where_clause;
                console.log("search_query:",query);
            }else {
                throw {message: "Required fields not specified."}
            }
            if("limit" in queryObject){
                query+=` limit ${queryObject.limit} offset 0`;
            } else {
                query+=` limit 50 offset 0`;
            }
            if("order_by" in queryObject){
                query+=` orederd by ${queryObject.order_by}`;
            } 
            queryObject.query = query;
        }
        target = queryObject.query;

        // By default the dashboard's selected time range is not passed
        // to metricFindQuery. Use the angular object to retrieve it.
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
        url: `${this.url}/query.cgi`
        };

        if (this.basicAuth || this.withCredentials) {
            request.withCredentials = true;
        }

        if (this.basicAuth) {
            request.headers.Authorization = self.basicAuth;
        }

        return this.backendSrv.datasourceRequest(request).then((response) => {
            console.log(response);
            if(response.data.error){
                throw {message: response.data.error_text};
            }
            let dataType = target.split(' ')[1];
            let data = response.data.results.map((x) => {
                let t = queryObject.text;
                let v = queryObject.value;

                if (typeof queryObject.value !== 'undefined') {
                    Object.keys(x).forEach(key => {
                        v = v.replace(`{{${key}}}`, x[key]);
                    });

                    Object.keys(x).forEach(key => {
                        t = t.replace(`{{${key}}}`, x[key]);
                    });

                    return {text: t, value: v};
                }

                return {text: x[dataType], value: x[dataType]};
            });

            return data;
        });
    }

    /**
     * getMeasurementTypes returns a list of measurement types that
     * may be queried from TSDS. These types can be described as a
     * database table or data structure composing some types of
     * measurement datasets.
     */
    getMeasurementTypes() {
      let form = new FormData();
      form.append('method', 'get_measurement_types');

      let request = {
        data: form,
        headers: {'Content-Type' : 'multipart/form-data'},
        method: 'POST',
        url: `${this.url}/metadata.cgi`
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
     * getMeasurementTypeValues returns a list of values that may be
     * graphed. These values are the values grouped under measurement
     * type measurementType; For example, a measurement type of
     * interface will contain values including input and output.
     *
     * @param {string} type - The measurement type to query
     */
    getMeasurementTypeValues(type) {
      let form = new FormData();
      form.append('method', 'get_measurement_type_values');
      form.append('measurement_type', type);

      let request = {
        data: form,
        headers: {'Content-Type' : 'multipart/form-data'},
        method: 'POST',
        url: `${this.url}/metadata.cgi`
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
     * getMetaFields returns a list of metadata fields that can be
     * used to filter datasets of the specified type.
     *
     * @param {string} type - The measurement type to query
     */
    getMetaFields(type) {
      let form = new FormData();
      form.append('method', 'get_meta_fields');
      form.append('measurement_type', this.templateSrv.replace(type, null, 'regex'));

      let request = {
          data: form,
          headers: {'Content-Type' : 'multipart/form-data'},
          method: 'POST',
          url: `${this.url}/metadata.cgi`
      };

      if (this.basicAuth || this.withCredentials) {
        request.withCredentials = true;
      }

      if (this.basicAuth) {
        request.headers.Authorization = self.basicAuth;
      }

      return this.backendSrv.datasourceRequest(request).then((response) => {
          let fields = [];

          response.data.results.forEach((metafield) => {
            if (metafield.hasOwnProperty('fields')) {
              metafield.fields.forEach((field) => {
                let result = `${metafield.name}.${field.name}`;
                fields.push({text: result, value: result});
              });
            } else {
              fields.push({text: metafield.name, value: metafield.name});
            }
          });

          return fields;
      });
    }

    /**
     * getMetaFieldValues passes a list of metadata field values to
     * callback.
     *
     * @param {string} type - The measurement type to query
     * @param {Object[]} where - An array of where clause groups
     * @param {integer} groupIndex - Index of selected where clause group
     * @param {integer} index - Index of selected where clause
     * @param {function} callback - Success callback for query results
     */
    getMetaFieldValues(type, where, groupIndex, index, callback) {
      let form = new FormData();
      form.append('method', 'get_distinct_meta_field_values');
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
        url: `${this.url}/metadata.cgi`
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

          if (method == 'percentile') {
            method = `percentile(${func.percentile})`;
          } else if (method == 'template') {
            let template_variables = getVariableDetails();
            method = template_variables[func.template.replace('$', '')];
          }

          let targets = templates[func.target.replace('$','')]; // array of targets;
          if(targets) {
            if (!Array.isArray(targets)) { targets = [targets]; }

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
              alias :        target.target_alias,
              displayFormat: target.displayFormat,
              target:        target,
              targetAliases: target.metricValueAliasMappings,
              targetBuckets: target.bucket,
              refId:         target.refId,
              hide:          target.hide,
              type:          target.type || 'timeserie'
            });
          }

          target.metricValueAliasMappings = {};

          let start = Date.parse(options.range.from) / 1000;
          let end   = Date.parse(options.range.to) / 1000;
          let duration = (end - start);

          if (target.rawQuery) {
            let query = t.templateSrv.replace(target.target, options.scopedVars);
            let oldQ = query.substr(query.indexOf("{"), query.length);
            let formatQ = oldQ.replace(/,/gi, " or ");
            query = query.replace(oldQ, formatQ);

            let defaultBucket = duration / options.maxDataPoints;
            // get defaultBucket rounded to nearest 10 for pretty
            let size = Math.ceil(defaultBucket / 10) * 10;

            if (duration >= 7776000) {
              size = Math.max(86400, size);
            } else if (duration >= 259200) {
              size = Math.max(3600, size);
            } else {
              size = Math.max(60, size);
            }

            query = query.replace("$START", start.toString());
            query = query.replace("$END", end.toString());
            query = query.replace("$TIMESPAN", duration.toString());
            query = query.replace(/\$quantify/g, size.toString());
            query = this.templateSrv.replace(query, null, 'regex');

            return resolve({
              displayFormat: target.displayFormat,
              target: query,
              targetAliases: target.metricValueAliasMappings,
              targetBuckets: target.bucket,
              refId: target.refId,
              hide: target.hide,
              type: target.type || 'timeserie',
              alias : target.target_alias
            });
          }

          let query = 'get ';

          target.metric_array.forEach((metric) => {
            query += `${metric}, `;
          });

          let functions = target.func.map((f) => {
            let aggregation = TSDSQuery(f);
            let template_variables = getVariableDetails();
            let defaultBucket = duration / options.maxDataPoints;	      
            // get defaultBucket rounded to nearest 10 for pretty
            defaultBucket = Math.ceil(defaultBucket / 10) * 10;
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

              let whereArgument = clause.right;
              if (clause.right.indexOf('$') !== -1) {
                // Because templasteSrv.replace handles multi-values
                // strangely, we perform our own template variable
                // replacement here.
                let tvar  = clause.right.replace('$', '');
                // If all option is selected, explicitly include all the values in options irrespective of its selected property type. 
                if(t.templateSrv.index[tvar].current.text === "All"){
                    let allArguments = [];
                    t.templateSrv.index[tvar].options.forEach((value) => {
                        if(value.text !== "All") {
                                allArguments.push(value.value);
                        }
                    });
                    whereArgument = allArguments;
                }
                else{
                    whereArgument = t.templateSrv.index[tvar].current.value;
                }
                if (Array.isArray(whereArgument)) {
                  query += '(' + whereArgument.map(arg => `${clause.left} ${clause.op} "${arg}"`).join(' or ') + ')';
                } else {
                  query += `${clause.left} ${clause.op} "${whereArgument}"`;
                }
              } else {
                query += `${clause.left} ${clause.op} "${whereArgument}"`;
              }
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
            let adhocQuery = filterQueries.join(' and ');
            if (adhocQuery !== '') query += ` and (${adhocQuery}) `;

            if (target.orderby_field) query += `ordered by ${target.orderby_field}`;

            query = t.templateSrv.replace(query, options.scopedVars);

            var oldQ = query.substr(query.indexOf("{"), query.length);
            var formatQ = oldQ.replace(/,/gi, " or ");
            query = query.replace(oldQ, formatQ);
            target.target = query;

            // Log final query for debugging.
            // TODO
            console.log(options);
            console.log(target);
            console.log(query);

            return resolve({
              displayFormat: target.displayFormat,
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
