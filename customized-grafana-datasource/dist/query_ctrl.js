'use strict';

System.register(['app/plugins/sdk', './css/query-editor.css!'], function (_export, _context) {
  "use strict";

  var QueryCtrl, _createClass, GenericDatasourceQueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      QueryCtrl = _appPluginsSdk.QueryCtrl;
    }, function (_cssQueryEditorCss) {}],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('GenericDatasourceQueryCtrl', GenericDatasourceQueryCtrl = function (_QueryCtrl) {
        _inherits(GenericDatasourceQueryCtrl, _QueryCtrl);

        function GenericDatasourceQueryCtrl($scope, $injector, uiSegmentSrv) {
          _classCallCheck(this, GenericDatasourceQueryCtrl);

          var _this = _possibleConstructorReturn(this, (GenericDatasourceQueryCtrl.__proto__ || Object.getPrototypeOf(GenericDatasourceQueryCtrl)).call(this, $scope, $injector));

          _this.scope = $scope;
          _this.uiSegmentSrv = uiSegmentSrv;
          _this.target.series = _this.target.series || 'select table';
          _this.target.type = _this.target.type || 'timeserie';
          _this.target.condition = _this.target.condition || [];
          //this.target.groupby_field = this.target.groupby_field||[]; 
          _this.target.groupby_field = _this.target.groupby_field || ' ';
          _this.target.metric_array = _this.target.metric_array || ['Select Metric'];
          _this.target.metricValues_array = _this.target.metricValues_array || ['Select Metric Value'];
          _this.target.aggregator = _this.target.aggregator || ['average'];
          _this.target.target_alias = _this.target.target_alias || "";
          _this.target.whereClauseGroup = _this.target.whereClauseGroup || [[{ 'left': 'Select Metric', 'op': '', 'right': '' }]];
          _this.target.inlineGroupOperator = _this.target.inlineGroupOperator || [['']];
          _this.target.outerGroupOperator = _this.target.outerGroupOperator || [''];
          _this.target.percentileValue = _this.target.percentileValue || [''];
          _this.target.bucket = _this.target.bucket || [];
          _this.target.bucketValue = _this.target.bucketValue || [];
          _this.target.drillDownAlias = "";
          _this.index = "";
          _this.parentIndex = "";
          _this.hiddenIndex = "";
          _this.target.drillDown = [];
          _this.target.drillDownValue = [];
          self = _this;
          return _this;
        }

        _createClass(GenericDatasourceQueryCtrl, [{
          key: 'addWhereClause',
          value: function addWhereClause(index) {
            this.target.whereClauseGroup[index].push({ 'left': 'Select Metric', 'op': '=', 'right': '' });
          }
        }, {
          key: 'removeWhereClause',
          value: function removeWhereClause(parentIndex, index) {
            this.target.whereClauseGroup[parentIndex].splice(index, 1);
            if (this.target.whereClauseGroup[parentIndex].length == 0 && parentIndex > 0) {
              this.target.whereClauseGroup.splice(parentIndex, 1);
            }
          }
        }, {
          key: 'addWhereClauseGroup',
          value: function addWhereClauseGroup() {
            this.target.whereClauseGroup.push([{ 'left': 'Select Metric', 'op': '', 'right': '' }]);
            this.target.inlineGroupOperator.push(['']);
          }
        }, {
          key: 'getOperator',
          value: function getOperator() {
            return this.datasource.findOperator();
          }
        }, {
          key: 'addSegments',
          value: function addSegments() {
            this.target.metric_array.push('Select Metric');
          }
        }, {
          key: 'removeSegment',
          value: function removeSegment(index) {
            this.target.metric_array.splice(index, 1);
          }
        }, {
          key: 'addValueSegments',
          value: function addValueSegments() {
            this.target.metricValues_array.push('Select Metric Value');
            this.target.aggregator.push('average');
            this.target.percentileValue.push('');
          }
        }, {
          key: 'removeValueSegment',
          value: function removeValueSegment(index) {
            this.target.metricValues_array.splice(index, 1);
          }
        }, {
          key: 'addGroupBy',
          value: function addGroupBy() {
            this.target.groupby_field.push('Select Column');
            console.log(this.target.groupby_field);
          }
        }, {
          key: 'removeGroupBy',
          value: function removeGroupBy(index) {
            this.target.groupby_field.splice(index, 1);
          }
        }, {
          key: 'addBucket',
          value: function addBucket(index) {
            this.target.bucket.splice(index, 0, 'bucket');
            this.target.bucketValue.splice(index, 0, '');
          }
        }, {
          key: 'getColumns',
          value: function getColumns() {
            return this.datasource.findMetric(this.target, "Column").then(this.uiSegmentSrv.transformToSegments(false));
          }
        }, {
          key: 'getMetricValues',
          value: function getMetricValues() {
            return this.datasource.findMetric(this.target, "Value").then(this.uiSegmentSrv.transformToSegments(false));
          }
        }, {
          key: 'getTableNames',
          value: function getTableNames() {
            return this.datasource.metricFindTables(this.target).then(this.uiSegmentSrv.transformToSegments(false));
          }
        }, {
          key: 'getWhereFields',
          value: function getWhereFields() {
            return self.datasource.findWhereFields(self.target, self.parentIndex, self.index, arguments[0], arguments[1]);
          }
        }, {
          key: 'generateDrillDown',
          value: function generateDrillDown() {
            this.target.drillDown.splice(0, 0, 'Drill');
          }
        }, {
          key: 'createDashboard',
          value: function createDashboard() {
            var r = this.datasource.generateDashboard(this.target, this.panelCtrl.$scope.ctrl.range.from.toISOString(), this.panelCtrl.$scope.ctrl.range.to.toISOString(), this.panelCtrl.dashboard.title, this.datasource.name);
            window.location.reload();
            return r;
          }
        }, {
          key: 'saveIndices',
          value: function saveIndices(parentIndex, index) {
            this.parentIndex = parentIndex;
            this.index = index;
          }
        }, {
          key: 'toggleEditorMode',
          value: function toggleEditorMode() {
            this.target.rawQuery = !this.target.rawQuery;
          }
        }, {
          key: 'onChangeInternal',
          value: function onChangeInternal() {
            this.panelCtrl.refresh();
          }
        }]);

        return GenericDatasourceQueryCtrl;
      }(QueryCtrl));

      _export('GenericDatasourceQueryCtrl', GenericDatasourceQueryCtrl);

      GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
    }
  };
});
//# sourceMappingURL=query_ctrl.js.map
