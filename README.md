# GlobalNOC TSDS Datasource

More documentation about datasource plugins can be found in the [Docs](https://github.com/grafana/grafana/blob/master/docs/sources/plugins/developing/datasources.md).

## Deployment

The RPM is generated based on `globalnoc-tsds-datasource.spec`. If you
want a release number other than `0` set the `BUILD_NUMBER`
environment variable.

```
make rpm
```

After installation verify the install was successful.

1. In Grafana, create a new GlobalNOC TSDS Datasource.
0. Click Save & Test to verify the Datasource is correctly configured.

## Development

This plugin requires node 6.10.0. Assuming this requirement is met you
can build the project.

```
make dev
```

Software documentation can also be generated if desired.

```
make doc
```

Add the plugin to grafana.

```
sudo ln -s $PWD/dist /var/lib/grafana/plugins/globalnoc-tsds-datasource/dist
```
