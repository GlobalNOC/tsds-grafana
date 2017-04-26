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


def parseQuery(dashboard_config, drilldown):
	if drilldown:
		replace = {"$group_by":",".join(dashboard_config["drilldown_param"]["group_by"])}
	else:
		replace = {"$group_by":dashboard_config["group_by"]}
        replace = dict((re.escape(key),value) for key, value in replace.iteritems())
        pattern = re.compile("|".join(replace.keys()))
        query = pattern.sub(lambda m: replace[re.escape(m.group(0))],dashboard_config["query"])
	print query
	return query



def createPanel(dashboard_config,drilldown):
	query = parseQuery(dashboard_config, False)
	dd=[]
	drilledDown_links = {}
	if drilldown:
		print "Inside drilldown"
		url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/dashboard/script/scripted.js?"
		scripted_db_query = parseQuery(dashboard_config, True)

		scripted_db={"rows":1,"name":"myName","orgId":1,"query":scripted_db_query}
		
		drilledDown_links["url"]=url
		drilledDown_links["dashUri"]="db/drilled"
		drilledDown_links["params"]=urlencode(scripted_db)
		drilledDown_links["dashboard"]= "Drilled"
              	drilledDown_links["title"] = "Drilled"
              	drilledDown_links["type"] = "absolute"
	dd.append(drilledDown_links)
	print "Links - "
	print dd
	panels={
	  "colorBackground": False,
          "colorValue": False,
          "colors": [
          "rgba(245, 54, 54, 0.9)",
          "rgba(237, 129, 40, 0.89)",
          "rgba(50, 172, 45, 0.97)"
          ],
          "aliasColors": {},
          "bars": dashboard_config["bar_graph"],
          "datasource": "simple json",
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
            "threshold2Color": "rgba(234, 112, 112, 0.22)",
          },
          "id": 1,
          "legend": {
	    "alignAsTable": True,
            "avg": True,
            "current": False,
            "max": True,
            "min": True,
            "show": True,
            "total": True,
            "values": True
          },
          "links":drilledDown_links,
          "lines": dashboard_config["lines_graph"],
          "linewidth": 1,
          "links": dd,
          "NonePointMode": "connected",
          "percentage": False,
          "pointradius": 5,
          "points": dashboard_config["points_graph"],
          "renderer": "flot",
          "seriesOverrides": [],
          "span":12 ,
          "stack": False,
          "steppedLine": False,
          "targets": [
            { 
 	      #'target':'get intf, node,values.input, values.output between($START,$END) by intf, node from interface where ( intf ='+ '\"'+qVariable+'\"'+' and node = "mpsw.mnchpharm.ilight.net" )ordered by intf asc, node asc'
	        "target":query
            }
          ],
          "timeFrom": None,
          "timeShift": None,
          "title": "Graph for Interface - ",
          "tooltip": {
            "shared": True,
            "value_type": "cumulative"
          },
          "transparent": True,
          "type": "graph",
          "x-axis": True,
          "y-axis": True,
          "y_formats": [
        "bps",
        "short"
        ]
        }
	print "panles - "
	print panels
	print panels["links"]
	return [panels]



def create_db(dashboard_config,drilldown = False):
	
	rows=[]

	#Multiple panels in single row - 
	#multiPanels =[createPanel(circuit[0],dashboard_config), createPanel(circuit[1],dashboard_config)]
	rows.append({
                "collapse": False,
                "editable": True,
                "height": "250px",
                "panels": createPanel(dashboard_config,drilldown),
                "title": "Graph for Entity - "+dashboard_config["entity"] 
                })

	'''
	for i in range(0,len(circuit)):
		rows.append({
      		"collapse": False,
      		"editable": True,
      		"height": "250px",
      		"panels": [createPanel(circuit[i],dashboard_config)],
		#"panels":[],
      		"title": "Row for nodes "+circuit[i]
    		})
	'''
	#print rows
	dashboard = {
 	"id": None,
 	"title": dashboard_config["name"],
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
	

	#Read dashboard config from JSON file - 
	config_file = open("dashboard_config.txt","r")
	dashboard_config_file =  literal_eval(config_file.read())
	#dashboard_config = literal_eval(dashboard_config)
	#print dashboard_config["name"]
	
	'''
	tsds_url = "https://tsds-services-el7-test.grnoc.iu.edu/tsds-basic/services/metadata.cgi?method=get_distinct_meta_field_values;measurement_type=interface;limit=1000;offset=0;meta_field=intf;node=mpsw.mnchpharm.ilight.net"
	auth_Connection(tsds_url)
	try:
		request = Request(tsds_url)
    		response = urlopen(request)
        except URLError, e:
                print 'Error opening tsds URL \n', e
	circuit = [ each["value"] for each in json.load(response)["results"]]
	'''

	for dashboard_config in dashboard_config_file:

		tsds_url = "https://tsds-services-el7-test.grnoc.iu.edu/tsds-basic/services/metadata.cgi?method=get_distinct_meta_field_values;measurement_type=interface;limit=1000;offset=0;meta_field=intf;entity.name="+dashboard_config["entity"]
        	auth_Connection(tsds_url)
        	try:
                	request = Request(tsds_url)
                	response = urlopen(request)
        	except URLError, e:
                	print 'Error opening tsds URL \n', e
		no_of_results = len(json.load(response)["results"])
		#print no_of_results
		dashboard = create_db(dashboard_config,dashboard_config["drilldown"])		


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
