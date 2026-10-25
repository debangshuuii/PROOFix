import { McpToolRegistry } from '../tool-registry';
import { doctorToolDef, handleDoctorTool } from './doctor-tool';
import { listScenariosToolDef, handleListScenariosTool } from './scenarios-tool';
import { runRouteToolDef, handleRunRouteTool } from './route-tool';
import { verifyWorkspaceToolDef, handleVerifyWorkspaceTool } from './workspace-tool';
import { diagnoseToolDef, handleDiagnoseTool } from './diagnose-tool';
import { provePatchToolDef, handleProvePatchTool } from './prove-tool';
import { getReportToolDef, handleGetReportTool } from './report-tool';

export function registerDefaultTools(registry: McpToolRegistry): void {
  registry.register(doctorToolDef, handleDoctorTool);
  registry.register(listScenariosToolDef, handleListScenariosTool);
  registry.register(runRouteToolDef, handleRunRouteTool);
  registry.register(verifyWorkspaceToolDef, handleVerifyWorkspaceTool);
  registry.register(diagnoseToolDef, handleDiagnoseTool);
  registry.register(provePatchToolDef, handleProvePatchTool);
  registry.register(getReportToolDef, handleGetReportTool);
}
