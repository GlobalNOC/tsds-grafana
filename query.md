---
layout: page
title: Query Builder
permalink: /query/
---

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

## Raw Query Builder

In some cases it may be impossible to compose a desired query in the
Visual Query Builder. To work directly with the TSDS query language
edit the desired panel, select the hamburger menu, and click `Toggle
Edit Mode`.

![]({{ "/assets/img/raw-toggle.png" | relative_url }})

This will reveal the raw query editor. Click `Toggle Edit Mode` again
to return to the Visual Query Builder.

![]({{ "/assets/img/raw-query.png" | relative_url }})

## Special Variables

Special variables exist to help generate queries or describe datasets.

### `$END`

This variable is the currently selected end time on the Grafana
frontend. This can be used with the raw query editor and when creating
template variables based on queries.

### `$START`

This variable is the currently selected start time on the Grafana
frontend. This can be used with the raw query editor and when creating
template variables based on queries.

### `$TIMESPAN`

This variable is the duration or amount of time between the currently
selected start and end time on the Grafana frontend. This is only
relevant when using the raw query editor.

### `$VALUE`

This variable is used for naming datasets. See Custom target naming
under Target names for more information.
