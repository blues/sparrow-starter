import { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useQuery } from "react-query";
import { isEmpty } from "lodash";
import { Card, Input, Button, Tabs, Row, Col, Tooltip, Select } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import { Store } from "antd/lib/form/interface";
import { ValidateErrorEntity } from "rc-field-form/lib/interface";
import { ParsedUrlQuery } from "querystring";
import Form, { FormProps } from "../../../../components/elements/Form";
import {
  getErrorMessage,
  HISTORICAL_SENSOR_DATA_MESSAGE,
  NODE_MESSSAGE,
} from "../../../../constants/ui";
import NodeDetailsLineChart from "../../../../components/charts/NodeDetailsLineChart";
import NodeDetailsBarChart from "../../../../components/charts/NodeDetailsBarChart";
import NodeDetailViewModel from "../../../../models/NodeDetailViewModel";
import { getNodeDetailsPresentation } from "../../../../components/presentation/nodeDetails";
import TemperatureSensorSchema from "../../../../components/models/readings/TemperatureSensorSchema";
import HumiditySensorSchema from "../../../../components/models/readings/HumiditySensorSchema";
import VoltageSensorSchema from "../../../../components/models/readings/VoltageSensorSchema";
import PressureSensorSchema from "../../../../components/models/readings/PressureSensorSchema";
import CountSensorSchema from "../../../../components/models/readings/CountSensorSchema";
import { getGateway } from "../../../../api-client/gateway";
import { getNode, getNodeData } from "../../../../api-client/node";
import { LoadingSpinner } from "../../../../components/layout/LoadingSpinner";
import Gateway from "../../../../components/models/Gateway";
import styles from "../../../../styles/Home.module.scss";
import detailsStyles from "../../../../styles/Details.module.scss";

// custom interface to avoid UI believing query params can be undefined when they can't be
interface SparrowQueryInterface extends ParsedUrlQuery {
  gatewayUID: string;
  nodeId: string;
  minutesBeforeNow?: string; // this value is a string to it can be a query param
}

const NodeDetails: NextPage = () => {
  const [viewModel, setViewModel] = useState<NodeDetailViewModel>({});
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | undefined>(undefined);

  const { TabPane } = Tabs;
  const { Option } = Select;
  const { query } = useRouter();

  // neither of these values will ever be null because the URL path depends on them to render this page
  const { gatewayUID, nodeId, minutesBeforeNow } =
    query as SparrowQueryInterface;
  const nodeUrl = `/${gatewayUID}/node/${nodeId}/details`;

  const {
    isLoading: gatewayLoading,
    error: gatewayError,
    data: gateway,
  } = useQuery<Gateway, Error>("getGateway", () => getGateway(gatewayUID), {
    enabled: !!gatewayUID,
  });

  const {
    isRefetching: nodeRefetching, // for when we update the node name
    isLoading: nodeLoading,
    error: nodeError,
    data: node,
    refetch: nodeRefetch,
  } = useQuery<Node, Error>("getNode", () => getNode(gatewayUID, nodeId), {
    enabled: !!gatewayUID && !!nodeId,
    refetchInterval: 40000,
  });

  const {
    isLoading: readingsLoading,
    error: readingsError,
    data: readings,
    refetch: nodeReadingsRefetch,
  } = useQuery<unknown, Error>(
    "getNodeData",
    () => getNodeData(gatewayUID, nodeId, minutesBeforeNow),
    {
      enabled: !!gatewayUID && !!nodeId,
      refetchInterval: 60000,
    }
  );

  useEffect(() => {
    if (gateway && node && readings) {
      const nodeModel: NodeDetailViewModel = getNodeDetailsPresentation(
        node,
        gateway,
        readings
      );
      setViewModel(nodeModel);
    }
  }, [gateway, node, readings]);

  useEffect(() => {
    if (gatewayLoading) {
      setIsLoading(true);
    }
    if (nodeLoading || nodeRefetching) {
      setIsLoading(true);
    }
    if (readingsLoading) {
      setIsLoading(true);
    }
    if (!gatewayLoading && !nodeLoading && !readingsLoading) {
      setIsLoading(false);
    }
  }, [gatewayLoading, nodeLoading, nodeRefetching, readingsLoading]);

  useEffect(() => {
    if (gatewayError) {
      setErr(getErrorMessage(gatewayError.message));
    }
    if (nodeError) {
      setErr(getErrorMessage(nodeError.message));
    }
    if (readingsError) {
      setErr(getErrorMessage(readingsError.message));
    }
    if (!gatewayError && !nodeError && !readingsError) {
      setErr(undefined);
    }
  }, [gatewayError, nodeError, readingsError]);

  const router = useRouter();

  const handleDateRangeChange = async (value: string) => {
    // call this function to force a page update with new chart date range
    await router.replace({
      pathname: `${nodeUrl}`,
      query: { minutesBeforeNow: value },
    });
    await nodeReadingsRefetch();
  };

  const formItems: FormProps[] = [
    {
      label: (
        <h3
          data-testid="current-readings"
          className={detailsStyles.tabSectionTitle}
        >
          Current Readings
        </h3>
      ),
      contents: (
        <div className={detailsStyles.nodeFormTimestamp}>
          Last updated{` `}
          {viewModel.node?.lastActivity}
        </div>
      ),
    },
    {
      label: "Name",
      name: "name",
      tooltip: "What is the name of your node?",
      initialValue:
        viewModel.node?.name !== NODE_MESSSAGE.NO_NAME
          ? viewModel.node?.name
          : undefined,
      rules: [{ required: true, message: "Please add the name of your node" }],
      contents: (
        <Input
          data-testid="form-input-node-name"
          placeholder="Name of node"
          maxLength={49}
          showCount
        />
      ),
    },
    {
      label: "Location",
      name: "location",
      tooltip: "Where is your node located?",
      initialValue:
        viewModel.node?.location !== NODE_MESSSAGE.NO_LOCATION
          ? viewModel.node?.location
          : undefined,
      rules: [
        { required: true, message: "Please add the location of your node" },
      ],
      contents: (
        <Input
          data-testid="form-input-node-location"
          placeholder="Node location"
          maxLength={15}
          showCount
        />
      ),
    },
    {
      contents: (
        <Button data-testid="form-submit" htmlType="submit" type="primary">
          Save Changes
        </Button>
      ),
    },
  ];

  const formOnFinish = async (values: Store) => {
    // TODO: Move this to the app service / data provider
    const response = await axios.post(
      `/api/gateway/${gatewayUID}/node/${nodeId}/config`,
      values
    );
    console.log(`Success`);
    console.log(response);

    if (response.status < 300) {
      await nodeRefetch();
    }
  };

  const formOnFinishFailed = (errorInfo: ValidateErrorEntity) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <LoadingSpinner isLoading={isLoading}>
      {err && <h2 className={styles.errorMessage}>{err}</h2>}

      {viewModel.node && !isEmpty(viewModel.node) && (
        <div>
          <h2 data-testid="node-name" className={styles.sectionTitle}>
            Node:{` `}
            {viewModel.node.name}
          </h2>
          <h3
            data-testid="node-gateway-name"
            className={styles.sectionSubHeader}
          >
            Gateway:{` `}
            {viewModel?.gateway?.serialNumber && viewModel.gateway.serialNumber}
          </h3>
          <Tabs defaultActiveKey="1">
            <TabPane tab="Summary" key="1">
              <h3
                data-testid="current-readings"
                className={detailsStyles.tabSectionTitle}
              >
                Current Readings
              </h3>
              <p
                data-testid="last-seen"
                className={detailsStyles.nodeTimestamp}
              >
                Last updated {viewModel.node.lastActivity}
              </p>

              <Row
                justify="start"
                className={detailsStyles.currentReadingsRow}
                gutter={[8, 16]}
              >
                <Col xs={12} sm={12} lg={5}>
                  <Card
                    className={detailsStyles.card}
                    data-testid="temperature"
                  >
                    Temperature
                    <br />
                    <span className={detailsStyles.dataNumber}>
                      {viewModel.node.temperature}
                    </span>
                  </Card>
                </Col>
                <Col xs={12} sm={12} lg={5}>
                  <Card className={detailsStyles.card} data-testid="humidity">
                    Humidity
                    <br />
                    <span className={detailsStyles.dataNumber}>
                      {viewModel.node.humidity}
                    </span>
                  </Card>
                </Col>
                <Col xs={12} sm={12} lg={4}>
                  <Card className={detailsStyles.card} data-testid="voltage">
                    Voltage
                    <br />
                    <span className={detailsStyles.dataNumber}>
                      {viewModel.node.voltage}
                    </span>
                  </Card>
                </Col>
                <Col xs={12} sm={12} lg={5}>
                  <Card className={detailsStyles.card} data-testid="pressure">
                    Pressure
                    <br />
                    <span className={detailsStyles.dataNumber}>
                      {viewModel.node.pressure}
                    </span>
                  </Card>
                </Col>
                <Col xs={12} sm={12} lg={5}>
                  <Card
                    className={detailsStyles.card}
                    data-testid="motion-count"
                  >
                    Motion
                    <Tooltip
                      title={`Total motions detected by ${viewModel.node?.name}: ${viewModel.node.total}`}
                    >
                      <InfoCircleOutlined />
                    </Tooltip>
                    <br />
                    <span className={detailsStyles.dataNumber}>
                      {viewModel.node.count}
                    </span>
                  </Card>
                </Col>
              </Row>
              <Row>
                <Col span={8}>
                  <p className={detailsStyles.dateRangeLabel}>
                    Chart date range
                  </p>
                  <Select
                    data-testid="date-range-picker"
                    className={detailsStyles.currentReadingsRow}
                    defaultValue={
                      query.minutesBeforeNow
                        ? query.minutesBeforeNow.toString()
                        : "1440"
                    }
                    style={{ width: "100%" }}
                    onChange={handleDateRangeChange}
                  >
                    <Option value="60">Last 1 hour</Option>
                    <Option value="720">Last 12 hours</Option>
                    <Option value="1440">Last 24 hours</Option>
                    <Option value="2880">Last 2 days</Option>
                    <Option value="4320">Last 3 days</Option>
                    <Option value="7200">Last 5 days</Option>
                    <Option value="10080">Last 7 days</Option>
                  </Select>
                </Col>
              </Row>
              <Row justify="start" gutter={[8, 16]}>
                <Col xs={24} sm={24} lg={12}>
                  <Card className={detailsStyles.nodeChart}>
                    <h3>Temperature</h3>
                    <p
                      data-testid="last-seen-temperature"
                      className={detailsStyles.nodeChartTimestamp}
                    >
                      Last updated {viewModel.node.lastActivity}
                    </p>
                    {viewModel.readings?.temperature.length ? (
                      <NodeDetailsLineChart
                        label="Temperature"
                        data={viewModel.readings.temperature}
                        chartColor="#59d2ff"
                        schema={TemperatureSensorSchema}
                      />
                    ) : (
                      HISTORICAL_SENSOR_DATA_MESSAGE.NO_TEMPERATURE_HISTORY
                    )}
                  </Card>
                </Col>
                <Col xs={24} sm={24} lg={12}>
                  <Card className={detailsStyles.nodeChart}>
                    <h3>Humidity</h3>
                    <p
                      data-testid="last-seen-humidity"
                      className={detailsStyles.nodeChartTimestamp}
                    >
                      Last updated {viewModel.node.lastActivity}
                    </p>
                    {viewModel.readings?.humidity.length ? (
                      <NodeDetailsLineChart
                        label="Humidity"
                        data={viewModel.readings.humidity}
                        chartColor="#ba68c8"
                        schema={HumiditySensorSchema}
                      />
                    ) : (
                      HISTORICAL_SENSOR_DATA_MESSAGE.NO_HUMIDITY_HISTORY
                    )}
                  </Card>
                </Col>
                <Col xs={24} sm={24} lg={12}>
                  <Card className={detailsStyles.nodeChart}>
                    <h3>Voltage</h3>
                    <p
                      data-testid="last-seen-voltage"
                      className={detailsStyles.nodeChartTimestamp}
                    >
                      Last updated {viewModel.node.lastActivity}
                    </p>
                    {viewModel.readings?.voltage.length ? (
                      <NodeDetailsLineChart
                        label="Voltage"
                        data={viewModel.readings.voltage}
                        chartColor="#9ccc65"
                        schema={VoltageSensorSchema}
                      />
                    ) : (
                      HISTORICAL_SENSOR_DATA_MESSAGE.NO_VOLTAGE_HISTORY
                    )}
                  </Card>
                </Col>
                <Col xs={24} sm={24} lg={12}>
                  <Card className={detailsStyles.nodeChart}>
                    <h3>Pressure</h3>
                    <p
                      data-testid="last-seen-pressure"
                      className={detailsStyles.nodeChartTimestamp}
                    >
                      Last updated {viewModel.node.lastActivity}
                    </p>
                    {viewModel.readings?.pressure.length ? (
                      <NodeDetailsLineChart
                        label="Pressure"
                        data={viewModel.readings.pressure}
                        chartColor="#ffd54f"
                        schema={PressureSensorSchema}
                      />
                    ) : (
                      HISTORICAL_SENSOR_DATA_MESSAGE.NO_PRESSURE_HISTORY
                    )}
                  </Card>
                </Col>
                <Col xs={24} sm={24} lg={12}>
                  <Card className={detailsStyles.nodeChart}>
                    <h3>Motion Count</h3>
                    <p
                      data-testid="last-seen-count"
                      className={detailsStyles.nodeChartTimestamp}
                    >
                      Last updated {viewModel.node.lastActivity}
                    </p>
                    {viewModel.readings?.count.length ? (
                      <NodeDetailsBarChart
                        label="Count"
                        data={viewModel.readings.count}
                        chartColor="#ff7e6d"
                        schema={CountSensorSchema}
                      />
                    ) : (
                      HISTORICAL_SENSOR_DATA_MESSAGE.NO_COUNT_HISTORY
                    )}
                  </Card>
                </Col>
              </Row>
            </TabPane>
            <TabPane tab="Device Details" key="2">
              <Form
                formItems={formItems}
                onFinish={formOnFinish}
                onFinishFailed={formOnFinishFailed}
              />
            </TabPane>
          </Tabs>
        </div>
      )}
    </LoadingSpinner>
  );
};

export default NodeDetails;
