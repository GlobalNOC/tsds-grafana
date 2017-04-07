#!/usr/bin/python

# enable debugging
import cgi
import cgitb
import sys
import json
from urllib import urlencode
import os
from urllib2 import Request, urlopen, URLError, HTTPBasicAuthHandler, HTTPPasswordMgr, HTTPPasswordMgrWithDefaultRealm, build_opener, install_opener



def convert(innerValue):
	IV = [ list(reversed(element)) for element in innerValue]
	
	for element in IV:
        	#element[0]= float(element[0]) # Converting to float
		element[1]*=1000 #converting to millisecond
	
    	return IV


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
		
        	print "Content-Type: application/json" # set the HTTP response header to json data
		print "Cache-Control: no-cache\n"
	        print json.dumps(output) #HTTP response 
		
	except URLError, e:
		print "Content-type: text/plain"
    		print 'Error opening tsds URL \n', e
		if hasattr(e,'code'):
			if e.code==401:
				print e.headers
				print e.headers["www-authenticate"]
			else:
				print "different error code \n"
	
def query():
	print "Content-Type: application/json\n"
        inpParameter = json.loads(sys.stdin.read())
	#get to the target field of json : 
	tsds_query=""
	for key,value in inpParameter.iteritems():
		if key == "targets":
			for eachElement in value:
				tsds_query = eachElement["target"]
	#print tsds_query
	#print json.dumps(tsds_query)
	
	#Request data from tsds - 
	url= "https://tsds-services-el7-test.grnoc.iu.edu/tsds-basic/services/query.cgi"
	auth_Connection(url)
	postParameters = {"method":"query","query":tsds_query}
	try:
		request = Request(url,urlencode(postParameters))
		response = urlopen(request)
	except URLError, e:
       		print "Content-type: text/plain"
         	print 'Error opening tsds server URL \n', e
		if hasattr(e,'code'):
                        if e.code==401:
				print "Auth required"
	tsds_result =  json.loads(response.read())
	output=[]
	dict_element={"target":tsds_query}
	for key,value in tsds_result.iteritems():
		if key =="results":
			for innerKey,innerValue in value[0].iteritems():
				if innerKey == "aggregate(values.input, 182, average)":
					dict_element["datapoints"] = convert(innerValue)
					#print json.dumps(reverse(innerValue))
	output.append(dict_element)
	print json.dumps(output)
					
	#Format the data received from tsds to grafana compatibale data - 

		
if __name__ == "__main__":
	print "Cache-Control: no-cache"
	inpUrl = os.environ["PATH_INFO"]
	filemain = open("/home/mthatte/mainData.txt","rw+")
	if inpUrl == "/":
		testDataSource()
	if inpUrl == "/search":
		filemain.write("Search param - "+inpUrl+" \n") # for debugging purpose writing to the file
		search()
	if inpUrl == "/query":
		filemain.write("Query param - "+inpUrl+" \n") # for debugging purpose writing to the file
		query()
	filemain.close()


