import { ErrorWithCause } from "pony-cause";
import Gateway from "../components/models/Gateway";
import Node from "../components/models/Node";
import SensorReading from "../components/models/readings/SensorReading";
import { DataProvider } from "./DataProvider";
import { AttributeStore } from "./AttributeStore";
import { SparrowEventHandler } from "./SparrowEvent";
import { SparrowEvent } from "./notehub/SparrowEvents";
import { Project, ProjectID } from "./DomainModel";
import { IDBuilder } from "./IDBuilder";

// this class / interface combo passes data and functions to the service locator file
interface AppServiceInterface {
  
  getGateways: () => Promise<Gateway[]>;
  // todo - make the interface less chatty.  
  getGateway: (gatewayUID: string) => Promise<Gateway>;
  setGatewayName: (gatewayUID: string, name: string) => Promise<void>;
  getNodes: (gatewayUIDs: string[]) => Promise<Node[]>;
  getNode: (gatewayUID: string, nodeId: string) => Promise<Node>;
  getNodeData: (
    gatewayUID: string,
    nodeId: string
  ) => Promise<SensorReading<unknown>[]>;
  setNodeName: (
    gatewayUID: string,
    nodeId: string,
    name: string
  ) => Promise<void>;
  setNodeLocation: (
    gatewayUID: string,
    nodeId: string,
    loc: string
  ) => Promise<void>;


  getLatestProjectReadings() : Promise<Project>;
  
    // todo - ingesting events should be on a separate service. 
  handleEvent(event: SparrowEvent) : Promise<void>;
}

export type { AppServiceInterface };

export default class AppService implements AppServiceInterface {
  private projectID: ProjectID;
  
  constructor(
    projectUID: string,
    private readonly idBuilder: IDBuilder,
    private dataProvider: DataProvider,
    private attributeStore: AttributeStore,
    private sparrowEventHandler: SparrowEventHandler
  ) {
    this.projectID = this.idBuilder.buildProjectID(projectUID);
  }

  async getGateways() {
    return this.dataProvider.getGateways();
  }

  async getGateway(gatewayUID: string) {
    return this.dataProvider.getGateway(gatewayUID);
  }

  async setGatewayName(gatewayUID: string, name: string) {
    const store = this.attributeStore;
    try {
      await store.updateGatewayName(gatewayUID, name);
    } catch (e) {
      const e2 = new ErrorWithCause(`could not setGatewayName`, { cause: e });
      throw e2;
    }
  }

  async getNodes(gatewayUIDs: string[]) {
    return this.dataProvider.getNodes(gatewayUIDs);
  }

  async getNode(gatewayUID: string, nodeId: string) {
    return this.dataProvider.getNode(gatewayUID, nodeId);
  }

  async getNodeData(gatewayUID: string, nodeId: string) {
    return this.dataProvider.getNodeData(gatewayUID, nodeId);
  }

  async handleEvent(event: SparrowEvent) {
    return this.sparrowEventHandler.handleEvent(event);
  }

  async setNodeName(gatewayUID: string, nodeId: string, name: string) {
    const store = this.attributeStore;
    try {
      await store.updateNodeName(gatewayUID, nodeId, name);
    } catch (e) {
      const e2 = new ErrorWithCause(`could not setNodeName`, { cause: e });
      throw e2;
    }
  }

  async setNodeLocation(gatewayUID: string, nodeId: string, loc: string) {
    const store = this.attributeStore;
    try {
      await store.updateNodeLocation(gatewayUID, nodeId, loc);
    } catch (e) {
      throw new ErrorWithCause(`could not setNodeLocation`, { cause: e });
    }
  }

  async getLatestProjectReadings() : Promise<Project> {
    const projectID = this.currentProjectID();
    const result = await this.dataProvider.queryProjectLatestValues(projectID);
    const project = result.results;
    return project;
  }

  private currentProjectID() {
    return this.projectID;
  }
}
