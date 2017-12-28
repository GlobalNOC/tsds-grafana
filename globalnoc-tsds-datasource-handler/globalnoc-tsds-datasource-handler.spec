Summary: GlobalNOC TSDS Datasource
Name:    globalnoc-tsds-datasource-handler
Version: 0.1.3
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
%{__install} %{_builddir}/cgi-bin/tsds_grafana_handler.py %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler/tsds_grafana_handler.py

%{__install} -d -p %{buildroot}%{_sysconfdir}/grnoc/globalnoc-tsds-datasource-handler
%{__install} %{_builddir}/conf/config.json %{buildroot}%{_sysconfdir}/grnoc/globalnoc-tsds-datasource-handler/config.json

%{__install} -d -p %{buildroot}%{_sysconfdir}/httpd/conf.d
%{__install} etc/globalnoc-tsds-datasource-handler.conf %{buildroot}%{_sysconfdir}/httpd/conf.d/globalnoc-tsds-datasource-handler.conf

%files
%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler
%{_sysconfdir}/grnoc/globalnoc-tsds-datasource-handler

%config(noreplace) %{_sysconfdir}/grnoc/globalnoc-tsds-datasource-handler/config.json

%config(noreplace) %{_sysconfdir}/httpd/conf.d/globalnoc-tsds-datasource-handler.conf
