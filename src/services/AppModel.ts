import * as DomainModel from "./DomainModel";

export type ProjectID = DomainModel.ProjectID;
export type GatewayID = DomainModel.GatewayID;
export type NodeID = DomainModel.NodeID;

/**
 * The presentation models here are json-serializable representations of the domain model.
 */

export interface Project {
    readonly id: ProjectID;
  
    // Attributes
    name: string;
    description: string | null;

    gateways: Gateway[] | null;     // null when the gateways are not required
}

/**
 * Dates are in UTC time, expressed as seconds since the epoch.
 */
 export type AppDate = number;


//export type ReadingsKeyedBySensorTypeName = { [key in string]: Reading };

export type SensorTypeCurrentReading = {
    sensorType: SensorType,
    reading: Reading | null;
}

export type ReadingSeries = {
    readings: Reading[];
}

//export type ReadingSeriesKeyedBySensorTypeName = { [key in string]: ReadingSeries };

/**
 * Common elements of Sparrow devices with sensors (Gateways and Nodes)
 */
export interface SensorHost {

    name: string | null;
    descriptionBig: string | null;
    descriptionSmall: string | null;
    lastSeen: AppDate | null;
  
    currentReadings: SensorTypeCurrentReading[] | null;

    historicalReadings: null;   // todo - define type
}

export interface Gateway extends SensorHost {
   
    readonly id: GatewayID;

    nodes: Node[] | null;       // null when the nodes were not fetched.

}

export interface Node extends SensorHost {
    readonly id: NodeID;

    /**
     * Nodes may be unnamed.
     */
    name: string | null;

    location: TextLocation | null;

}


/**
 * Presently the DomainModel is json serializable. 
 */
export interface SensorType extends DomainModel.SensorType {
    
}

export interface Reading extends DomainModel.Reading {

}


/**
 * A structured representation of a location.≠
 */
export interface Location extends TextLocation {
    text: string;       // location text

    // will add more fields here
    city: string | null;
    country: string;
}

export interface TextLocation {
    text: string;
}

export interface ProjectReadingsSnapshot {
    when: AppDate,
    project: Project,
}

export { NodeSensorTypeNames, GatewaySensorTypeNames } from './DomainModel';