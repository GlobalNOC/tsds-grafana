Summary: GlobalNOC TSDS Datasource
Name:    globalnoc-tsds-datasource
Version: 0.7.1
Release: %{_buildno}%{?dist}
License: Apache
Group:   GRNOC
URL:     https://globalnoc.iu.edu/
Source:  https://github.com/GlobalNOC/tsds-grafana/

BuildArch: noarch
BuildRoot: %(mktemp -ud %{_tmppath}/%{name}-%{version}-%{release}-XXXXXX)

BuildRequires: nodejs


%description
GlobalNOC TSDS Datasource

%prep
rm -rf %{_builddir}

mkdir -p %{_builddir}
cp -pr %{_sourcedir}/*  %{_builddir}

%build
npm install yarn
yarn install
yarn run build

%install
rm -rf $RPM_BUILDR_ROOT

%{__install} -d -p %{buildroot}%{_sharedstatedir}/grafana/plugins/globalnoc-tsds-datasource/dist
cp -ar %{_builddir}/dist/* %{buildroot}%{_sharedstatedir}/grafana/plugins/globalnoc-tsds-datasource/dist

%files
%{_sharedstatedir}/grafana/plugins/globalnoc-tsds-datasource/dist
