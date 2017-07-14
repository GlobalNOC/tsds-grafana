import json
import sys
import re




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



def findtarget_names(tsds_result,i, alias_list):
        returnname = []
        results_dict = tsds_result["results"][i]
        if len(alias_list) == 0:
                for key,value in results_dict.iteritems():
                        targetname = []
                        if isinstance(value, list): #when value is a list append its key with all the other non-list key-value pair
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
                for key,value in results_dict.iteritems():
                        targetname = []
                        if isinstance(value, list):
                                targetname.append(key)
                                nonValues = list(alias_list) #deep copy to counter alias_list values getting modified due to references
                                for i in range(0,len(nonValues)):
                                        if '$' in nonValues[i]: #Look for $ sign in alias_list and replace it with its correpsonding value from results
                                                v = nonValues[i][1:]
                                                nonValues[i] = str(results_dict[v])
                                targetname.append(" "+" ".join(nonValues))
                                returnname.append(" ".join(targetname))
        return returnname


def match(key,targetname):
        return True if targetname.find(key)>-1 else False

#Reversing the datapoints received from tsds and converting time field into miliseconds (*1000)
def convert(innerValue):
        IV = [ list(reversed(element)) for element in innerValue]
        return [[element[0],element[1]*1000] for element in IV]

#Replace $START, $END, and $quantify variables in query with its corresponding value
def replaceQuery(query,start_time,end_time, aggValue):
        replace = {"$START":start_time,"$END":end_time, "$quantify":str(aggValue), "{":" ", "}":" "}
        replace = dict((re.escape(key),value) for key, value in replace.iteritems())
        pattern = re.compile("|".join(replace.keys()))
        return pattern.sub(lambda m: replace[re.escape(m.group(0))], query)

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
                                if "alias" in eachElement and eachElement['alias'] != "":
                                        target_alias = eachElement["alias"]
                if key =="range":
                        start_time = value["from"]
                        end_time = (value["to"])
                if key =="maxDataPoints":
                        maxDataPoints = value

        if target_alias != "":
                alias_list = target_alias.split(' ')

        time = extract_time(start_time,end_time)
        start_time = time[0]
        end_time = time[1]
        time_duration = time[2]
        aggValue = int(time_duration/maxDataPoints)
        '''
        if time_duration > 172800  and time_duration <= 604800:#Time between 2 and 7 days
                aggValue = max(aggValue, int(86400/maxDataPoints))
        elif time_duration > 604800 and time_duration <= 2592000 : #Time between 7 and 30 days
                aggValue = max(aggValue, 3600)
        elif time_duration > 2592000: #Time greater than 30 days
                aggValue = max(aggValue, 86400)
        '''
        if time_duration >= 7776000:
                aggValue = max(aggValue, 86400)
        elif time_duration >= 259200:
                aggValue = max(aggValue, 3600)

        output=[]
        q=""
        for index in range(len(tsds_query)):
                tsds_query[index] = replaceQuery(tsds_query[index],start_time,end_time,aggValue)
                #Request data from tsds - 
                url= getUrl()+"query.cgi"
                postParameters = {"method":"query","query":tsds_query[index]}
                tsds_result = make_TSDS_Request(url,urlencode(postParameters))
                #Prepare output for grafana
                #Format the data received from tsds to grafana compatible data -
                for i in range(len(tsds_result["results"])):
                        #Search for target name - 
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
