// The MIT License (MIT)

// Copyright (c) 2017 Trustees of Indiana University

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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
