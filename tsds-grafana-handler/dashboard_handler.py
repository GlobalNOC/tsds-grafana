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
                print e.readlines()
                sys.exit(1)
        data = json.load(response)
        db =  data["dashboard"]
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
        db["rows"][0]["panels"][0]["yaxes"][0]["format"] = "bps" #Setting Y-axis unit to bps
        db["rows"][0]["panels"][0]["yaxes"][1]["format"] = "bps"
        #db["rows"][0]["panels"][0]["title"] = "$temp"  
        db["rows"][0]["panels"][0]["title"] = "$"+str(alias)
        if "transparent" in db["rows"][0]["panels"][0]:
                db["rows"][0]["panels"][0]["transparent"] = True
        else:
                db["rows"][0]["panels"][0]["transparent"] = True
        db["id"] = None
        db["title"] = "Drill_Down_on_"+DB_title #Title for Drill Down Dashboard
        postParam = {"dashboard":db,"overwrite": True }
        generateDB(postParam)
