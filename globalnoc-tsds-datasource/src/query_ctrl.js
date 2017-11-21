import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!';


class GenericFunction {
  constructor(type, title, wrapper) {
    this.type = type;
    this.title = title;

    this.deleteWrapper = this.deleteWrapper.bind(this);
    this.changeTitle = this.changeTitle.bind(this);

    if (wrapper === undefined || wrapper.length === 0) {
      this.wrapper = [];
    } else {
      let f = wrapper[0];
      this.wrapper = [new GenericFunction(f.type, f.title, f.wrapper)];
      this.wrapper[0].whenDeleteSelected = this.deleteWrapper;
    }
    this.whenDeleteSelected = function(e) { };
  }

  addWrapper() {
    console.log(`A new wrapper funtion was added to ${this.type} ${this.title}`);
    let base = new GenericFunction('Singleton', 'Average');

    if (this.wrapper.length > 0) {
      base.wrapper = this.wrapper;
      this.wrapper[0].whenDeleteSelected = base.deleteWrapper;
    }

    this.wrapper = [base];
    base.whenDeleteSelected = this.deleteWrapper;
  }

  deleteWrapper(wrapper) {
    this.wrapper = this.wrapper[0].wrapper;

    if (this.wrapper.length > 0) {
      this.wrapper[0].whenDeleteSelected = this.deleteWrapper;
    }
  }

  changeTitle() {
    if (this.title === 'Average') {
      this.type = 'Singleton';
    } else if (this.title === 'Count') {
      this.type = 'Singleton';
    } else if (this.title === 'Percentile') {
      this.type = 'Percentile';
    } else if (this.title === 'Sum') {
      this.type = 'Singleton';
    } else if (this.title === 'Max') {
      this.type = 'Singleton';
    } else if (this.title === 'Min') {
      this.type = 'Singleton';
    } else if (this.title === 'Aggregate') {
      this.type = 'Aggregate';
    } else {
      // this.title === 'Delete'
      this.whenDeleteSelected(this);
    }
  }

  tsdsQuery(parentQuery) {
    let query = '';
    if (this.type === 'Singleton') {
      query = `${this.title}(${parentQuery})`;
    } else if (this.type === 'Percentile') {
      let percentile = this.percentile || 85;
      query = `percentile(${percentile}, ${parentQuery})`;
    } else {
      let bucket = this.bucket || 300;
      let method = this.method || 'average';
      let target = this.target || 'input';
      query = `aggregate(values.${target}, ${method}, ${bucket})`;
    }

    if (this.wrapper.length === 0) {
      return query;
    }
    return this.wrapper[0].tsdsQuery(query);
  }
}

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

    // Creates an array of GenericFunctions from existing data, or if
    // the data doesn't exist, setups a single GenericFunction.
    this.target.function = this.target.function.map((f) => new GenericFunction(f.type, f.title, f.wrapper)) || [new GenericFunction('Aggregate', 'Aggregate')];
    console.log(this.target.function[0].tsdsQuery(''));

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

    this.target.function.push(new GenericFunction('Aggregate', 'Aggregate'));
  }

  removeValueSegment(index){
    this.target.metricValues_array.splice(index, 1);
    this.target.metricValueAliases.splice(index, 1);
    this.target.aggregator.splice(index, 1);
    this.target.bucket.splice(index, 1);
    this.target.percentileValue.splice(index, 1);

    this.target.function.splice(index, 1);
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

