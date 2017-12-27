## GlobalNOC TSDS Datasource

More documentation about datasource plugins can be found in the [Docs](https://github.com/grafana/grafana/blob/master/docs/sources/plugins/developing/datasources.md).

### Example backend implementations
- https://github.com/bergquist/fake-simple-json-datasource

### Deployment

Use make rpm to generate an RPM based on
`globalnoc-tsds-datasource.spec`. Set the `BUILD_NUMBER` environmnet
variable to use a release number other than 0.

### Development

This plugin requires node 6.10.0

```
npm install -g yarn
yarn install
npm run build
```
