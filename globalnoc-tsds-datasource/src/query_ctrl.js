import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!';

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector, uiSegmentSrv)  {
    super($scope, $injector);

    this.scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;
    this.target.series = this.target.series||'select table';
    this.target.type = this.target.type || 'timeserie';
    this.target.condition = this.target.condition||[];
    this.target.groupby_field = this.target.groupby_field ||'';
    this.target.orderby_field = this.target.orderby_field || '';
    this.target.metric_array = this.target.metric_array||['Select Metric'];
    this.target.metricValues_array = this.target.metricValues_array || ['Select Metric Value'];
    this.target.metricValueAliases = this.target.metricValueAliases || [''];
    this.target.aggregator = this.target.aggregator ||['average'];
    this.target.target_alias = this.target.target_alias||"";
    this.target.whereClauseGroup = this.target.whereClauseGroup||[[{'left':'Select Metric','op':'','right':''}]];
    this.target.inlineGroupOperator = this.target.inlineGroupOperator||[['']];
    this.target.outerGroupOperator = this.target.outerGroupOperator || [''];
    this.target.percentileValue = this.target.percentileValue||[''];
    this.target.templateVariableValue = this.target.templateVariableValue || [''];   
    this.target.bucket = this.target.bucket || [];
    this.target.drillDownAlias = "";
    this.index="";
    this.parentIndex="";
    this.hiddenIndex = "";
    this.target.drillDown = [];
    this.target.drillDownValue = [];
    self = this;
  }

  addWhereClause(index){
		this.target.whereClauseGroup[index].push({'left':'Select Metric','op':'=','right':''});
  	}

 removeWhereClause(parentIndex,index){
		this.target.whereClauseGroup[parentIndex].splice(index,1);
		if (this.target.whereClauseGroup[parentIndex].length ==0 && parentIndex > 0){
			this.target.whereClauseGroup.splice(parentIndex,1);
		}

	}

  addWhereClauseGroup(){
                this.target.whereClauseGroup.push([{'left':'Select Metric','op':'','right':''}]);
		this.target.inlineGroupOperator.push(['']);
        }

    getOperator(){              
       return this.datasource.findOperator();
	
	}	
  addSegments(){
		this.target.metric_array.push('Select Metric');
	}

 removeSegment(index){
			this.target.metric_array.splice(index,1);
	}

  addValueSegments(){
    this.target.metricValues_array.push('Select Metric Value');
    this.target.metricValueAliases.push('');
	this.target.aggregator.push('average');
    this.target.bucket.push('');
	this.target.percentileValue.push('');
  }

  removeValueSegment(index){
    this.target.metricValues_array.splice(index, 1);
    this.target.metricValueAliases.splice(index, 1);
    this.target.aggregator.splice(index, 1);
    this.target.bucket.splice(index, 1);
    this.target.percentileValue.splice(index, 1);
  }

 addGroupBy(){
		this.target.groupby_field.push('Select Column');
		console.log(this.target.groupby_field);
	}

 addOrderBy(){
		this.target.orderby_field.push('Select Column');
		console.log(this.target.orderby_field);
}

 removeGroupBy(index){
		this.target.groupby_field.splice(index,1);
	}

 removeOrderBy(index){
		this.target.orderby_field.splice(index,1);
	}


  getColumns() {
    return this.datasource.findMetric(this.target,"Column")
      .then(this.uiSegmentSrv.transformToSegments(false));
  }

  getMetricValues() {
    	return this.datasource.findMetric(this.target,"Value")
      .then(this.uiSegmentSrv.transformToSegments(false));
       }

 

 getTableNames() {
    	return  this.datasource.metricFindTables(this.target)
      .then(this.uiSegmentSrv.transformToSegments(false));
        }

 getWhereFields(){
    	return self.datasource.findWhereFields(self.target,self.parentIndex, self.index, arguments[0], arguments[1]);
        }

generateDrillDown(){
	this.target.drillDown.splice(0,0,'Drill');
}


createDashboard(){
	var r = this.datasource.generateDashboard(this.target, this.panelCtrl.$scope.ctrl.range.from.toISOString(), this.panelCtrl.$scope.ctrl.range.to.toISOString(),  this.panelCtrl.dashboard.title, this.datasource.name, this.panel.type);
	window.location.reload();
	return r;

}
 saveIndices(parentIndex, index){
        this.parentIndex = parentIndex;
	this.index = index;
	}



  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

 onChangeInternal() {
	this.panelCtrl.refresh();
     }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

