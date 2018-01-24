BUILD_NUMBER ?= 0

dev:
	yarn install
	npm run build
rpm:
	rpmbuild -bb globalnoc-tsds-datasource.spec --define "_sourcedir ${PWD}" --define="_buildno ${BUILD_NUMBER}"
doc:
	jsdoc -r src/*
