#!/usr/bin/python

# enable debugging
import sys
import json
from urllib import urlencode
import os
from urllib2 import Request, urlopen, URLError, HTTPBasicAuthHandler, HTTPPasswordMgr, HTTPPasswordMgrWithDefaultRealm, build_opener, install_opener
import re
import datetime


#Look for fields in tsds JSON output where key contains keyword - "values"
def findtarget_names(tsds_result,i):
	returnname = []
    	results_dict = tsds_result["results"][i]
    	for key,value in results_dict.iteritems():
        	targetname = []
        	if key.find("values.") > -1:
            		targetname.append(key+" ")
            		for k , v in results_dict.iteritems():
                		if k.find("values.")==-1:
                    			targetname.append(v+ " ")
            		returnname.append(" ".join(targetname))
    	return returnname	
		
	
def match(key,targetname):
	return True if targetname.find(key)>-1 else False

#Reversing the datapoints received from tsds and converting time field into miliseconds (*1000)
def convert(innerValue):
	IV = [ list(reversed(element)) for element in innerValue]
	return [[element[0],element[1]*1000] for element in IV]

#Replace - 
def replaceQuery(query,start_time,end_time, aggValue):
	replace = {"$START":start_time,"$END":end_time}
       	replace = dict((re.escape(key),value) for key, value in replace.iteritems())
      	pattern = re.compile("|".join(replace.keys()))
	query = pattern.sub(lambda m: replace[re.escape(m.group(0))], query)

	replace = {"values.input":"aggregate(values.input, "+str(aggValue)+", average)","values.output":"aggregate(values.output, "+str(aggValue)+", average)"}
        replace = dict((re.escape(key),value) for key, value in replace.iteritems())
        pattern = re.compile("|".join(replace.keys()))
        return pattern.sub(lambda m: replace[re.escape(m.group(0))], query)

def auth_Connection(url):
	username = "test_user"
        password = "testpass123"
        passman = HTTPPasswordMgrWithDefaultRealm() # creating a password manager
        passman.add_password(None, url, username, password)
        authhandler = HTTPBasicAuthHandler(passman)
        opener = build_opener(authhandler)
        install_opener(opener)

def search():
	inpParameter = sys.stdin.read() # reading the input data sent in POST method
	url = "https://tsds-services-el7-test.grnoc.iu.edu/tsds-basic/services/metadata.cgi?method=get_measurement_type_values;measurement_type=interface"
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
		q = 'get intf, node,values.input, values.output between($START,$END) by intf, node from interface where ( intf = "Gi0/3" and node = "mpsw.mnchpharm.ilight.net" )ordered by intf asc,node asc'
		output.append(q)
        	print "Content-Type: application/json" # set the HTTP response header to json data
		print "Cache-Control: no-cache\n"
	        print json.dumps(output) #HTTP response 
		
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
	for key,value in inpParameter.iteritems():
		if key == "targets":
			for eachElement in value:
				tsds_query.append(eachElement["target"])
		if key =="range":
			start_time = value["from"]
			end_time = (value["to"])
		if key =="maxDataPoints":
			maxDataPoints = value
	
	#Read query and set the variable $START & $END in the query to appropriate timestamp sent by grafana before querying tsds - 
	ostart = start_time
	oend = end_time
	# - Convert start_time from iso8601 to UTC format 
	start_time = datetime.datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%S.%fZ")
	ostart = (start_time - datetime.datetime(1970, 1, 1)).total_seconds()
	start_time = str(start_time.strftime("%m-%d-%Y %H:%M:%S.%fZ")).replace("-","/") # Replace '-' with '/'
	start_time =  '"'+start_time[:start_time.index(".")]+' UTC"' # Adding quotes before and after
	# - Convert end_time from iso8601 to UTC format
	end_time = datetime.datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%S.%fZ")
	oend = (end_time - datetime.datetime(1970, 1, 1)).total_seconds()
	end_time= str(end_time.strftime("%m-%d-%Y %H:%M:%S.%fZ")).replace("-","/") #Replace '-' with '/' 
	end_time =  '"'+end_time[:end_time.index(".")]+' UTC"' #Adding quotes before and after
	time_duration = (oend-ostart)
	aggValue = int(time_duration/maxDataPoints)
	if time_duration > 172800  and time_duration < 604800:
		aggValue = int(time_duration/maxDataPoints)
		#aggValue = int(aggValue/3660)
	elif time_duration > 604800 :
		aggValue = int(time_duration/maxDataPoints)
		#aggValue = int(aggValue/86400)
	output=[]
	q=""
	for index in range(len(tsds_query)):
		tsds_query[index] = replaceQuery(tsds_query[index],start_time,end_time,aggValue)#To replace variables $START and $END with start_time and end_time respectively
		#print "Content-Type: text/plain"
		#print tsds_query[index],start_time,end_time
		#Request data from tsds - 
		url= "https://tsds-services-el7-test.grnoc.iu.edu/tsds-basic/services/query.cgi"
		auth_Connection(url)
		postParameters = {"method":"query","query":tsds_query[index]}
		try:
			request = Request(url,urlencode(postParameters))
			response = urlopen(request)
		except URLError, e:
       			print "Content-type: text/plain"
         		print 'Error opening tsds server URL \n', e
		tsds_result =  json.loads(response.read()) #Response from tsds server is cached in tsds_result

		#Prepare output for grafana
		#Format the data received from tsds to grafana compatibale data -
		#output=[]
		for i in range(len(tsds_result["results"])):
			#Search for target name - 
			target = findtarget_names(tsds_result,i)
			for eachTarget in target:
    				dict_element={"target":eachTarget}
    				value = tsds_result["results"][i]
			
    				for innerKey,innerValue in value.iteritems():
        				if match(innerKey,eachTarget):
            					dict_element["datapoints"] = convert(innerValue)
			
				#Above for loop in single line - 
				#dict_element["datapoints"] = [convert(innerValue) for innerKey,innerValue in value.iteritems() if match(innerKey,eachTarget)]
    				output.append(dict_element)

	print "Content-Type: application/json" # set the HTTP response header to json data
        print "Cache-Control: no-cache\n"	
	print json.dumps(output)
		
if __name__ == "__main__":
	print "Cache-Control: no-cache"
	inpUrl = os.environ["PATH_INFO"]
	if inpUrl == "/":
		testDataSource()
	if inpUrl == "/search":
		search()
	if inpUrl == "/query":
		query()
