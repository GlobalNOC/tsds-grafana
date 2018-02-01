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

import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!';


class GenericFunction {
  /**
   * Create a GenericFunction
   *
   * @param {string} type - Visual type of this Object. May be
   * Aggregate, Percentile, or Singleton
   * @param {string} title - Logical type of this Object. May be
   * Average, Count, Percentile, Sum, Max, Min, or Aggregate.
   * @param {GenericFunction[]} wrapper - Array of wrapper functions;
   * May be an empty array.
   * @param {Object} options - An object describing any non-default
   * function parameters. May be an empty Object.
   */
  constructor(type, title, wrapper, options) {
    this.type = type;
    this.title = title;

    this.root = (typeof options.root === 'undefined') ? false : options.root;

    this.method = (typeof options.method === 'undefined') ? 'average' : options.method;
    this.target = (typeof options.target === 'undefined') ? 'input' : options.target;
    this.bucket = (typeof options.bucket === 'undefined') ? '' : options.bucket;
    this.alias = (typeof options.alias === 'undefined') ? '' : options.alias;

    this.percentile = (typeof options.percentile === 'undefined') ? '85' : options.percentile;

    this.template = (typeof options.template === 'undefined') ? '' : options.template;

    this.deleteWrapper = this.deleteWrapper.bind(this);
    this.changeTitle = this.changeTitle.bind(this);

    if (wrapper === undefined || wrapper.length === 0) {
      this.wrapper = [];
    } else {
      let f = wrapper[0];
      this.wrapper = [new GenericFunction(f.type, f.title, f.wrapper, f)];
      this.wrapper[0].whenDeleteSelected = this.deleteWrapper;
    }
    this.whenDeleteSelected = function(e) { };
  }

  /**
   * Create a new wrapper around this GenericFunction; The wrapper
   * defaults to the Average Singleton. The new wrapper will be placed
   * between this GenericFunction and any existing wrapper functions.
   *
   * Sets wrapper.whenDeleteSelected to this.deleteWrapper.
   */
  addWrapper() {
    console.log(`A new wrapper funtion was added to ${this.type} ${this.title}`);
    let base = new GenericFunction('Singleton', 'Average', [], {});

    if (this.wrapper.length > 0) {
      base.wrapper = this.wrapper;
      this.wrapper[0].whenDeleteSelected = base.deleteWrapper;
    }

    this.wrapper = [base];
    base.whenDeleteSelected = this.deleteWrapper;
  }

  /**
   * Delete this GenericFunction's immediate wrapper while preserving
   * the wrapper function's wrappers. This GenericFunction's new
   * wrapper will be the deleted wrapper's wrappers (assuming any
   * exist).
   *
   * This function must be registered with all immediate wrappers.
   */
  deleteWrapper(wrapper) {
    this.wrapper = this.wrapper[0].wrapper;

    if (this.wrapper.length > 0) {
      this.wrapper[0].whenDeleteSelected = this.deleteWrapper;
    }
  }

  /**
   * Called when this title changes. If the title is set to Delete,
   * call whatever function is set as this.whenDeleteSelected.
   */
  changeTitle() {
    if (this.title === 'Average') {
      this.type = 'Singleton';
    } else if (this.title === 'Count') {
      this.type = 'Singleton';
    } else if (this.title === 'Percentile') {
      this.type = 'Percentile';
    } else if (this.title === 'Extrapolate') {
      this.type = 'Singleton';
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
}

class GenericDatasourceQueryCtrl extends QueryCtrl {
  /**
   * Create a GenericDatasourceQueryCtrl
   *
   * @param {Object} $scope
   * @param {Object} $injector
   * @param {Object} uiSegmentSrv
   */
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
    this.target.target_alias = this.target.target_alias||"";
    this.target.whereClauseGroup = this.target.whereClauseGroup || [[{'left':'Select Metric','op':'','right':''}]];
    this.target.inlineGroupOperator = this.target.inlineGroupOperator||[['']];
    this.target.outerGroupOperator = this.target.outerGroupOperator || [''];
    this.target.templateVariableValue = this.target.templateVariableValue || [''];   

    // Creates an array of GenericFunctions from existing data, or if
    // the data doesn't exist, setups a single GenericFunction.
    if (this.target.func === undefined) {
      this.target.func = [new GenericFunction('Aggregate', 'Aggregate', [], {root: true})];
    } else {
      this.target.func = this.target.func.map((f) => new GenericFunction(f.type, f.title, f.wrapper, f));
    }

    this.hiddenIndex = "";

    this.index = 0;
    this.parentIndex = 0;
    this.whereFieldOptions = [];
    this.getMetaFieldValues = this.getMetaFieldValues.bind(this);

    self = this;
  }

  addWhereClause(index) {
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

  addSegments(){
	this.target.metric_array.push('Select Metric');
  }

  removeSegment(index){
	this.target.metric_array.splice(index,1);
  }

  addValueSegments(){
    this.target.metricValues_array.push('Select Metric Value');
    this.target.metricValueAliases.push('');

    this.target.func.push(new GenericFunction('Aggregate', 'Aggregate', [], {root: true}));
  }

  removeValueSegment(index){
    this.target.metricValues_array.splice(index, 1);
    this.target.metricValueAliases.splice(index, 1);

    this.target.func.splice(index, 1);
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

  getMeasurementTypes() {
    return this.datasource.getMeasurementTypes()
      .then(this.uiSegmentSrv.transformToSegments(false));
  }

  getMeasurementTypeValues() {
    return this.datasource.getMeasurementTypeValues(this.target.series)
      .then(this.uiSegmentSrv.transformToSegments(false));
  }

  getMetaFields() {
    return this.datasource.getMetaFields(this.target.series)
      .then(this.uiSegmentSrv.transformToSegments(false))
      .catch(error => console.log(error));
  }

  getMetaFieldValues() {
    this.datasource.getMetaFieldValues(
      this.target.series,
      this.target.whereClauseGroup,
      this.parentIndex,
      this.index,
      arguments[1]
    );
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

export {GenericDatasourceQueryCtrl};
