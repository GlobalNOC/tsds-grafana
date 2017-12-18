import _ from "lodash";
import {ResponseHandler} from './response_handler';

export class GenericDatasource {
    /**
     * Create a GenericDatasource
     *
     * @param {Object} instanceSettings
     * @param {Object} $q
     * @param {Object} backendSrv
     * @param {Object} templateSrv
     */
    constructor(instanceSettings, $q, backendSrv, templateSrv) {
        this.type = instanceSettings.type;
        this.url = instanceSettings.url;
        this.name = instanceSettings.name;
        console.log("Name: ", this.name);
        this.q = $q;
        this.basicAuth = instanceSettings.basicAuth;
        this.withCredentials = instanceSettings.withCredentials;
        this.backendSrv = backendSrv;
        this.templateSrv = templateSrv;
        this.variables = this.templateSrv.variables;
        console.log("Template Variables: ", this.variables);
        this.selectMenu = ['=','>','<'];
        this.metricValue = this.metricValue||[];
        this.metricColumn =this.metricColumn||[];
        this.whereSuggest =[];
    }

    query(options) {
        var query = this.buildQueryParameters(options, this);
        query.targets = query.targets.filter(t => !t.hide);
        if (query.targets.length <= 0) {
            return this.q.when({data: []});
        }

        var ops = {
            url: this.url + '/query',
            data:query,
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        };

        return this.post(query.targets, ops).then(function(response){
            // post resolved, check for errors in the response.
            return new ResponseHandler(query.targets, response.data).getData();
        });
    }

    // Makes a datasourceRequest and handle errors
    // Resolves to check errors in response
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

    testDatasource() {
        var options = {
            url: this.url + '/test',
            method: 'GET'
        };

        if (this.basicAuth || this.withCredentials) {
            options.withCredentials = true;
        }
        if (this.basicAuth) {
            options.headers.Authorization = self.basicAuth;
        }

        return this.backendSrv.datasourceRequest(options).then(response => {
            if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
            }

        return { error: "Data source isn't working" };
        });
    }

    // getMeasurementType returns the TSDS measurement type to use when
    // looking up measurement type values and metadata. The result of
    // this function defaults to 'interface', but may be overridden by
    // defining the name of an adhoc template variable. If multiple
    // adhoc template variables are defined the name of the first is
    // used.
    getMeasurementType() {
        var target = 'interface';
        if (typeof this.templateSrv.variables !== 'undefined') {
            var adhocVariables = this.templateSrv.variables.filter(filter => filter.type === 'adhoc');
            console.log("adhocVariables: ",adhocVariables[0]);
            target = adhocVariables[0].name;
        }
        return target;
    }

    // getParentMetaFields returns the parent meta fields of fieldName
    // as an array. getParentMetaFields should only return adhoc filters
    // defined to the left of fieldName, and all other template
    // variables.
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

        return this.backendSrv.datasourceRequest(payload).then(this.mapToTextValue);
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

    metricFindQuery(options) {
        var target = typeof (options) === "string" ? options : options.target;
        var interpolated = {
            target: this.templateSrv.replace(target, null, 'regex'),
            type:"Search"
        };

        // Nested template variables are escaped, which tsds doesn't
        // expect. Remove any `\` characters from the template variable
        // query to craft a valid tsds query.
        if (interpolated.target) {
            interpolated.target = interpolated.target.replace(/\\/g, "");
        }

        // By default the dashboard's selected time range is not passed
        // to metricFindQuery.
        if (typeof angular !== 'undefined') {
            interpolated.range = angular.element('grafana-app').injector().get('timeSrv').timeRange();
        }

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
        return this.backendSrv.datasourceRequest(payload).then(this.mapToTextValue);
    }

    findWhereFields(options, parentIndex, index, callback) {
        var target = typeof (options) === "string" ? options : options.series;

        if(options.whereClauseGroup[parentIndex].length >1){
            var whereList = options.whereClauseGroup[parentIndex];
            var flag = true;
            var meta_field = "";
            var like_field = "";
            var parent_meta_field ="";
            var parent_meta_field_value="";
            for(var i = 0; i<whereList.length && flag; i++){
                if(i != index && typeof whereList[i] != 'undefined'){
                    meta_field = whereList[index].left;
                    like_field = whereList[index].right;

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
                type:"Where_Related"
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

            return this.backendSrv.datasourceRequest(payload).then(this.mapToArray).then((resp) => callback(resp.data));
        }
        else {
            var meta_field = options.whereClauseGroup[parentIndex][index].left;
            var like_field = options.whereClauseGroup[parentIndex][index].right;
            var interpolated = {
                target: this.templateSrv.replace(target, null, 'regex'),
                meta_field: this.templateSrv.replace(meta_field, null, 'regex'),
                like_field: this.templateSrv.replace(like_field, null, 'regex'),
                type:"Where"
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

            return this.backendSrv.datasourceRequest(payload).then(this.mapToArray).then((resp) => callback(resp.data));
        }
    }

    generateDashboard(options, timeFrom, timeTo, DB_title, datasource, type) {
        var target = typeof (options) === "string" ? options : options.target;
        var interpolated = {
            query: this.templateSrv.replace(target, null, 'regex'),
            drill : options.drillDownValue,
            timeFrom : timeFrom,
            timeTo: timeTo,
            DB_title : DB_title,
            Data_source : datasource,
            alias: options.drillDownAlias,
            graph_type : type
        };

        var payload = {
            url: this.url + '/dashboard',
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

        return this.backendSrv.datasourceRequest(payload).then(function(){

        });
    }

    findOperator(){
        return  new Promise(function(resolve, reject) {
            var a = {"data":['=','<','>'], "status":200, "statusText":"OK"};
            resolve(a);
        }).then(this.mapToTextValue);
    }

    mapToTextValue(result) {
        let isTestData = _.isArray(result.data) || typeof result.data.data === 'undefined';
        let data = result.data;

        if (!isTestData) {
            if (result.data.error) {
                console.log(result.data.error);
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
        console.log(this.metricValue);
    }

    targetContainsTemplate(target) {
        return templateSrv.variableExists(target.target);
    }

    buildQueryParameters(options, t) {

      // returns template variables and its selected value i.e. {'metric':'average', 'example': 'another_metric'}
      function getVariableDetails(){
        let varDetails = {};
        t.templateSrv.variables.forEach(function(item){
          if (item.type !== 'adhoc') {
            varDetails[item.name] = item.current.value;
          }
        });
        return varDetails;
      }

      function getAdhocFilters() {
        if (typeof t.templateSrv.getAdhocFilters === 'undefined') {
          return '';
        }

        // [{ key: "intf", operator: "=", value: "xe-0/2/0.433" }]
        var filters = t.templateSrv.getAdhocFilters(t.name);
        if (filters.length === 0) {
          return '';
        }
        var whereComps = filters.map(function(filter) {
          return `${filter.key}${filter.operator}"${filter.value}"`;
        });

        return whereComps.join(' and ');
      }

      // Builds a TSDS query string from target.func
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
            console.log(template_variables);
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

      var scopevar = options.scopedVars;
      var query = _.map(options.targets, function(target) {

        // Returns target when not formated as a tsds query
        // object.
        if (typeof(target) === "string") { return target; }

        if (target.rawQuery) {
          var query = t.templateSrv.replace(target.target, scopevar);
          var oldQ = query.substr(query.indexOf("{"), query.length);
          var formatQ = oldQ.replace(/,/gi, " or ");
          query = query.replace(oldQ, formatQ);
          return query;
        } else {

          var query = 'get ';
          var seriesName = target.series;

          for (var index = 0 ; index < target.metric_array.length; index++) {
            query+= ' '+target.metric_array[index];
            if (index + 1 == target.metric_array.length) {
              break;
            }
            query+=',';
          }
          target.metricValueAliasMappings = {};
          
          let functions = target.func.map((f) => {
              let aggregation = TSDSQuery(f);
              let start = Date.parse(options.range.from);
              let end   = Date.parse(options.range.to);
              let duration = (end - start) / 1000;
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

          query += ', ' + functions;
          query += ' between ($START,$END)';

          if (target.groupby_field) {
            query += ' by ' + target.groupby_field;
          }

          query += ' from ' + seriesName;
          query += " where ";

          for(var i=0; i<target.whereClauseGroup.length; i++) {
            if(i>0) query +=" "+ target.outerGroupOperator[i]+" ";
            query +=" ( ";
            for(var j =0 ; j<target.whereClauseGroup[i].length; j++){
              if(j>0) query = query +" "+target.inlineGroupOperator[i][j]+" ";
              query += target.whereClauseGroup[i][j].left+" "+target.whereClauseGroup[i][j].op+" \""+target.whereClauseGroup[i][j].right+"\"";
            }

            var adhocFilters = getAdhocFilters();
            //console.log("Adhoc Filters: ",adhocFilters);
            if (adhocFilters === '') {
              query +=" )";
            } else {
              query +=" and " + adhocFilters + " )";
            }
          }

          if(target.orderby_field){
            query+= ' ordered by '+target.orderby_field;
          }

          query = t.templateSrv.replace(query, scopevar);
          var oldQ = query.substr(query.indexOf("{"), query.length);
          var formatQ = oldQ.replace(/,/gi, " or ");
          query = query.replace(oldQ, formatQ);
          target.target = query;
          return query;
        }
      }.bind(scopevar));

      var index = 0;
      var targets = _.map(options.targets, target => {
        return {
          target: query[index++],
          targetAliases: target.metricValueAliasMappings,
          targetBuckets: target.bucket,
          refId: target.refId,
          hide: target.hide,
          type: target.type || 'timeserie',
          alias : target.target_alias
        };
      });

      options.targets = targets;
      return options;
    }
}
