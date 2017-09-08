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
cp -ar %{_builddir}/* %{buildroot}%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler

%files
%{_datarootdir}/grnoc/globalnoc-tsds-datasource-handler
