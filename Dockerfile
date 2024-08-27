FROM oraclelinux:8.10

# COPY globalnoc.repo /etc/yum.repos.d/globalnoc.repo
# COPY oracle-linux-ol8.repo /etc/yum.repos.d/oracle-linux-ol8.repo
# COPY oracle-epel-ol8.repo /etc/yum.repos.d/oracle-epel-ol8.repo

RUN yum makecache
# RUN dnf module reset ruby -y
# RUN yum install -y git make automake gcc rpmdevtools python38 @ruby:3.1 && yum install ruby-devel
RUN rpmdev-setuptree


# RUN yum install 

RUN sudo yum install -y yarn

COPY . /workspace
WORKDIR /workspace


RUN yarn install
RUN yarn build

RUN rpmbuild -bb globalnoc-tsds-datasource.spec --define "_sourcedir ${PWD}" --define="_buildno 0"


RUN ls -la

# RUN yum install ./agathor-0.1.0-1.x86_64.rpm