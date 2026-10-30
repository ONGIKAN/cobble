export type Route = { view: 'projects' } | { view: 'editor'; projectId: string };

const EDITOR_PREFIX = '#/editor/';

export function parseRoute(hash: string = location.hash): Route {
  if (hash.startsWith(EDITOR_PREFIX)) {
    const projectId = hash.slice(EDITOR_PREFIX.length).split('?')[0];
    if (projectId) return { view: 'editor', projectId };
  }
  return { view: 'projects' };
}

export function routeToEditor(projectId: string): void {
  location.hash = `/editor/${projectId}`;
}

export function routeToProjects(): void {
  location.hash = '/projects';
}
