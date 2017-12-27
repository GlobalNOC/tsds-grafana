## globalnoc-tsds-datasource-handler

globalnoc-tsds-datasource-handler is a python based CGI that
translates requests from globalnoc-tsds-datasource to the configured
TSDS backend.

### Deployment

Use `make rpm` to generate an RPM based on
`globalnoc-tsds-datasource-handler.spec`. Set the `BUILD_NUMBER`
environmnet variable to use a release number other than 0.
