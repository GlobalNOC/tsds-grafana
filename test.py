#!/usr/bin/python

# enable debugging
import cgi
import cgitb
import sys
import json
import urllib2
import os
from urllib2 import Request, urlopen, URLError, HTTPBasicAuthHandler, HTTPPasswordMgr, HTTPPasswordMgrWithDefaultRealm, build_opener, install_opener


def search():
	fileOut = open("/home/mthatte/verify.txt","rw+")
	fileOut.write("Hi I am in search  query\n");
	inpParameter = sys.stdin.read() # reading the input data sent in POST method
	fileOut.write(inpParameter+"\n")
	url = "https://tsds-services-el7-test.grnoc.iu.edu/tsds-basic/services/metadata.cgi?method=get_measurement_type_values;measurement_type=interface"
	#Basic - Authetication
		
	username = "test_user"
	password = "testpass123"
	passman = HTTPPasswordMgrWithDefaultRealm() # creating a password manager
	passman.add_password(None, url, username, password)
	authhandler = HTTPBasicAuthHandler(passman)
	opener = build_opener(authhandler)
	install_opener(opener)	
	
	#Basic AUth done, whenevr urlopen is called, bsic-auth will get executed	

	try:
		request = Request(url)
		response = urlopen(request)
		json_result = json.load(response) #convert the response data into json formated string
		output=[]
		
		for eachDict in json_result["results"]:
			for key,value in eachDict.iteritems():
				if key =="name":
					output.append(value)
		
		#fileOut.write(json_result + " \n")
        	print "Content-Type: application/json" # set the HTTP response header to json data
		print "Cache-Control: no-cache\n"
	        print json.dumps(output) #HTTP response 
		
	except URLError, e:
		#print "Content-type: text/plain'\n"
    		print 'Error opening tsds URL \n', e
		if hasattr(e,'code'):
			if e.code==401:
				print e.headers
				print e.headers["www-authenticate"]
			else:
				print "different error code \n"
	
	'''

	res = ["upper_25","upper_50","upper_75","upper_90","upper_95"] # dumy sample response text
	json_result = json.dumps(res) #convert the response data into json formated string
	#fileOut.write(json_result + " \n")
	print "Content-type: application/json\n" # set the HTTP response header to json data
	print json_result #HTTP response 
	fileOut.close()
	'''
	
def query():
	fileOut = open("/home/mthatte/verify.txt","rw+")
        fileOut.write("Hi I am in Query  query\n");
        inpParameter = sys.stdin.read()
        fileOut.write(inpParameter+"\n")
        fileOut.close()
	

if __name__ == "__main__":
	#print "Cache-Control: no-cache\n"
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


