import { SignalStrengths } from "../presentation/uiHelpers";
import Node from "./Node";

interface Gateway {
  /**
   * The unique identifier for this gateway
   */
  uid: string;

  /**
   * The name for this gateway.
   */
  name: string;
  lastActivity: string;
  location?: string;
  voltage: number;
  /**
   * The signal strength for this gateway - either cell bars or wifi bars.
   */
  cellBars?: SignalStrengths;
  cellIconPath?: string;
  cellTooltip?: string;
  wifiBars?: SignalStrengths;
  wifiIconPath?: string;
  wifiTooltip?: string;

  nodeList: Node[];
}

export default Gateway;
