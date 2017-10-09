#!/usr/bin/python

# enable debugging
import string
import sys
import json
from urllib import urlencode
import os
from urllib2 import Request, urlopen, URLError, HTTPBasicAuthHandler, HTTPPasswordMgr, HTTPPasswordMgrWithDefaultRealm, build_opener, install_opener
import re
import datetime
from ast import literal_eval
from copy import deepcopy


location = None
username = None
password = None

def loadConfiguration(config_file):
        with open(config_file, 'r') as f:
                config = json.load(f)

        global location
        location = config['tsds_url']
        global username
        username = config['username']
        global password
        password = config['password']

def getUrl():
        return location

def atoi(text):
    return int(text) if text.isdigit() else text

def natural_keys(text):
    return [ atoi(c) for c in re.split('(\d+)', text) ]

def get_timeframe(seconds):
        if seconds >= 86400:
                # day
                return "{0}d".format(seconds / 86400)
        elif seconds >= 3600:
                # hour
                return "{0}h".format(seconds / 3600)
        elif seconds >= 60:
                # minute
                return "{0}m".format(seconds / 60)

        return "{0}s".format(seconds)

def is_metric(key):
        ''' Returns true if key is a metric
        '''

        if 'values.' in key:
                return False
        else:
                return True

def metric_label(tsds_result):
        ''' Builds a graph label based on a tsds result's metric values

        tsds_result tsds result containing datapoints and metric names
        '''
        keys = tsds_result.keys()
        keys.sort(key=natural_keys)

        return [tsds_result[key] for key in filter(lambda x: is_metric(x), keys)]

def findtarget_names(tsds_result, alias_list, datapoint_aliases):
        ''' Builds a list of datapoint set names and their graph label

        tsds_result tsds result containing datapoints and metric names
        alias_list List of template variables to be populated
        datapoint_aliases Hash of datapoint names to datapoint name aliases

        ex. aggregate(values.input, 300, average) => Input (5m averages)
        '''
        returnname = []

        for key, value in tsds_result.iteritems():
                # Ignores keys describing requested metrics
                if is_metric(key):
                        continue

                # ex. [u'sum', u'aggregate', u'values.output', u'300', u'average', u'', u'']
                datapoint_args = map(lambda x: x.strip(), re.split('[(,)]', key))
                name = None

                if key in datapoint_aliases and datapoint_aliases[key] != '':
                        # Use an alias if one was defined for this
                        # datapoints' name.
                        name = datapoint_aliases[key]
                elif datapoint_args[0] != 'aggregate':
                        # If the tsds query isn't a simple aggregate
                        # just return the datapoints name.
                        name = key
                elif 'percentile' in key:
                        _, measurement, seconds, aggregation, percentile, _, _ = datapoint_args
                        measurement = measurement.replace('values.', '')
                        measurement = string.capitalize(measurement)
                        timeframe = get_timeframe(int(seconds))
                        if aggregation.strip() == 'max': aggregation = 'maxe'

                        # Output (1h 90th percentiles)
                        name = "{0} ({1} {2}th {3}s)".format(measurement, timeframe, percentile, aggregation)
                else:
                        _, measurement, seconds, aggregation, _ = datapoint_args
                        measurement = measurement.replace('values.', '')
                        measurement = string.capitalize(measurement)
                        timeframe = get_timeframe(int(seconds))
                        if aggregation.strip() == 'max': aggregation = 'maxe'

                        # Output (58s averages)
                        name = "{0} ({1} {2}s)".format(measurement, timeframe, aggregation)

                targetname = [name]

                if alias_list:
                        # Look for $ sign in alias_list and replace it
                        # with its correpsonding value from results.
                        for alias in filter(lambda alias: '$' in alias, alias_list):
                                alias = alias.strip('$')
                                if alias in tsds_result:
                                        targetname.append(tsds_result[alias])
                                elif alias == 'VALUE':
                                        targetname.pop(0)
                                        targetname.append(name)
                else:
                        targetname = targetname + metric_label(tsds_result)


                # It's possible that some fields came back as null, in order to not
                # break the .join below cast them to empty string instead
                for i in range(len(targetname)):
                        if targetname[i] is None:
                                targetname[i] = ""
                        

                returnname.append({'name': key, 'target': " ".join(targetname)})

	return returnname

def match(key,targetname):
        return True if targetname.find(key[key.find("values")+7:key.find(",")])>-1 else False

#Reversing the datapoints received from tsds and converting time field into miliseconds (*1000)
def convert(innerValue):
        IV = [ list(reversed(element)) for element in innerValue]
        return [[element[0],element[1]*1000] for element in IV]

#Replace $START, $END, and $quantify variables in query with its corresponding value
def replaceQuery(query,start_time,end_time, duration, buckets):

        def bucket_size(size):
                if size == "": size = 0
                if duration >= 7776000:
                        size = max(86400, size)
                elif duration >= 259200:
                        size = max(3600, size)
                else:
                        size = max(60, size)
                return size

        while "$quantify" in query:
                query = query.replace("$quantify", str(bucket_size(buckets.pop(0))), 1)

        replace = {"$START":start_time,"$END":end_time, "{":" ", "}":" "}
        replace = dict((re.escape(key),value) for key, value in replace.iteritems())
        pattern = re.compile("|".join(replace.keys()))
        return pattern.sub(lambda m: replace[re.escape(m.group(0))], query)

#Convert time to UTC string
def extract_time(start_time,end_time):
	start_time = datetime.datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%S.%fZ")
        ostart = (start_time - datetime.datetime(1970, 1, 1)).total_seconds()
        start_time = str(start_time.strftime("%m-%d-%Y %H:%M:%S.%fZ")).replace("-","/") # Replace '-' with '/'
        start_time =  '"'+start_time[:start_time.index(".")]+' UTC"' # Adding quotes before and after

	end_time = datetime.datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%S.%fZ")
        oend = (end_time - datetime.datetime(1970, 1, 1)).total_seconds()
        end_time= str(end_time.strftime("%m-%d-%Y %H:%M:%S.%fZ")).replace("-","/") #Replace '-' with '/' 
        end_time =  '"'+end_time[:end_time.index(".")]+' UTC"' #Adding quotes before and after
	
        return (start_time, end_time, oend-ostart) 

def auth_Connection(url):
        passman = HTTPPasswordMgrWithDefaultRealm() # creating a password manager
        passman.add_password(None, url, username, password)
        authhandler = HTTPBasicAuthHandler(passman)
        opener = build_opener(authhandler)
        install_opener(opener)

def serialize(obj): #Serializing JSON output
	if not isinstance(obj, str):
		serial = str(obj)
		return serial
	return obj.__dict__


def make_TSDS_Request(url,postParam = None):
	auth_Connection(url)
	try:
		if not postParam:
			response = json.load(urlopen(Request(url)))
                        if response['results']==None:
                                raise Exception(response['error_text'])
                        else:
                                return response
		else:
			response = json.load(urlopen(Request(url,postParam)))
                        if response['results'] == None:
                                raise Exception(response['error_text'])
                        else:
                                return response
			
        except Exception as e:
		print 'Status: 412 Precondition failed'
		print 
		print json.dumps([{"Error Text":e}], default=serialize)
		exit(0)

def testDataSource():
	url = tsds_url+"query.cgi"
	json_result = make_TSDS_Request(url)
	if len(json_result) > 0:
        	print "Content-Type: application/json" # set the HTTP response header to json data
        	print "Cache-Control: no-cache\n"
        	print json.dumps(json_result) #HTTP response


def search():
	inpParameter = literal_eval(sys.stdin.read()) # reading the input data sent in POST method
	searchType = inpParameter['type']
	output=[]
	if searchType == "Column": # Searching for Columns
		url = getUrl()+"metadata.cgi?method=get_meta_fields;measurement_type="+inpParameter['target']
		json_result = make_TSDS_Request(url)
                for eachDict in json_result["results"]:
                        if "fields" in eachDict:
                                for field in eachDict["fields"]:
                                        output.append(eachDict["name"]+"."+field["name"])
                        else:
                                output.append(eachDict["name"])

	elif searchType == "Value": # Searching for Values
		url = getUrl()+"metadata.cgi?method=get_measurement_type_values;measurement_type="+inpParameter['target']
		json_result = make_TSDS_Request(url)	
		output = [eachDict["name"] for eachDict in json_result["results"] if "name" in eachDict]

	elif searchType == "Table": # Searching for Tables
		url = getUrl()+"metadata.cgi?method=get_measurement_types"
                json_result = make_TSDS_Request(url)    
                output = [eachDict["name"] for eachDict in json_result["results"] if "name" in eachDict]

	elif searchType == "Where": # Searching for where clause
		url = getUrl()+"metadata.cgi?method=get_meta_field_values;measurement_type="+inpParameter['target']+";meta_field="+inpParameter['meta_field']+";limit=100000;offset=0;"+inpParameter['meta_field']+"_like="+inpParameter['like_field']
		json_result = make_TSDS_Request(url)
		output = [eachDict["value"] for eachDict in json_result["results"]]

	elif searchType == "Where_Related": # Searching for dependent where clause
                url = ''

                if not 'parent_meta_fields' in inpParameter:
                        url = getUrl()+"metadata.cgi?method=get_meta_field_values;measurement_type="+inpParameter['target']+";meta_field="+inpParameter['meta_field']+";limit=100;offset=0;"+inpParameter['parent_meta_field']+"="+inpParameter['parent_meta_field_value']+";"+inpParameter['meta_field']+"_like="+str(inpParameter['like_field'])
                else:
                        parent_meta_field_kv_pairs = []
                        for field in inpParameter['parent_meta_fields']:
                                s = "{0}_like={1}".format(field['key'], field['value'])
                                parent_meta_field_kv_pairs.append(s)

                        # Becase adhoc filters do not support live
                        # filtering (re-query as you type), limit has
                        # been set to 10000; This should be large
                        # enough to cover most cases.
                        url = "{0}metadata.cgi?method=get_meta_field_values;measurement_type={1};meta_field={2};limit=10000;offset=0;{3}".format(
                                getUrl(),
                                inpParameter['target'],
                                inpParameter['meta_field'],
                                ';'.join(parent_meta_field_kv_pairs)
                        )

                json_result = make_TSDS_Request(url)
                output = [eachDict["value"] for eachDict in json_result["results"]]

	elif searchType == "Search": #Searching for template variables in Drill Down report

                if "range" in inpParameter:
                        value = inpParameter["range"]
                        start_time = value["from"]
                        end_time = value["to"]

                        time = extract_time(start_time, end_time)
                        start_time = time[0]
                        end_time = time[1]
                        time_duration = time[2]

                        inpParameter["target"] = replaceQuery(
                                inpParameter["target"],
                                start_time,
                                end_time,
                                time_duration,
                                []
                        )

		url = getUrl()+"query.cgi"
		postParameters = {"method":"query","query":inpParameter["target"]}

		json_result = make_TSDS_Request(url,urlencode(postParameters))
		for result in json_result["results"]:
                        # Because template variables can be used in
                        # query options for other template variables,
                        # we restrict the query to returning a single
                        # variable.
                        if len(result) > 1:
                                # TODO Error
                                print 'Status: 400 Bad Request'
                                print 
                                print json.dumps({"error": "Too many values requested."}, default=serialize)
                                exit(0)

			for key, value in result.iteritems():
                                output.append(value)

	print "Content-Type: application/json" # set the HTTP response header to json data
	print "Cache-Control: no-cache\n"
	print json.dumps(output) #HTTP response
		

def query():
        inpParameter = json.loads(sys.stdin.read())

        end_time   = ""
        start_time = ""
        max_data_points = 1
        output          = []
        target_aliases  = {}

        if 'range' in inpParameter:
                end_time   = inpParameter['range']['to']
                start_time = inpParameter['range']['from']

        if 'maxDataPoints' in inpParameter:
                max_data_points = inpParameter['maxDataPoints']

        target_start, target_end, target_duration = extract_time(start_time, end_time)

        for target in inpParameter['targets']:
                target_aliases       = target.get('targetAliases', {}) 
                target_name_template = target['alias'].split(' ') if target['alias'] != '' else None

                query = replaceQuery(
                        target['target'],
                        target_start,
                        target_end,
                        target_duration,
                        target.get('targetBuckets')
                )
                url = getUrl() + 'query.cgi'
                params = {
                        'method': 'query',
                        'query': query
                }

                res = make_TSDS_Request(url, urlencode(params))
                for result in res['results']:
                        # Generate target name for each datapoint set

                        target_results = findtarget_names(result, target_name_template, target_aliases)
                        for target_result in sorted(target_results, key=lambda x: x['target']):
                                datapoints = result[target_result['name']]
                                if isinstance(datapoints, list):
                                        # Format the data received
                                        # from tsds to grafana
                                        # compatible data.
                                        target_result['datapoints'] = convert(datapoints)
                                else:
                                        # It's possible that a user
                                        # may request something like
                                        # sum(aggregate(...)) which
                                        # will result in a single
                                        # datapoint being
                                        # returned. Grafana expects
                                        # all data in time series
                                        # format, so we must convert
                                        # before returning.
                                        target_result['datapoints'] = [[datapoints, target_end]]

                                output.append(target_result)

        print "Content-Type: application/json" # set the HTTP response header to json data
        print "Cache-Control: no-cache\n"
        print json.dumps(output)

def parseDrillDownQuery(query, drill_down_on, timeFrom, timeTo):
	q = "get "+drill_down_on+" "+ query[query.find('between'): query.find("by")]+" by "+ drill_down_on +" " + query[query.find('from'):]
	replace = {"$START":timeFrom,"$END":timeTo}
	replace = dict((re.escape(key),value) for key, value in replace.iteritems())
	pattern = re.compile("|".join(replace.keys()))
	return pattern.sub(lambda m: replace[re.escape(m.group(0))], q)



def generateDB(postParam):
	url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/api/dashboards/db"
        API_KEY = "eyJrIjoiM0VFS1NqNUtBZ3B4cFdWUTVRVGNJQnRsMEFZVTBjUWUiLCJuIjoiZGFzaGJvYXJkX2tleSIsImlkIjoxfQ=="
        req_headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"}
        try:
                request = Request(url,json.dumps(postParam),req_headers)
                response = urlopen(request)
        except URLError, e:
                print 'Error opening URL ---- ***  \n'
                print e.readlines()
                sys.exit(1)
        if response.getcode() == 200:
                print "Content-Type: text/plain"
                print "Success"

def drilldown():
	inpParameter = literal_eval(sys.stdin.read())
	query = inpParameter["query"]
	drill_down_on = inpParameter["drill"]
	graph_type = inpParameter["graph_type"]
	start_time = inpParameter["timeFrom"]
	end_time = inpParameter["timeTo"]

	time = extract_time(start_time,end_time)
        start_time = time[0]
        end_time = time[1]	
	
	DB_title = inpParameter["DB_title"]
	Data_source = inpParameter["Data_source"]
	alias = inpParameter["alias"]
	url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/api/dashboards/db/"+DB_title
	API_KEY = "eyJrIjoiM0VFS1NqNUtBZ3B4cFdWUTVRVGNJQnRsMEFZVTBjUWUiLCJuIjoiZGFzaGJvYXJkX2tleSIsImlkIjoxfQ=="
	req_headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"}
	try:
		request = Request(url,headers = req_headers)
		response = urlopen(request)
	except URLError, e:
		print 'Error opening URL ---- ***  \n'
		print e
		sys.exit(1)
	data = json.load(response)
	db =  data["dashboard"]

	#When graph type is graph
	if graph_type == "graph":
		if "links" not in db["rows"][0]["panels"][0]: #If no Drill Down link is present, then create one at head of the list
  			db["rows"][0]["panels"][0]["links"] = [{"dashUri":"db/Drill_Down_on_"+DB_title,"dashboard":"Drill_Down_on_"+DB_title,"title":"Drill_Down_on_"+DB_title,"type":"dashboard"}]
		else:
			db["rows"][0]["panels"][0]["links"] = [] #If Drill down link already exists, then remove the older one and add updated one to it
			db["rows"][0]["panels"][0]["links"].append({"dashUri":"db/Drill_Down_on_"+DB_title,"dashboard":"Drill_Down_on_"+DB_title,"title":"Drill_Down_on_"+DB_title,"type":"dashboard"})
	
		postParam = {"dashboard":db,"overwrite": True }
		generateDB(postParam) #Generating same dashboard with a Drill Down report in it
	
	#Create a new dashboard with templates

		templateQuery = parseDrillDownQuery(query, drill_down_on, start_time, end_time) #Extract query for creating templating variables
		if len(db["templating"]["list"]) == 0:#If template variable doesn't exist, then add it to the list
			db["templating"]["list"].append({ "allValue": None, "current": { "text": "", "value": [ ] },"datasource": Data_source, "hide": 0, "includeAll": True, "label": None, "multi": True, "name": alias, "options": [], "query": templateQuery, "refresh": 2, "regex": "", "sort": 0,   "tagValuesQuery": "", "tags": [], "tagsQuery": "", "type": "query", "useTags": False })
		else: #If template variable exists, then remove it and then add new upadated variables to the list
			db["templating"]["list"] = [] 
			db["templating"]["list"].append({ "allValue": None, "current": { "text": "", "value": [ ] },"datasource": Data_source, "hide": 0, "includeAll": True, "label": None, "multi": True, "name": alias, "options": [], "query": templateQuery, "refresh": 2, "regex": "", "sort": 0,   "tagValuesQuery": "", "tags": [], "tagsQuery": "", "type": "query", "useTags": False })


		db["rows"][0]["panels"][0]["targets"][0]["rawQuery"] = True #Setting the Raw Query mode ON
		panel_query = db["rows"][0]["panels"][0]["targets"][0]["target"]
		#panel_query = panel_query + " and ($temp)"
		panel_query = panel_query + " and ($"+str(alias)+")"
		db["rows"][0]["panels"][0]["targets"][0]["target"] = panel_query
		db["rows"][0]["panels"][0]["repeat"] = alias
		db["rows"][0]["panels"][0]["minSpan"] = 12
		if "yaxes" not in  db["rows"][0]["panels"][0]:
			db["rows"][0]["panels"][0]["yaxes"] = [{"format":"bps","show":True},{"format":"bps","show":True}] #Setting Y-axis unit to bps
		
		else:
			db["rows"][0]["panels"][0]["yaxes"][0]["format"] = "bps"
		db["rows"][0]["panels"][0]["type"] = "graph"	
		db["rows"][0]["panels"][0]["title"] = "$"+str(alias)
		if "transparent" in db["rows"][0]["panels"][0]:
			db["rows"][0]["panels"][0]["transparent"] = True
		else:
			db["rows"][0]["panels"][0]["transparent"] = True
		db["id"] = None
		db["title"] = "Drill_Down_on_"+DB_title #Title for Drill Down Dashboard
		postParam = {"dashboard":db,"overwrite": True }
		generateDB(postParam)

	#When graph type is table - 
	if graph_type == "table":
		templateQuery = "get "+drill_down_on+" between("+start_time+","+end_time+") by "+ drill_down_on+" "+query[query.find("from"):]
		if len(db["templating"]["list"]) == 0:#If template variable doesn't exist, then add it to the list
                        db["templating"]["list"].append({ "allValue": None, "current": { "text": "", "value": [ ] },"datasource": Data_source, "hide": 0, "includeAll": True, "label": None, "multi": True, "name": alias, "options": [], "query": templateQuery, "refresh": 2, "regex": "", "sort": 0,   "tagValuesQuery": "", "tags": [], "tagsQuery": "", "type": "query", "useTags": False })
                else: #If template variable exists, then remove it and then add new upadated variables to the list
                        db["templating"]["list"] = []
                        db["templating"]["list"].append({ "allValue": None, "current": { "text": "", "value": [ ] },"datasource": Data_source, "hide": 0, "includeAll": True, "label": None, "multi": True, "name": alias, "options": [], "query": templateQuery, "refresh": 2, "regex": "", "sort": 0,   "tagValuesQuery": "", "tags": [], "tagsQuery": "", "type": "query", "useTags": False })
		#Create new drill down dashboards - 
		db["rows"][0]["panels"][0]["targets"][0]["rawQuery"] = True
		db["rows"][0]["panels"][0]["targets"][0]["target"] = query + " and ($"+str(alias)+")"
		
		#Create another graphical panel - 
		db["rows"].append(deepcopy(db["rows"][0]))
		db["rows"][1]["panels"][0]["targets"][0]["rawQuery"] = True
		db["rows"][1]["panels"][0]["id"]+=1
		db["rows"][1]["panels"][0]["type"] = "graph"
		db["rows"][1]["panels"][0]["targets"][0]["target"] = query + " and ($"+str(alias)+")"
		db["rows"][1]["panels"][0]["xaxis"]={"mode": "time","name": None,"show": True,"values": []}
		db["rows"][1]["panels"][0]["yaxes"]=[{ "format": "short", "label": None,"logBase": 1, "max": None,"min": None, "show": True},{"format": "short","label": None,"logBase": 1,"max": None,"min": None,"show": True }]
		

		postParam = {"dashboard":db,"overwrite": True }
                generateDB(postParam)

if __name__ == "__main__":
        loadConfiguration("/etc/grnoc/globalnoc-tsds-datasource-handler/config.json")

	print "Cache-Control: no-cache"
	inpUrl  = os.environ["PATH_INFO"]
	if len(inpUrl) == 0:
		testDataSource()
	if inpUrl == "/dashboard":
		drilldown()
	if inpUrl == "/search":
        	search()
	if inpUrl == "/query":
		query()
        if inpUrl == "/test":
                print "Content-Type: application/json"
                print "Cache-Control: no-cache\n"
                print json.dumps({"status": "success", "message": "Data source is working", "title": "Success"}, default=serialize)
