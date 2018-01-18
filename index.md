---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: home
---

## 

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
