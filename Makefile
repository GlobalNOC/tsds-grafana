BUILD_NUMBER ?= 0

rpm:
	rpmbuild -bb globalnoc-tsds-datasource.spec --define "_sourcedir ${PWD}" --define="_buildno ${BUILD_NUMBER}"
doc:
	jsdoc -r src/*
