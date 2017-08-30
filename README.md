# tsds-grafana
Exploratory work to integrate grafana into tsds API

## Getting started

Install the typescript compiler and yarn.

```
sudo npm install -g typescript
sudo npm install -g yarn
```

Build the project.

```
yarn install
npm run build
```

Add the plugin to grafana.

```
sudo ln -s $PWD/customized-grafana-datasource /var/lib/grafana/plugins/customized-grafana-datasource
```

Create a new GlobalNOC TSDS DataSource through the Grafana frontend.

Click Save & Test to verify the DataSource is correctly configured.
