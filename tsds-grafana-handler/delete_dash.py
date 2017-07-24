import urllib2
def get_method(self):
    """Return a string indicating the HTTP request method."""
    default_method = "POST" if self.data is not None else "GET"
    return getattr(self, 'method', default_method)


url = "https://tsds-frontend-el7-test.grnoc.iu.edu/grafana/api/dashboards/Drill_Down_on_Allstream"
API_KEY = "eyJrIjoiM0VFS1NqNUtBZ3B4cFdWUTVRVGNJQnRsMEFZVTBjUWUiLCJuIjoiZGFzaGJvYXJkX2tleSIsImlkIjoxfQ=="
req_headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"}
try:
	opener = urllib2.build_opener(urllib2.HTTPHandler)
	request = urllib2.Request(url)
	request.add_header('Content-Type', 'application/json')
	request.add_header("Authorization","Bearer "+API_KEY)
	request.get_method = lambda: 'DELETE'
	response = opener.open(request)
	print response.getcode()
except Exception as e:
	print 'Error opening URL ---- ***  \n'
	print e
