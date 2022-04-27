/* eslint-disable max-classes-per-file */
import { PrismaClient } from "@prisma/client";
import AxiosHttpNotehubAccessor from "./notehub/AxiosHttpNotehubAccessor";
import AppService, { AppServiceInterface } from "./AppService";
import NotehubDataProvider from "./notehub/NotehubDataProvider";
import Config from "../../config";
import { UrlManager } from "../components/presentation/UrlManager";
import { NextJsUrlManager } from "../adapters/nextjs-sparrow/NextJsUrlManager";
import { AttributeStore } from "./AttributeStore";
import { NotehubAccessor } from "./notehub/NotehubAccessor";
import { DataProvider } from "./DataProvider";
import { NotehubAttributeStore } from "./notehub/NotehubAttributeStore";
import PrismaDatastoreEventHandler from "./prisma-datastore/PrismaDatastoreEventHandler";
import { SparrowEventHandler } from "./SparrowEvent";
import NoopSparrowEventHandler from "./NoopSparrowEventHandler";
import { PrismaDataProvider } from "./prisma-datastore/PrismaDataProvider";
// eslint-disable-next-line import/no-named-as-default
import IDBuilder, { SimpleIDBuilder } from "./IDBuilder";
import CompositeDataProvider from "./prisma-datastore/CompositeDataProvider";

// ServiceLocator is the top-level consturction and dependency injection tool
// for client-side (browser-side) and also server-side node code. It uses lazy
// instanciation because some of these services are invalid to use browser-side.
// Trying to instanciate them there would just throw an error about undefined
// secret environment variables.
class ServiceLocator {
  private appService?: AppServiceInterface;

  private urlManager?: UrlManager;

  private dataProvider?: DataProvider;

  private notehubAccessor?: NotehubAccessor;

  private attributeStore?: AttributeStore;

  private prisma?: PrismaClient;

  private eventHandler?: SparrowEventHandler;

  constructor() {
    this.prisma = Config.databaseURL
      ? new PrismaClient({ datasources: { db: { url: Config.databaseURL } } })
      : undefined;
  }

  getAppService(): AppServiceInterface {
    if (!this.appService) {
      this.appService = new AppService(
        Config.hubProjectUID,
        new SimpleIDBuilder(),
        this.getDataProvider(),
        this.getAttributeStore(),
        this.getEventHandler()
      );
    }
    return this.appService;
  }

  private getDataProvider(): DataProvider {
    if (!this.dataProvider) {
      const projectID = IDBuilder.buildProjectID(Config.hubProjectUID);
      const notehubProvider = new NotehubDataProvider(
        this.getNotehubAccessor(),
        projectID
      );
      if (this.prisma) {
        const dataStoreProvider = new PrismaDataProvider(
          this.prisma,
          projectID
        );
        const combinedProvider = new CompositeDataProvider(
          this.getEventHandler(),
          this.getNotehubAccessor(),
          notehubProvider,
          dataStoreProvider
        );
        this.dataProvider = combinedProvider;
      } else {
        this.dataProvider = notehubProvider;
      }
    }
    return this.dataProvider;
  }

  private getEventHandler(): SparrowEventHandler {
    if (!this.eventHandler) {
      this.eventHandler = this.prisma
        ? new PrismaDatastoreEventHandler(this.prisma)
        : new NoopSparrowEventHandler();
    }
    return this.eventHandler;
  }

  private getNotehubAccessor(): NotehubAccessor {
    if (!this.notehubAccessor) {
      this.notehubAccessor = new AxiosHttpNotehubAccessor(
        Config.hubBaseURL,
        Config.hubProjectUID,
        Config.hubAuthToken,
        Config.hubHistoricalDataRecentMinutes
      );
    }
    return this.notehubAccessor;
  }

  getAttributeStore(): AttributeStore {
    if (!this.attributeStore) {
      this.attributeStore = new NotehubAttributeStore(
        this.getNotehubAccessor()
      );
    }
    return this.attributeStore;
  }

  getUrlManager(): UrlManager {
    if (!this.urlManager) {
      this.urlManager = NextJsUrlManager;
    }
    return this.urlManager;
  }
}

let Services: ServiceLocator | null = null;

function services() {
  // Don’t create a ServiceLocator until it’s needed. This prevents all service
  // initialization steps from happening as soon as you import this module.
  if (!Services) {
    Services = new ServiceLocator();
  }
  return Services;
}

// eslint-disable-next-line import/prefer-default-export
export { services };
