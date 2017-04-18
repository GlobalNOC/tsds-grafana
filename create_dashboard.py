import sys
import json
from urllib import urlencode
from ast import literal_eval
import os
from urllib2 import Request, urlopen, URLError, HTTPBasicAuthHandler, HTTPPasswordMgr, HTTPPasswordMgrWithDefaultRealm, build_opener, install_opener
import re
import iso8601
from test import *
import datetime
import math

def createPanel(qVariable):
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
 	      'target':'get intf, node, aggregate(values.input, 182, average), aggregate(values.output, 182, average) between($START,$END) by intf, node from interface where ( intf ='+ '\"'+qVariable+'\"'+' and node = "mpsw.mnchpharm.ilight.net" )ordered by intf asc, node asc'
            }
          ],
          "timeFrom": None,
          "timeShift": None,
          "title": "Graph for Interface - "+qVariable,
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



def create_db(whereClause):
	rows=[]
	for i in range(0,len(whereClause)):
		rows.append({
      		"collapse": False,
      		"editable": True,
      		"height": "250px",
      		"panels": createPanel(whereClause[i]),
		#"panels":[],
      		"title": "Row for nodes "+whereClause[i]
    		})

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
	
	tsds_url = "https://tsds-services-el7-test.grnoc.iu.edu/tsds-basic/services/metadata.cgi?method=get_distinct_meta_field_values;measurement_type=interface;limit=1000;offset=0;meta_field=intf;node=mpsw.mnchpharm.ilight.net"
	auth_Connection(tsds_url)
	try:
		request = Request(tsds_url)
    		response = urlopen(request)
        except URLError, e:
                print 'Error opening tsds URL \n', e
	whereClause = [ each["value"] for each in json.load(response)["results"]]
	print "where clause parameteres - ",whereClause
	
	dashboard = create_db(whereClause)
		
	url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/api/dashboards/db"
	API_KEY = "eyJrIjoiM0VFS1NqNUtBZ3B4cFdWUTVRVGNJQnRsMEFZVTBjUWUiLCJuIjoiZGFzaGJvYXJkX2tleSIsImlkIjoxfQ=="
	postParam = {"dashboard":dashboard,"overwrite": True }
	#print postParam
	headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"}
	try:
		request = Request(url,json.dumps(postParam),headers)
		response = urlopen(request)
	except URLError, e:
		print 'Error opening URL ---- ***  \n'
		print e.readlines()
		sys.exit(1)
	print "grafana dashboard --- ",response.getcode()
	data = json.load(response)
	print data
