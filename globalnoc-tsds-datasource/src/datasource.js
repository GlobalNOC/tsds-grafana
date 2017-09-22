import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
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

    return this.backendSrv.datasourceRequest({
      url: this.url + '/query',
      data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
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
    });
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

    return  this.backendSrv.datasourceRequest(payload).then(this.mapToTextValue);
  }

  findMetric(options, metric) {
    var target = typeof (options) === "string" ? options : options.series;
    var interpolated = {
        target: this.templateSrv.replace(target, null, 'regex'),
	type:metric
    };
    console.log(interpolated);

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

  findWhereFields(options,parentIndex,index, like_field, callback){
	var target = typeof (options) === "string" ? options : options.series;
	if(options.whereClauseGroup[parentIndex].length >1){
		var whereList = options.whereClauseGroup[parentIndex];
		var flag = true;
		var meta_field = "";
		var parent_meta_field ="";
		var parent_meta_field_value="";
		for(var i = 0; i<whereList.length && flag; i++){
			if(i != index && typeof whereList[i] != 'undefined'){
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

	  return  this.backendSrv.datasourceRequest(payload).then(this.mapToArray).then(callback);
	}
	else {
		var meta_field = options.whereClauseGroup[parentIndex][index].left;
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

      return  this.backendSrv.datasourceRequest(payload).then(this.mapToArray).then(callback);
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
        var a =  _.map(result.data, (d, i) => {
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
        var scopevar = options.scopedVars;
	    var query = _.map(options.targets, function(target) {

            // Returns target when not formated as a tsds query
            // object.
            if (typeof(target) === "string") { return target; }

		    if(target.rawQuery){
			    var query = t.templateSrv.replace(target.target, scopevar);
			    var oldQ = query.substr(query.indexOf("{"), query.length);
			    var formatQ = oldQ.replace(/,/gi, " or ");

			    query = query.replace(oldQ, formatQ);
			    return query;
		    } else{
			    var query = 'get ';
			    var seriesName = target.series;

			    for(var index = 0 ; index < target.metric_array.length; index++){
				    query+= ' '+target.metric_array[index];
				    if ( index+1 == target.metric_array.length){
					    break;
				    }
				    query+=',';
			    }

                target.metricValueAliasMappings = {};
			    for (var index=0; index < target.metricValues_array.length; index++) {

                  var aggregation = 'aggregate(values.' + target.metricValues_array[index];
				  if (typeof target.bucketValue[index] === 'undefined' || target.bucketValue[index] ==='') aggregation += ', $quantify, ';
				  else aggregation += ', ' + target.bucketValue[index] + ', ';
				  if (target.aggregator[index] == "percentile") aggregation += target.aggregator[index]+'('+target.percentileValue[index]+'))';
				  else aggregation += target.aggregator[index]+')';

                  if (typeof target.metricValueAliases[index] === 'undefined' || target.metricValueAliases[index] === null) {
                    target.metricValueAliases[index] = '';
                  }
                  target.metricValueAliasMappings[aggregation.toString()] = target.metricValueAliases[index];

				  query+= ', ' + aggregation;
                }
			    query+= ' between ($START,$END)';
			    if (target.groupby_field != " ") {
                    query += ' by ' + target.groupby_field;
                }
        		query += ' from ' + seriesName;
				query += " where ";
				for(var i=0; i<target.whereClauseGroup.length; i++)
				{
					if(i>0) query +=" "+ target.outerGroupOperator[i]+" ";
					query +=" ( ";
					for(var j =0 ; j<target.whereClauseGroup[i].length; j++){
						if(j>0) query = query +" "+target.inlineGroupOperator[i][j]+" ";
                        query += target.whereClauseGroup[i][j].left+" "+target.whereClauseGroup[i][j].op+" \""+target.whereClauseGroup[i][j].right+"\"";
					}
					query +=" )";
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
