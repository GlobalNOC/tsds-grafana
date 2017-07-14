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
                url = getUrl()+"metadata.cgi?method=get_meta_field_values;measurement_type="+inpParameter['target']+";meta_field="+inpParameter['meta_field']+";limit=10;offset=0;"+inpParameter['meta_field']+"_like="+inpParameter['like_field']
                json_result = make_TSDS_Request(url)
                output = [eachDict["value"] for eachDict in json_result["results"]]

        elif searchType == "Where_Related": # Searching for dependent where clause
                url = getUrl()+"metadata.cgi?method=get_meta_field_values;measurement_type="+inpParameter['target']+";meta_field="+inpParameter['meta_field']+";limit=10;offset=0;"+inpParameter['parent_meta_field']+"="+inpParameter['parent_meta_field_value']+";"+inpParameter['meta_field']+"_like="+str(inpParameter['like_field'])
                json_result = make_TSDS_Request(url)
                output = [eachDict["value"] for eachDict in json_result["results"]]

        elif searchType == "Search": #Searching for template variables in Drill Down report
                url = getUrl()+"query.cgi"
                postParameters = {"method":"query","query":inpParameter["target"]}
                json_result = make_TSDS_Request(url,urlencode(postParameters))
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

