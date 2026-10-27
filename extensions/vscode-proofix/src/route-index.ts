import fs from 'fs';
import { RouteHandlerInfo } from './types';
import { isRouteFile, normalizeRouteFromPath, isApiRoute, findRouteExportLine } from './route-detector';

/**
 * In-memory index of discovered application routes and their source code locations.
 */
export class RouteIndex {
  private fileToRoute = new Map<string, RouteHandlerInfo>();
  private routeToFile = new Map<string, RouteHandlerInfo>();

  public indexFile(filePath: string, fileContent?: string): RouteHandlerInfo | null {
    if (!isRouteFile(filePath)) {
      return null;
    }

    const routePath = normalizeRouteFromPath(filePath);
    const content = fileContent || (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '');
    const { line, exportName } = findRouteExportLine(content);
    const isApi = isApiRoute(filePath);
    const isDynamic = routePath.includes('[');

    const info: RouteHandlerInfo = {
      routePath,
      filePath,
      line,
      isApi,
      isDynamic,
      exportName,
    };

    this.fileToRoute.set(filePath, info);
    this.routeToFile.set(routePath, info);
    return info;
  }

  public removeFile(filePath: string): void {
    const info = this.fileToRoute.get(filePath);
    if (info) {
      this.routeToFile.delete(info.routePath);
      this.fileToRoute.delete(filePath);
    }
  }

  public getByFile(filePath: string): RouteHandlerInfo | undefined {
    return this.fileToRoute.get(filePath);
  }

  public getByRoute(routePath: string): RouteHandlerInfo | undefined {
    return this.routeToFile.get(routePath);
  }

  public getAllRoutes(): RouteHandlerInfo[] {
    return Array.from(this.routeToFile.values());
  }

  public clear(): void {
    this.fileToRoute.clear();
    this.routeToFile.clear();
  }
}
