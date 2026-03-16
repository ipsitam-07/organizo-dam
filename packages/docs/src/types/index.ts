export interface SwaggerDocOptions {
  title: string;
  description: string;
  serverUrl: string;
  serverDescription: string;
  schemas: Record<string, object>;
  paths: Record<string, object>;
}
