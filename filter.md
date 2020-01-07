---
layout: page
title: Template Variables
permalink: /variables/
published: true
---

To create a dynamic dashboard panels, template variables may be
defined. Template variables appear to the user as drop downs or input
boxes. The values selected by the user is then available to the
creator in any field in the visual query builder.

![]({{ "/assets/img/tmp-use.png" | relative_url }})

## Query

### Basic Example

A TSDS query can be used to generate values for a template variable.

![]({{ "/assets/img/tmp-query.png" | relative_url }})

To create a query based template variable create a new template
variable with type of `Query`. Set the Data source to `tsds` and then
populate Query with a TSDS query that returns a single
metric. Assuming the query is configured correctly the Preview will
list an example of the returned values.

![]({{ "/assets/img/tmp-query-config.png" | relative_url }})

### Search Template Variable

![]({{ "/assets/img/search-template-var.png" | relative_url }})

To create a search template variable create a mew template variable of type `Text box` and name it `Search`. The default value field under text options can be left empty. Next, create another template variable of type `Query` as shown in the basic example. Input the following query:

```json
{"type": "search", "get": ["node"], "by": "node", "from": "interface", "fields": ["node"], "search": "$Search",  "order_by": "node", "limit": "100", "text": "{{node}}", "value": "{{node}}"}
```

Preview of values should show all the nodes from the query. Click save and go back to the dashboard. Inputting any search term in the search box will now show any matching results as a drop down list.

## Adhoc filters

Adhoc filters can be added to a dashboard to allow the user to quickly
filter results by any TSDS metric. Use the `=` operator for exact
match, or the `=~` operator when searching for partial matches.

![]({{ "/assets/img/tmp-filter.png" | relative_url }})

To enable the adhoc filter menu, add a new template variable with a
type of `Ad hoc filters` and a Name of `interface`.

*Note: The Name **must** be `interface`.*

![]({{ "/assets/img/tmp-filter-config.png" | relative_url }})
