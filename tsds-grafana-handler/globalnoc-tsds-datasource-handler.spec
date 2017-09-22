Summary: GlobalNOC TSDS Datasource
Name:    globalnoc-tsds-datasource-handler
Version: 0.1.0
Release: %{_buildno}%{?dist}
License: Apache
Group:   GRNOC
URL:     https://globalnoc.iu.edu/
Source:  https://github.com/GlobalNOC/tsds-grafana/

BuildArch: noarch
BuildRoot: %(mktemp -ud %{_tmppath}/%{name}-%{version}-%{release}-XXXXXX)

BuildRequires: nodejs


%description
GlobalNOC TSDS Datasource Handler

%prep
rm -rf %{_builddir}

mkdir -p %{_builddir}
cp -pr %{_sourcedir}/*  %{_builddir}

%build

%install
rm -rf $RPM_BUILDR_ROOT

%{__install} -d -p %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler

%{__install} %{_builddir}/create_dashboard.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/create_dashboard.py
%{__install} %{_builddir}/dashboard_handler.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/dashboard_handler.py
%{__install} %{_builddir}/delete_dash.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/delete_dash.py
%{__install} %{_builddir}/query_handler.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/query_handler.py
%{__install} %{_builddir}/search_handler.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/search_handler.py
%{__install} %{_builddir}/test.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/test.py
%{__install} %{_builddir}/tsds_grafana_handler.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/tsds_grafana_handler.py

%{__install} -d -p %{buildroot}%{_sysconfdir}/grnoc/globalnoc-tsds-datasource-handler

%{__install} %{_builddir}/config.json %{buildroot}%{_sysconfdir}/grnoc/globalnoc-tsds-datasource-handler/config.json

%files
%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler
%{_sysconfdir}/grnoc/globalnoc-tsds-datasource-handler
