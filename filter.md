---
layout: page
title: Template Variables
permalink: /variables/
---

To create a dynamic dashboard panels, template variables may be
defined. Template variables appear to the user as drop downs or input
boxes. The values selected by the user is then available to the
creator in any field in the visual query builder.

![]({{ "/assets/img/tmp-use.png" | relative_url }})

## Query

A TSDS query can be used to generate values for a template variable.

![]({{ "/assets/img/tmp-query.png" | relative_url }})

To create a query based template variable create a new template
variable with type of `Query`. Set the Data source to `tsds` and then
populate Query with a TSDS query that returns a single
metric. Assuming the query is configured correctly the Preview will
list an example of the returned values.

![]({{ "/assets/img/tmp-query-config.png" | relative_url }})

## Adhoc filters

Adhoc filters can be added to a dashboard to allow the user to quickly
filter results by any TSDS metric. Use the `=` operator for exact
match, or the `=~` operator when searching for partial matches.

![]({{ "/assets/img/tmp-filter.png" | relative_url }})

To enable the adhoc filter menu, add a new template variable with a
type of `Ad hoc filters` and a Name of `interface`.

*Note: The Name **must** be `interface`.*

![]({{ "/assets/img/tmp-filter-config.png" | relative_url }})
