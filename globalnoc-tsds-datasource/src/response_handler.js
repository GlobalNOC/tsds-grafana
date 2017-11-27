import _ from 'lodash';

export class ResponseHandler {
    constructor(targets, response){
        this.targets = targets;
        this.response = response;
    }

    // returns error information to show in the Grafana inspector
    getErrorInfo(response, error) {
        var result = {};

        if(!error.data.data){
             error.data.data = "Datapoints could not be resolved for this query!";
        }

        if(error.data && error.data.error && error.data.message){
            error.data.message = "Query failed to return datapoints!"
            result.message = "Query Error!";
        }else {
            result.message = error.data.error || "Unknown error!";
        }

        if(response.config){
            result.config = response.config;
        }

        function replacer(key,value){
            if(key === 'config' || key === 'headers' || key === 'xhrStatus' || key === 'status' || key === 'statusText') return undefined;
            return value;
        }
        function dataReplacer(key, value){
            if(key === 'datapoints') return undefined;
            return value;
        }

        result.data = JSON.stringify(error, replacer, 5);

        return result;
    }

    // returns response if there is no error in the response
    getData(){
          var response = this.response;
           if(response.error){
                throw this.getErrorInfo(this.response, response.error);
           }
        return response;
    }
}
