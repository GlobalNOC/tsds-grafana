---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: home
---

## Getting Started

### Adding the TSDS Datasource

After you've installed the datasource and restarted Grafana you can
configure the TSDS Datasource. Under Grafana's main menu click Data
Sources. The next page will list all currently configured Data
Sources. Click the + Add data source button.

Give the data source a name like tsds, and select GlobalNOC TSDS as
the Type. Under Http settings you'll want to input the URL to the
plugin's TSDS middleware. This is usually installed on the same host
as TSDS and will end with `tsds_grafana_handler.py`. Set the Access to
proxy.

It's likely that the middleware will be protected with user
permissions. If the middleware is protected by basic auth select Basic
Auth, select With Credentials, and then input the user credentials you
wish to use. Other authentication methods are not covered in this
guide.

### Crafting your first query

To get familiar with the visual query builder let's walk though a
simple example. Assuming you've already created a new dashboard create
a new panel of type Graph. Click edit.

To craft our TSDS query, we first tell Grafana we want to use the TSDS
datasource. Select the Metrics tab if you haven't already. Then change
the Panel Data Source from `default` to `tsds`. You should now see the
visual query builder.

![]({{ "/assets/img/first-datasource.png" | relative_url }})

In the `From` row, click the dropdown and select `interface`. This
specifies that we wish to query for the measurement type `interface`.

![]({{ "/assets/img/first-from.png" | relative_url }})

In the `Get` row, leave everything as it is. While this is the most
important part of the visual query builder, the default (average input
over time) is a good first example.

![]({{ "/assets/img/first-get.png" | relative_url }})

In the `Metadata` row, click the dropdown and select `node`. Click
the + button and select `intf`. This defines how the results of the
query are identified. In our case, each series returned will be
identified by its associated node and interface
name. *E.g. ethernet3/2 rtr.newy32aoa.neaar.net*

![]({{ "/assets/img/first-metadata.png" | relative_url }})

In the `Group By` row, insert `node, intf`. This ensures that every
series is averaged over unique node, interface pairs. If we only
specified `node`, the series would graph the average input over all
interfaces on a node.

![]({{ "/assets/img/first-group-by.png" | relative_url }})

In the `Where` row, select `node` from the dropdown. Select `=` from
the operator dropdown. Finally type the `r` character in the input
box; This should expose some devices via auto-complete.

![]({{ "/assets/img/first-where.png" | relative_url }})

Pick one. If you don't see any data, try again until you see data on
your graph.

![]({{ "/assets/img/first-result.png" | relative_url }})

---

## Visual Query Builder

### Get function

Get functions define what data is retrieved and how that data is
graphed for the user. Every function has an innermost aggregate
function, but may also include wrapper functions.

#### Aggregate

The aggregate function is composed of three parts and is usually quite
simple, "Give me the average input for every 5 minute interval." In
this example the three parts are the aggregation type (average), the
value we're selecting (input), and the bucket size to aggregate over
(300 seconds).

The aggregation type defines how every data point in a bucket is
combined (average, max, min, etc.); The selected value defines which
field the aggregation type is applied to; And the bucket size
determines the time period over which the aggregation function is
applied. If we select a 3 hour time period and a bucket size of 300
seconds (5 minutes), then a total of 36 points are graphed.

#### Wrapper

It's also possible to apply wrapper functions to the result of an
aggregate function. These functions combine the results of the
aggregate function into a single value. To add a wrapper function,
click the `+` button to the left of the aggregate function. You might
use this to find the max bandwidth of 6 hour averages for the past
year. This would give you a rough idea of load during your peak hour
last year.

### Metadata

Every Metadata field added to the query will be added to the target
name of each series.

### Where clause

Where clause is used to define a set of filters on the data to be
retrieved. For example, to get data of a particular node -
`rtr.newy32aoa.neaar.net` , select `node` from the where dropdown list
and select the `=` operator from the operator dropdown. Now, select
`rtr.newy32aoa.neaar.net`. Running this query would give the data of
all the interfaces on this node.

More than one filter conditions can be combined to make **groups** to
filter the data down even further. As an example, let us see the data
of a particular interface `ethernet3/1` and node
`rtr.newy32aoa.neaar.net`.

* Select `Add rule +` button. This will add another rule separated by a logical operator.
* Select `and` from the dropdown for the logical operator.
* Select `intf` from the `Select Metric` dropdown.
* Select `=` from the operator dropdown.
* Finally, select `ethernet3/1` for the target name.

Running this query should give the data corresponding to the interface
`ethernet3/1` of the node `rtr.newy32aoa.neaar.net`.

#### Adding multiple groups

We can also combine multiple filter groups and filter down the
data. The example above would give the data for interface
`ethernet3/1` of the node `rtr.newy32aoa.neaar.net`. As an example,
let us add an extra filter group for the interface `ethernet1/2` of
node `rtr.seat.traspac.org` by clicking on the `Add Group +` button
and following the steps described above. Now, select `or` from the
operator dropdown list between the two groups. This should give the
data for both the groups allowing us to visualize and compare the data
on the graph.

### Group By

Group By is used to determine how results are combined. A Group By of
`node, intf` creates a series for every (node, intf) pair. If however
Group By is set to just `node`, only a single series combining all
results will be returned.

### Order By

Order By is a comma separated list of Metadata fields used to sort the
resulting series. Results are sorted in lexicographic order by the
first field followed by the next if required.

### Target names

Target names, also referred to as series names, are the labels given
to each line on a graph. By default the target name of each series
will contain a human readable version its function, and all requested
Metadata values.

#### Aliases

Each Get function is translated into a human readable form and
included in the target name of each series. These functions typically
look something like `Input (1m averages)`; This roughly translates to
"average input every minute". If you don't believe this form is useful
for your particular case or a customer asks for something different
you can define an alias. Use the alias input box on the far right of
each Get function to define a custom function name. *E.g. average
input*

#### Custom target naming

It's possible to create customized target names by populating the
Target Name input box. Each Metadata value you've selected may be used
in the target name.

If you've created a panel with `node` and `intf` as Metadata values,
an empty Target Name box will yield something like `Input (1m
averages) ethernet3/1 rtr.newy32aoa.neaar.net` as a target name in the
graph legend. If however you specify `$intf` in the Target Name box,
the legend will omit the node name and contain a result that look
something like `Input (1m averages) ethernet3/1`.

You might also wish to change the arrangement of Metadata in the
target names. Input `$intf $VALUE` in the Target Name box. Target
names now take the form `ethernet3/1 Input (1m averages)`.

In the above example we used the special `$VALUE` variable. This
variable contains the value of the function name or alias if it was
defined.

### Special Variables

Special variables exist to help generate queries or describe datasets.

#### $END

This variable is the currently selected end time on the Grafana
frontend. This can be used with the raw query editor and when creating
template variables based on queries.

#### $START

This variable is the currently selected start time on the Grafana
frontend. This can be used with the raw query editor and when creating
template variables based on queries.

#### $TIMESPAN

This variable is the duration or amount of time between the currently
selected start and end time on the Grafana frontend. This is only
relevant when using the raw query editor.

#### $VALUE

This variable is used for naming datasets. See Custom target naming
under Target names for more information.

---

## Raw Query Builder

In some cases it may be impossible to compose a desired query in the
Visual Query Builder. To work directly with the TSDS query language
edit the desired panel, select the hamburger menu, and click `Toggle
Edit Mode`.

![]({{ "/assets/img/raw-toggle.png" | relative_url }})

This will reveal the raw query editor. Click `Toggle Edit Mode` again
to return to the Visual Query Builder.

![]({{ "/assets/img/raw-query.png" | relative_url }})

---

## Advanced Topics

### Template Variables

To create a dynamic dashboard panels, template variables may be
defined. Template variables appear to the user as drop downs or input
boxes. The values selected by the user is then available to the
creator in any field in the visual query builder.

![]({{ "/assets/img/tmp-use.png" | relative_url }})

#### Query

A TSDS query can be used to generate values for a template variable.

![]({{ "/assets/img/tmp-query.png" | relative_url }})

To create a query based template variable create a new template
variable with type of `Query`. Set the Data source to `tsds` and then
populate Query with a TSDS query that returns a single
metric. Assuming the query is configured correctly the Preview will
list an example of the returned values.

![]({{ "/assets/img/tmp-query-config.png" | relative_url }})

#### Adhoc filters

Adhoc filters can be added to a dashboard to allow the user to quickly
filter results by any TSDS metric. Use the `=` operator for exact
match, or the `=~` operator when searching for partial matches.

![]({{ "/assets/img/tmp-filter.png" | relative_url }})

To enable the adhoc filter menu, add a new template variable with a
type of `Ad hoc filters` and a Name of `interface`.

*Note: The Name **must** be `interface`.*

![]({{ "/assets/img/tmp-filter-config.png" | relative_url }})
