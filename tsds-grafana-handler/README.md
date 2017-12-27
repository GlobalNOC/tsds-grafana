## globalnoc-tsds-datasource-handler

globalnoc-tsds-datasource-handler is a python CGI that translates
requests from globalnoc-tsds-datasource to the configured TSDS
backend.

### RPM setup

```
export BUILD_NUMBER=0
rpmbuild -bb globalnoc-tsds-datasource-handler.spec --define "_sourcedir $(pwd)" --define="_buildno ${BUILD_NUMBER}"
```
