import sys
import json
from urllib import urlencode
from ast import literal_eval
import os
import base64
import json
from requests.auth import HTTPBasicAuth
from urllib2 import Request, urlopen, URLError, HTTPBasicAuthHandler, HTTPPasswordMgr, HTTPPasswordMgrWithDefaultRealm, build_opener, install_opener


def createPanel():
	panels= [
        {
          "aliasColors": {},
          "bars": False,
          "datasource": "simple jason",
          "editable": True,
          "error": False,
          "fill": 0,
          "grid": {
            "leftLogBase": 1,
            "leftMax": None,
            "leftMin": None,
            "rightLogBase": 100,
            "rightMax": 100,
            "rightMin": 100,
            "threshold1": None,
            "threshold1Color": "rgba(216, 200, 27, 0.27)",
            "threshold2": None,
            "threshold2Color": "rgba(234, 112, 112, 0.22)"
          },
          "id": 1,
          "legend": {
            "avg": False,
            "current": False,
            "max": False,
            "min": False,
            "show": True,
            "total": False,
            "values": False
          },
          "lines": True,
          "linewidth": 1,
          "links": [],
          "NonePointMode": "connected",
          "percentage": False,
          "pointradius": 5,
          "points": False,
          "renderer": "flot",
          "seriesOverrides": [],
          "span":6 ,
          "stack": False,
          "steppedLine": False,
          "targets": [
            { 
 	      'target':'get intf, node, aggregate(values.input, 182, average), aggregate(values.output, 182, average) between($START,$END) by intf, node from interface where ( intf = "Gi0/3" and node = "mpsw.mnchpharm.ilight.net" )ordered by intf asc, node asc'
            }
          ],
          "timeFrom": None,
          "timeShift": None,
          "title": "Python created Graph",
          "tooltip": {
            "shared": True,
            "value_type": "cumulative"
          },
          "type": "graph",
          "x-axis": True,
          "y-axis": True,
          "y_formats": [
        "percent",
        "short"
        ]
        }
	]
	return panels



def create_db():

	rows = [
    	{
      	"collapse": False,
      	"editable": True,
      	"height": "250px",
      	"panels": createPanel(),
      	"title": "New Python 1st Row"
    	},
    	{
      	"collapse": False,
      	"editable": True,
      	"height": "250px",
      	"panels": [],
      	"title": "New python 2nd Row"
    	}
  	]

	dashboard = {
 	"id": None,
 	"title": "Production overview",
  	"tags": [],
	"style": "dark",
	"timezone": "browser",
	"editable": True,
	"hideControls": False,
	"graphTooltip": 1,
	"rows":rows,
	"time": {
	"from": "now-6h",
	"to": "now"
	},
	"timepicker": {
	"time_options": [],
    	"refresh_intervals": []
	},
  	"templating": {
    	"list":[]
  	},
  	"annotations": {
    	"list": []
  	},
  	"schemaVersion": 7,
  	"version": 0,
  	"links": []
	}
	return dashboard
	




if __name__ == "__main__":
	'''
	f = open("prod_db.txt","r")
	dashboard = f.read().replace("\n","")
	dashboard = literal_eval(dashboard) # To convert string read from file to dictionary
	f.close()
	'''
	dashboard = create_db()

	url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/api/dashboards/db"
	API_KEY = "eyJrIjoiM0VFS1NqNUtBZ3B4cFdWUTVRVGNJQnRsMEFZVTBjUWUiLCJuIjoiZGFzaGJvYXJkX2tleSIsImlkIjoxfQ=="

	#{'dashboard': {'rows': [{}], 'tags': ['templated'], 'title': 'Production Overview', 'version': 0, 'timezone': 'browser', 'schemaVersion': 6, 'id': None}, 'overwrite': True}

	postParam = {"dashboard":dashboard,"overwrite": True }
	print postParam
	#print postParam
	headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"}
	try:
		request = Request(url,json.dumps(postParam),headers)
		response = urlopen(request)
	except URLError, e:
		print 'Error opening URL ---- ***  \n'
		print e.readlines()
		sys.exit(1)
	print response.getcode()
	data = json.load(response)
	#print json.load(response)
	print data["slug"]
	
