## GRNOC TSDS Grafana 0.4.0 -- Fri Jul 24 2020

* Fixed issue where table mode data would only work when dashboard was in UTC mode
* Added support for $__searchFilter in template variables, added in Grafana 6.5
* Updating some build requirements, misc security fixes


## GRNOC TSDS Grafana 0.3.5 -- Thu Aug 7 2019

* Added support to represent each single stat value as a column of its own in table mode
* Added support for search template variable to use multiple terms

## GRNOC TSDS Grafana 0.3.4 -- Fri June 7 2019

* Fixed issue where home dashboard runs a query when the datasource is marked as default
* Added support to handle processing of hidden queries to plugin.json as suggested for Grafana v6.2
* Updated packages with potential security vulnerabilities

## GRNOC TSDS Grafana 0.3.3 -- Wed Apr 24 2019

* Fixed issue with datapoints that have a 0 value that was causing panel errors

## GRNOC TSDS Grafana 0.3.2 -- Wed Apr 10 2019

* Added the ability to have a column for each metadata field
* Added the ability to format the date using momentjs format strings in the table mode
* Added ability to show only metadata without values in a table
* Added ability to specify combine by when 'combine all series' is checked
* Fixed an issue where wrapper function fails when used with combine all

## GRNOC TSDS Grafana 0.3.1 -- Thu Mar 21 2019

### Features

* Ability to align data by week, month, or year from within the options
* Added aliasing support for align
* Added UTC support for table data

## GRNOC TSDS Grafana 0.3.0 -- Wed Feb 6 2019

### Features

* Fixing wrapper function combine all series bug

## GRNOC TSDS Grafana 0.2.9 -- Mon Jan 14 2019

### Features

* Bug Fix to handle aliasing when multi-select template variables are used for targets along with wrapper functions

## GRNOC TSDS Grafana 0.2.8 -- Mon Dec 3 2018

### Features

* Bug Fix to handle special characters in the query by encoding the query string.

## GRNOC TSDS Grafana 0.2.7 -- Tue Nov 20 2018

### Features

* Optimized template variables to allow for using 'in' operators for more efficient queries.
* Support for the case where search values could be empty.
* Added percentile/extrapolate to be shown as a line instead of showing it as a single point.
* Replaced multipart/form-data with application/x-www-form-urlencoded.
* Fixed aliasing bug by trimming trailing spaces in the keys of alias mapping object.


## GRNOC TSDS Grafana 0.2.6 -- Fri Sep 21 2018

### Features

* Fixed issue where panels with multiple queries would return results in a inconsistent order
between different reloads. Data is now always returned for query A first, then query B, etc.
* Fixed issue where empty template variables used in queries would generate syntactically invalid
queries. Queries are now generated properly with no results.


## GRNOC TSDS Grafana 0.2.5 -- Tue Aug 28 2018

### Features

* Ability to define a static portion of the where clause in a search template variable
* Imporved ability to use strings with escaped regular expression characters in template variable queries
* Added default value of '.*' to terms when doing a search when the variable has no value set

## GRNOC TSDS Grafana 0.2.4 -- Thu Aug 6 2018

### Features

* Bug Fix for math operation not being applied to the regular query
* Bug Fix for template variables to be used for bucket size with combine all series functionality

## GRNOC TSDS Grafana 0.2.3 -- Wed July 25 2018

### Features

* Added support for 'null' to be used as a keyword.
* Fixed legend order to remain consistent
* Added Combine All Series functionality
* Fixed use of multi-select template variable used in get field to work with math operations and combine all series functionality

## GRNOC TSDS Grafana 0.2.2 -- Mon May 7 2018

### Features

* Added expandable options to the visual query builder to put all the options under a collapsible region.
* Added support for tsds math operations.
* Added empty default for existing queries.
* Added the ability to provide multiple template variables within a string in the where clause.
* Fixed issue with sort when null datapoints are present.

## GRNOC TSDS Grafana 0.2.1 -- Thu Mar 8 2018

### Features

* Added ability to exclusively query metadata.
* Fixed substring replacement for extrapolation functions.
* Added target naming for manual query mode.
* Fixed multi-value temp vars rendering incorrectly.
* Added support for table generation. Data can be now formatted as a table to create tables.
* Added Search functionality with Template variables. Added a new query type “search” to support this.
* Fixed order by to order legend based on query results.
* Changed `_index` to `index` of templateSrv to support grafana 5.0.1.

## GRNOC TSDS Grafana 0.2.0 -- Fri Feb 9 2018

### Features

* Big overhaul. Complete removal of python middleware package. All work is now performed in the Javascript driver.
* Changed the way that template variable queries are defined to support more operations. Backwards compatibility is maintained for now.
* Tidied up the way bucket size calculations are computed to be more consistent and prettier.
* Fixed "datapoints out of range" error in a number of single number queries.
* Fixed issue where sub-fields in metadata were not being parsed properly.
* Fixed issue where multiple ad-hoc filters could generate a bad query.
* Don't automatically include $VALUE if not requested during target aliasing.
* Lots of repository cleanup.

## GRNOC TSDS Grafana 0.1.3 -- Tue Dec 12 2017

### Features

*  Added Group By and Order By functionality.
*  Added Template Variable functionality and support for multiple selection template variables. 
*  Added query editor validation, error reporting support for the Grafana inspector.
*  Added new aggregate function - Sum. 
*  Added support for nested methods.
*  Added support for adding and deleting Wrapper functions.
*  Support for auto complete dropdown for tables, selects, where in query editor.
*  Support for new response object to handle response.
*  Modified test case to support new response object.
