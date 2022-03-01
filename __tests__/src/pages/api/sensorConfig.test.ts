/**
 * @jest-environment node
 */
import { createMocks, RequestMethod } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import { StatusCodes } from "http-status-codes";
import sensorConfigHandler from "../../../../src/pages/api/gateway/[gatewayUID]/sensor/[macAddress]/config";
import { HTTP_STATUS, HTTP_HEADER } from "../../../../src/constants/http";
import { services } from "../../../../src/services/ServiceLocator";

describe("/api/gateway/[gatewayUID]/sensor/[macAddress]/config API Endpoint", () => {
  const authToken = process.env.HUB_AUTH_TOKEN;
  const gatewayUIDs = process.env.HUB_DEVICE_UID;
  const gatewayUID = gatewayUIDs.split(",")[0];
  const macAddress = process.env.TEST_SENSOR_MAC;

  function mockRequestResponse(method: RequestMethod = "GET") {
    const { req, res }: { req: NextApiRequest; res: NextApiResponse } =
      createMocks({ method });
    req.headers = {
      [HTTP_HEADER.CONTENT_TYPE]: HTTP_HEADER.CONTENT_TYPE_JSON,
      [HTTP_HEADER.SESSION_TOKEN]: authToken,
    };
    req.query = { gatewayUID, macAddress };
    return { req, res };
  }

  it("POST should return a successful response if the sensor can be changed", async () => {
    const app = services().getAppService();
    jest.spyOn(app, "setSensorLocation").mockImplementation(async () => {});
    jest.spyOn(app, "setSensorName").mockImplementation(async () => {});
    const { req, res } = mockRequestResponse("POST");
    req.body = { location: "TEST_LOCATION", name: "TEST_NAME" };
    await sensorConfigHandler(req, res);

    expect(res.statusCode).toBe(StatusCodes.OK);
    expect(res.getHeaders()).toEqual({
      "content-type": HTTP_HEADER.CONTENT_TYPE_JSON,
    });
    expect(res.statusMessage).toEqual("OK");
  });

  it("POST should return an error if things can't be changed", async () => {
    const app = services().getAppService();
    jest.spyOn(app, "setSensorLocation").mockImplementation(() => {
      throw new Error("ugh");
    });

    const { req, res } = mockRequestResponse("POST");
    req.body = { location: "TEST_LOCATION" };
    const promise = sensorConfigHandler(req, res);

    await expect(promise).rejects.toMatchInlineSnapshot(
      `[ErrorWithCause: could not handle sensor config]`
    );
  });

  it("POST should return a 400 if Sensor config is invalid", async () => {
    const { req, res } = mockRequestResponse("POST");
    req.body = {}; // no name and no location given. bad.
    await sensorConfigHandler(req, res);

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(res.getHeaders()).toEqual({
      "content-type": HTTP_HEADER.CONTENT_TYPE_JSON,
    });
    // eslint-disable-next-line no-underscore-dangle
    expect(res._getJSONData()).toEqual({
      err: HTTP_STATUS.INVALID_SENSOR_CONFIG_BODY,
    });
  });

  it("POST should return a BAD_REQUEST if Sensor name is not a string", async () => {
    const { req, res } = mockRequestResponse("POST");
    req.body = { name: 40 };
    await sensorConfigHandler(req, res);

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(res._getJSONData()).toEqual({
      err: "name should be a string or undefined",
    });
  });

  it("POST should return a BAD_REQUEST if Sensor location is not a string", async () => {
    const { req, res } = mockRequestResponse("POST");
    req.body = { location: 40 };
    await sensorConfigHandler(req, res);

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(res._getJSONData()).toEqual({
      err: "location should be a string or undefined",
    });
  });

  it("should return a 400 if Gateway UID is not a string", async () => {
    const { req, res } = mockRequestResponse("POST");
    req.query.gatewayUID = 11; // Pass gateway UID of the incorrect type

    await sensorConfigHandler(req, res);

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
    // eslint-disable-next-line no-underscore-dangle
    expect(res._getJSONData()).toEqual({ err: HTTP_STATUS.INVALID_GATEWAY });
  });

  it("should return a 405 if method not POST is passed", async () => {
    const { req, res } = mockRequestResponse("PUT");
    req.body = { location: "FAILING_TEST_LOCATION", name: "FAILING_TEST_NAME" };
    await sensorConfigHandler(req, res);

    expect(res.statusCode).toBe(StatusCodes.METHOD_NOT_ALLOWED);
    // eslint-disable-next-line no-underscore-dangle
    expect(res._getJSONData()).toEqual({ err: "Method PUT Not Allowed" });
  });
});
