## globalnoc-tsds-datasource-handler

### RPM setup

```
export BUILD_NUMBER=0
rpmbuild -bb globalnoc-tsds-datasource-handler.spec --define "_sourcedir $(pwd)" --define="_buildno ${BUILD_NUMBER}"
```
