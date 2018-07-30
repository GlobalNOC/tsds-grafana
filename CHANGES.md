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
