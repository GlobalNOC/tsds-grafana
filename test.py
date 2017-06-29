#!/usr/bin/python

# enable debugging
import sys
import json
from urllib import urlencode
import os
from urllib2 import Request, urlopen, URLError, HTTPBasicAuthHandler, HTTPPasswordMgr, HTTPPasswordMgrWithDefaultRealm, build_opener, install_opener
import re
import datetime
from ast import literal_eval

def atoi(text):
    return int(text) if text.isdigit() else text

def natural_keys(text):
    return [ atoi(c) for c in re.split('(\d+)', text) ]

#Look for fields in tsds JSON output where key contains keyword - "values"
def findtarget_names(tsds_result,i, alias_list):
        returnname = []
        results_dict = tsds_result["results"][i]
	#open("output_file.txt",'w').close()
        output_file = open("output_file.txt","rw+")
	output_file.write("find target namesss ----------------------  "+str(i)+"\n")
	if len(alias_list) == 0:
        	for key,value in results_dict.iteritems():
                	targetname = []
                	if isinstance(value, list):
                        	targetname.append(key)
                        	nonValues = []
                        	for k , v in results_dict.iteritems():
                                	if not isinstance(v, list):
                                        	nonValues.append(k)
                        	nonValues.sort(key=natural_keys)
                        	for nV in nonValues:
                                	targetname.append("| "+str(results_dict[nV]))
                        	returnname.append(" ".join(targetname))

	else:
		for a in alias_list:
			output_file.write(a+" , ")
		for key,value in results_dict.iteritems():
                        targetname = []
                        if isinstance(value, list):
                                targetname.append(key)
                                nonValues = list(alias_list) #deep copy to counter alias_list values getting modified due to references
                               	for i in range(0,len(nonValues)):
        				if '$' in nonValues[i]:
						v = nonValues[i][1:]
						#output_file.write(json.dumps(results_dict))
						#output_file.write(v+"\n")
          					nonValues[i] = str(results_dict[v])
				targetname.append(" "+" ".join(nonValues))
                                returnname.append(" ".join(targetname))	
		output_file.write("\n")
		output_file.close()
        return returnname

def match(key,targetname):
        #tname = targetname[:targetname.find(")")+1]
        #print tnam
        return True if targetname.find(key)>-1 else False
        #return True if targetname.find(key)>-1 else False

#Reversing the datapoints received from tsds and converting time field into miliseconds (*1000)
def convert(innerValue):
        IV = [ list(reversed(element)) for element in innerValue]
        return [[element[0],element[1]*1000] for element in IV]

def replaceQuery(query,start_time,end_time, aggValue):
	open("output_file.txt",'w').close()
        output_file = open("output_file.txt","rw+")
	
	output_file.write("In replace query ---------- \n");
        replace = {"$START":start_time,"$END":end_time, "{":" ", "}":" "}
        replace = dict((re.escape(key),value) for key, value in replace.iteritems())
        pattern = re.compile("|".join(replace.keys()))
        query = pattern.sub(lambda m: replace[re.escape(m.group(0))], query)
	output_file.write("After replacing $start and $end -  "+query+"\n");
	
	replace = {"$quantify":str(aggValue)}
	replace = dict((re.escape(key),value) for key, value in replace.iteritems())
	pattern = re.compile("|".join(replace.keys()))
	query = pattern.sub(lambda m: replace[re.escape(m.group(0))], query)
	output_file.write("After replacing $quantify -  "+query+"\n")
	return query 

def auth_Connection(url):
	username = "test_user"
        password = "testpass123"
        passman = HTTPPasswordMgrWithDefaultRealm() # creating a password manager
        passman.add_password(None, url, username, password)
        authhandler = HTTPBasicAuthHandler(passman)
        opener = build_opener(authhandler)
        install_opener(opener)


def search():
        inpParameter = literal_eval(sys.stdin.read())
        output_file = open("output_file_query.txt","rw+")
        url = "https://netsage-archive.grnoc.iu.edu/tsds/services-basic/query.cgi"
        auth_Connection(url)
        output_file.write(inpParameter['target']+"\n")
        postParameters = {"method":"query","query":inpParameter["target"]}
        output_file.write("Post params --- \n")
        output_file.write(postParameters["query"])
        try:
                request = Request(url,urlencode(postParameters))
                response = urlopen(request)
                json_result = json.load(response) #convert the response data into json formated string
                output=[]

                for eachDict in json_result["results"]:
			v=""
                        for key,value in eachDict.iteritems():
				if len(v) == 0:
					v+= key+" = \""+value+"\""
				else:
					v = v+" and "+key+" = \""+value+"\""
                    	output.append(v)
                print "Content-Type: application/json" # set the HTTP response header to json data
                print "Cache-Control: no-cache\n"
                print json.dumps(output) #HTTP response 

        except URLError, e:
                print "Content-type: text/plain"
                print 'Error opening tsds URL \n', e
        output_file.close()


def searchT():
	inpParameter = sys.stdin.read() # reading the input data sent in POST method
	url = "https://netsage-archive.grnoc.iu.edu/tsds/services-basic/metadata.cgi?method=get_measurement_types"
	auth_Connection(url)
	try:
		request = Request(url)
		response = urlopen(request)
		json_result = json.load(response) #convert the response data into json formated string
		output=[]
		
		for eachDict in json_result["results"]:
			for key,value in eachDict.iteritems():
				if key =="name":
					output.append(value)

		output_file = open("output_file.txt","rw+")
	        output_file.write("\n")
        	output_file.write("------  In Search Method --------"+"\n")
		for e in output:
        		output_file.write(e+"\n")
        	output_file.close();

        	print "Content-Type: application/json" # set the HTTP response header to json data
		print "Cache-Control: no-cache\n"
	        print json.dumps(output) #HTTP response 
		
	except URLError, e:
		print "Content-type: text/plain"
    		print 'Error opening tsds URL \n', e


def searchC():
        inpParameter = literal_eval(sys.stdin.read()) # reading the input data sent in POST method
	output_file = open("output_file.txt","rw+")
	output_file.write("\n")
	output_file.write("------  In SearchC Method --------"+"\n")
	#output_file.write(inpParameter);
	output_file.write("\n")
	output_file.write(inpParameter['target'])
	output_file.write("\n")
        url = "https://netsage-archive.grnoc.iu.edu/tsds/services-basic/metadata.cgi?method=get_meta_fields;measurement_type="+inpParameter['target']
	output_file.write(url)
        auth_Connection(url)
        try:
                request = Request(url)
                response = urlopen(request)
                json_result = json.load(response) #convert the response data into json formated string
                output=[]
		
		'''
                for eachDict in json_result["results"]:
                        for key,value in eachDict.iteritems():
                                if key =="name":
                                        output.append(value)
		'''
		for eachDict in json_result["results"]:
  			if "fields" in eachDict.keys():
				for field in eachDict["fields"]:
					output.append(eachDict["name"]+"."+field["name"])
			else:
				output.append(eachDict["name"])		

                print "Content-Type: application/json" # set the HTTP response header to json data
                print "Cache-Control: no-cache\n"
                print json.dumps(output) #HTTP response 

        except URLError, e:
                print "Content-type: text/plain"
                print 'Error opening tsds URL \n', e


def searchV():
        inpParameter = literal_eval(sys.stdin.read()) # reading the input data sent in POST method
        output_file = open("output_file.txt","rw+")
        output_file.write("\n")
        output_file.write("------  In SearchC Method --------"+"\n")
        #output_file.write(inpParameter);
        output_file.write("\n")
        output_file.write(inpParameter['target'])
        output_file.write("\n")
        url = "https://netsage-archive.grnoc.iu.edu/tsds/services-basic/metadata.cgi?method=get_measurement_type_values;measurement_type="+inpParameter['target']
        output_file.write(url)
        auth_Connection(url)
        try:
                request = Request(url)
                response = urlopen(request)
                json_result = json.load(response) #convert the response data into json formated string
                output=[]

                for eachDict in json_result["results"]:
                        for key,value in eachDict.iteritems():
                                if key =="name":
                                        output.append(value)
                '''
                output_file = open("output_file.txt","rw+")
                output_file.write("\n")
                output_file.write("------  In Search Method --------"+"\n")
                for e in output:
                        output_file.write(e+"\n")
                output_file.close();
                '''
                print "Content-Type: application/json" # set the HTTP response header to json data
                print "Cache-Control: no-cache\n"
                print json.dumps(output) #HTTP response 

        except URLError, e:
                print "Content-type: text/plain"
                print 'Error opening tsds URL \n', e


def searchW():
        inpParameter = literal_eval(sys.stdin.read()) # reading the input data sent in POST method
        output_file = open("output_file.txt","rw+")
        output_file.write("\n")
        output_file.write("------  In SearchW Method --------"+"\n")
        #output_file.write(inpParameter);
        output_file.write("\n")
        output_file.write(inpParameter['target'])
        output_file.write("\n")
        url = "https://netsage-archive.grnoc.iu.edu/tsds/services-basic/metadata.cgi?method=get_meta_field_values;measurement_type="+inpParameter['target']+";meta_field="+inpParameter['meta_field']+";limit=10;offset=0;"+inpParameter['meta_field']+"_like="+inpParameter['like_field']
        output_file.write(url)
        auth_Connection(url)
        try:
                request = Request(url)
                response = urlopen(request)
                json_result = json.load(response) #convert the response data into json formated string
                output=[]

                for eachDict in json_result["results"]:
                        for key,value in eachDict.iteritems():
                                if key =="value":
                                        output.append(value)
                '''
                output_file = open("output_file.txt","rw+")
                output_file.write("\n")
                output_file.write("------  In Search Method --------"+"\n")
                for e in output:
                        output_file.write(e+"\n")
                output_file.close();
                '''
                print "Content-Type: application/json" # set the HTTP response header to json data
                print "Cache-Control: no-cache\n"
                print json.dumps(output) #HTTP response 
		output_file.write(json.dumps(output))

        except URLError, e:
                print "Content-type: text/plain"
                print 'Error opening tsds URL \n', e





def searchR():
        inpParameter = literal_eval(sys.stdin.read()) # reading the input data sent in POST method
        output_file = open("output_file.txt","rw+")
        output_file.write("\n")
        output_file.write("------  In SearchR Method --------"+"\n")
        output_file.write("\n")
        output_file.write(inpParameter['like_field'])
        output_file.write("\n")
        url = "https://netsage-archive.grnoc.iu.edu/tsds/services-basic/metadata.cgi?method=get_meta_field_values;measurement_type="+inpParameter['target']+";meta_field="+inpParameter['meta_field']+";limit=10;offset=0;"+inpParameter['parent_meta_field']+"="+inpParameter['parent_meta_field_value']+";"+inpParameter['meta_field']+"_like="+str(inpParameter['like_field'])
        output_file.write(url)
	output_file.write("\n")
        auth_Connection(url)
        try:
                request = Request(url)
                response = urlopen(request)
                json_result = json.load(response) #convert the response data into json formated string
                output=[]

                for eachDict in json_result["results"]:
                        for key,value in eachDict.iteritems():
                                if key =="value":
                                        output.append(value)
                '''
                output_file = open("output_file.txt","rw+")
                output_file.write("\n")
                output_file.write("------  In Search Method --------"+"\n")
                for e in output:
                        output_file.write(e+"\n")
                output_file.close();
                '''
                print "Content-Type: application/json" # set the HTTP response header to json data
                print "Cache-Control: no-cache\n"
                print json.dumps(output) #HTTP response 
                output_file.write(json.dumps(output))

        except URLError, e:
                print "Content-type: text/plain"
                print 'Error opening tsds URL \n', e

def query():
        inpParameter = json.loads(sys.stdin.read())

        #get to the target field of json : 
        tsds_query=[]
        start_time=""
        end_time=""
        maxDataPoints=1
	target_alias =""
	alias_list = []
        for key,value in inpParameter.iteritems():
                if key == "targets":
                        for eachElement in value:
                                tsds_query.append(eachElement["target"])
				if "alias" in value:
					target_alias = eachElement["alias"]
                if key =="range":
                        start_time = value["from"]
                        end_time = (value["to"])
                if key =="maxDataPoints":
                        maxDataPoints = value

        #Read query and set the variable $START & $END in the query to appropriate timestamp sent by grafana before querying tsds - 
        # - Convert start_time from iso8601 to UTC format 


        #write to file for debugging -- 
        open("output_file_query.txt",'w').close()
        output_file = open("output_file_query.txt","rw+")
	
	if target_alias != "":
		alias_list = target_alias.split(' ')

        start_time = datetime.datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%S.%fZ")
        ostart = (start_time - datetime.datetime(1970, 1, 1)).total_seconds()
        start_time = str(start_time.strftime("%m-%d-%Y %H:%M:%S.%fZ")).replace("-","/") # Replace '-' with '/'
        start_time =  '"'+start_time[:start_time.index(".")]+' UTC"' # Adding quotes before and after
        #output_file.write("Start_time -"+str(start_time)+"\n")

        # - Convert end_time from iso8601 to UTC format
        end_time = datetime.datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%S.%fZ")
        oend = (end_time - datetime.datetime(1970, 1, 1)).total_seconds()
        end_time= str(end_time.strftime("%m-%d-%Y %H:%M:%S.%fZ")).replace("-","/") #Replace '-' with '/' 
        end_time =  '"'+end_time[:end_time.index(".")]+' UTC"' #Adding quotes before and after
        #output_file.write("End_time -"+str(end_time)+"\n")

        time_duration = (oend-ostart)
        #output_file.write("Duration - "+str(time_duration)+"\n")
        #output_file.write("MaxData Points - "+str(maxDataPoints)+"\n")
        aggValue = int(time_duration/maxDataPoints)
        if time_duration > 172800  and time_duration < 604800:
                aggValue = max(aggValue, int(86400/maxDataPoints))
        elif time_duration > 604800 and time_duration < 2592000 :
                aggValue = max(aggValue, int(604800/maxDataPoints))
        elif time_duration > 2592000:
                aggValue = max(aggValue, int(2592000/maxDataPoints))
        #output_file.write("Agg value -"+str(aggValue)+"\n")
	#output_file.close()
        output=[]
	q=""
	for index in range(len(tsds_query)):
                tquery = replaceQuery(tsds_query[index],start_time,end_time,aggValue)
		
                #tsds_query[index] = replaceQuery(tsds_query[index],start_time,end_time,aggValue)#To replace variables $START and $END with start_time and end_time respectively
                tsds_query[index] = tquery

                #Request data from tsds - 
                url= "https://netsage-archive.grnoc.iu.edu/tsds/services-basic/query.cgi"
                auth_Connection(url)
                postParameters = {"method":"query","query":tsds_query[index]}
                #output_file.write("Query  -"+tsds_query[index]+"\n")
		#output_file.close()
                try:
                        request = Request(url,urlencode(postParameters))
                        response = urlopen(request)
                except URLError, e:
                        print "Content-type: text/plain"
                        print 'Error opening tsds server URL \n', e
                tsds_result =  json.loads(response.read()) #Response from tsds server cached in tsds_result
                #Prepare output for grafana
                #Format the data received from tsds to grafana compatible data -
                for i in range(len(tsds_result["results"])):
                        #Search for target name - 
			for a in alias_list:
                        	output_file.write(a+" ")
			output_file.write(str(i)+"\n")
                        target = findtarget_names(tsds_result, i, alias_list)
                        for eachTarget in target:
                                dict_element={"target":eachTarget}
                                value = tsds_result["results"][i]

                                for innerKey,innerValue in value.iteritems():
                                        if isinstance(innerValue,list) and match(innerKey,eachTarget):
                                                dict_element["datapoints"] = convert(innerValue)
                                output.append(dict_element)
	output = sorted(output, key=lambda k : k["target"])
        print "Content-Type: application/json" # set the HTTP response header to json data
        print "Cache-Control: no-cache\n"
        print json.dumps(output)

def parseDrillDownQuery(query, drill, timeFrom, timeTo):
	q = "get "+drill+" "+ query[query.find('between'): query.find("by")]+" by "+drill +" " + query[query.find('from'):]
	replace = {"$START":timeFrom,"$END":timeTo}
	replace = dict((re.escape(key),value) for key, value in replace.iteritems())
	pattern = re.compile("|".join(replace.keys()))
	return pattern.sub(lambda m: replace[re.escape(m.group(0))], q)



def generateDB(postParam):
	url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/api/dashboards/db"
        API_KEY = "eyJrIjoiM0VFS1NqNUtBZ3B4cFdWUTVRVGNJQnRsMEFZVTBjUWUiLCJuIjoiZGFzaGJvYXJkX2tleSIsImlkIjoxfQ=="
        #print postParam
        req_headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"}
        try:
                request = Request(url,json.dumps(postParam),req_headers)
                response = urlopen(request)
        except URLError, e:
                print 'Error opening URL ---- ***  \n'
                print e.readlines()
                sys.exit(1)
        #data = json.load(response)
        if response.getcode() == 200:
                print "Content-Type: text/plain"
                print "Success"

def drilldown():
	inpParameter = literal_eval(sys.stdin.read())
	query = inpParameter["query"]
	drill = inpParameter["drill"]
	timeFrom = inpParameter["timeFrom"]
	timeTo = inpParameter["timeTo"]
	DB_title = inpParameter["DB_title"]
	Data_source = inpParameter["Data_source"]
	url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/api/dashboards/db/"+DB_title
	API_KEY = "eyJrIjoiM0VFS1NqNUtBZ3B4cFdWUTVRVGNJQnRsMEFZVTBjUWUiLCJuIjoiZGFzaGJvYXJkX2tleSIsImlkIjoxfQ=="
	req_headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"}
	#print postParam
	try:
		request = Request(url,headers = req_headers)
		response = urlopen(request)
	except URLError, e:
		print 'Error opening URL ---- ***  \n'
		print e.readlines()
		sys.exit(1)
		#print "grafana dashboard --- ",response.getcode()
	open("dash.txt",'w').close()
	output_file = open("dash.txt","rw+")
	#output_file.write(response.read()+"\n")
	data = json.load(response)
	db =  data["dashboard"]
	output_file.write("query --- "+query+" Drill -- "+drill+"\n")
	output_file.write(json.dumps(db)+"\n")
	if "links" not in db["rows"][0]["panels"][0]:
  		db["rows"][0]["panels"][0]["links"] = [{"dashUri":"db/Drill_Down_for_"+DB_title,"dashboard":"Drill_Down_for_"+DB_title,"title":"Drill_Down_for_"+DB_title,"type":"dashboard"}]
	else:
		db["rows"][0]["panels"][0]["links"] = []
		db["rows"][0]["panels"][0]["links"].append({"dashUri":"db/Drill_Down_for_"+DB_title,"dashboard":"Drill_Down_for_"+DB_title,"title":"Drill_Down_for_"+DB_title,"type":"dashboard"})
	
	postParam = {"dashboard":db,"overwrite": True }
	generateDB(postParam) #Creating a link in same dashboard to a drill down db
			
	
	#Create new dashboard with templates
	templateQuery = parseDrillDownQuery(query, drill, timeFrom, timeTo)
	output_file.write("\n")
	output_file.write("Query for template ---- \n")
	output_file.write(templateQuery)
	if len(db["templating"]["list"]) == 0:
		db["templating"]["list"].append({ "allValue": None, "current": { "text": "", "value": [ ] },"datasource": Data_source, "hide": 0, "includeAll": True, "label": None, "multi": True, "name": "temp", "options": [], "query": templateQuery, "refresh": 2, "regex": "", "sort": 0,   "tagValuesQuery": "", "tags": [], "tagsQuery": "", "type": "query", "useTags": False })
	else:
		db["templating"]["list"] = []
		db["templating"]["list"].append({ "allValue": None, "current": { "text": "", "value": [ ] },"datasource": Data_source, "hide": 0, "includeAll": True, "label": None, "multi": True, "name": "temp", "options": [], "query": templateQuery, "refresh": 2, "regex": "", "sort": 0,   "tagValuesQuery": "", "tags": [], "tagsQuery": "", "type": "query", "useTags": False })
	db["rows"][0]["panels"][0]["targets"][0]["rawQuery"] = True
	panel_query = db["rows"][0]["panels"][0]["targets"][0]["target"]
	panel_query = panel_query[:panel_query.find(")",-1)] + "and $temp )"
	db["rows"][0]["panels"][0]["targets"][0]["target"] = panel_query
	db["rows"][0]["panels"][0]["repeat"] = "temp"
	db["rows"][0]["panels"][0]["minSpan"] = 12	
	db["id"] = None
	db["title"] = "Drill_Down_on_"+DB_title
	postParam = {"dashboard":db,"overwrite": True }
	generateDB(postParam)

def createTemplateVars(metadata):
       	temp={}
       	interface=[]
       	node=[]
       	for eachresult in metadata:
               	interface.append(eachresult["intf"])
               	node.append(eachresult["node"])
       	temp["interface"]=interface
        temp["node"]=node
        return json.dumps(temp)



if __name__ == "__main__":
	print "Cache-Control: no-cache"
	path  = os.environ["PATH_INFO"]
	open("output_file.txt",'w').close()
        output_file = open("output_file.txt","rw+")
	output_file.write(path+"\n")
	output_file.write("--------------"+"\n")
	#query_string = os.getenv("QUERY_STRING").split('&')[1].split('=')
	#output_file.write(query_string[1])
	inpUrl = path
	output_file.close();
	if inpUrl == "/dashboard":
		drilldown()
	if inpUrl == "/search":
        	search()
	if inpUrl == "/searchT":
		searchT()
	if inpUrl == "/searchC":
                searchC()
	if inpUrl == "/searchV":
                searchV()
	if inpUrl == "/searchW":
                searchW()
	if inpUrl == "/searchR":
                searchR()
	if inpUrl == "/query":
		query()



			
