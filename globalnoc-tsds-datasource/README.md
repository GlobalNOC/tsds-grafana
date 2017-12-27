## GlobalNOC TSDS Datasource

More documentation about datasource plugins can be found in the [Docs](https://github.com/grafana/grafana/blob/master/docs/sources/plugins/developing/datasources.md).

### Example backend implementations
- https://github.com/bergquist/fake-simple-json-datasource

### Deployment

1. Use make rpm to generate an RPM based on
`globalnoc-tsds-datasource.spec`. Set the `BUILD_NUMBER` environmnet
variable to use a release number other than 0.
0. In Grafana, create a new GlobalNOC TSDS Datasource.
0. Click Save & Test to verify the Datasource is correctly configured.

### Development

This plugin requires node 6.10.0

```
npm install -g yarn
yarn install
npm run build
```

Add the plugin to grafana.

```
sudo ln -s $PWD/customized-grafana-datasource /var/lib/grafana/plugins/customized-grafana-datasource
```
