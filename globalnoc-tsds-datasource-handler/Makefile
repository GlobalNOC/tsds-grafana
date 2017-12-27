BUILD_NUMBER ?= 0

rpm:
	rpmbuild -bb globalnoc-tsds-datasource-handler.spec --define "_sourcedir ${PWD}" --define="_buildno ${BUILD_NUMBER}"
