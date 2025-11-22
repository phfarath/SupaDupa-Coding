import fs from 'fs';
import path from 'path';

export interface FileNode {
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  content?: string;
  size?: number;
}

export interface CodebaseSnapshot {
  rootPath: string;
  files: FileNode[];
  totalFiles: number;
  totalSize: number;
  loadedAt: string;
}

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  'tmp',
  'temp',
  '*.log',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

const BINARY_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.eot',
];

export class sdCodebaseLoader {
  private ignorePatterns: Set<string>;
  private maxFileSize: number;
  private maxFiles: number;

  constructor(options?: {
    ignorePatterns?: string[];
    maxFileSize?: number;
    maxFiles?: number;
  }) {
    this.ignorePatterns = new Set([
      ...DEFAULT_IGNORE_PATTERNS,
      ...(options?.ignorePatterns || []),
    ]);
    this.maxFileSize = options?.maxFileSize || 1024 * 1024;
    this.maxFiles = options?.maxFiles || 1000;
  }

  async loadCodebase(repositoryPath: string, contextScope?: string[]): Promise<CodebaseSnapshot> {
    if (!fs.existsSync(repositoryPath)) {
      throw new Error(`Repository path does not exist: ${repositoryPath}`);
    }

    const stats = fs.statSync(repositoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`Repository path is not a directory: ${repositoryPath}`);
    }

    const files: FileNode[] = [];
    let totalSize = 0;

    const scopePaths = contextScope?.map(scope => 
      path.isAbsolute(scope) ? scope : path.join(repositoryPath, scope)
    ) || [repositoryPath];

    for (const scopePath of scopePaths) {
      if (fs.existsSync(scopePath)) {
        this.traverseDirectory(scopePath, repositoryPath, files);
      }
    }

    for (const file of files) {
      if (file.type === 'file' && file.content) {
        totalSize += Buffer.byteLength(file.content, 'utf8');
      }
    }

    return {
      rootPath: repositoryPath,
      files,
      totalFiles: files.filter(f => f.type === 'file').length,
      totalSize,
      loadedAt: new Date().toISOString(),
    };
  }

  private traverseDirectory(
    dirPath: string,
    rootPath: string,
    files: FileNode[],
    depth: number = 0
  ): void {
    if (depth > 20 || files.length >= this.maxFiles) {
      return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (this.shouldIgnore(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (entry.isDirectory()) {
        files.push({
          path: fullPath,
          relativePath,
          type: 'directory',
        });
        this.traverseDirectory(fullPath, rootPath, files, depth + 1);
      } else if (entry.isFile()) {
        const fileNode: FileNode = {
          path: fullPath,
          relativePath,
          type: 'file',
        };

        if (!this.isBinaryFile(entry.name)) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.size <= this.maxFileSize) {
              fileNode.content = fs.readFileSync(fullPath, 'utf-8');
              fileNode.size = stats.size;
            }
          } catch (error) {
            fileNode.content = `[Error reading file: ${(error as Error).message}]`;
          }
        }

        files.push(fileNode);
      }
    }
  }

  private shouldIgnore(name: string): boolean {
    for (const pattern of this.ignorePatterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(name)) {
          return true;
        }
      } else if (name === pattern) {
        return true;
      }
    }
    return false;
  }

  private isBinaryFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
  }

  formatAsContext(snapshot: CodebaseSnapshot, maxLength?: number): string {
    const lines: string[] = [
      `# Codebase Snapshot`,
      `Root: ${snapshot.rootPath}`,
      `Files: ${snapshot.totalFiles}`,
      `Total Size: ${this.formatBytes(snapshot.totalSize)}`,
      `Loaded: ${snapshot.loadedAt}`,
      '',
      '## File Structure',
      '',
    ];

    const directories = snapshot.files
      .filter(f => f.type === 'directory')
      .map(f => f.relativePath)
      .sort();

    if (directories.length > 0) {
      lines.push('### Directories');
      directories.forEach(dir => lines.push(`- ${dir}/`));
      lines.push('');
    }

    const filesWithContent = snapshot.files
      .filter(f => f.type === 'file' && f.content)
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    lines.push('### Files');
    lines.push('');

    for (const file of filesWithContent) {
      lines.push(`#### ${file.relativePath}`);
      lines.push('```');
      if (file.content) {
        const content = file.content.substring(0, 10000);
        lines.push(content);
        if (file.content.length > 10000) {
          lines.push('... (truncated)');
        }
      }
      lines.push('```');
      lines.push('');
    }

    let result = lines.join('\n');
    if (maxLength && result.length > maxLength) {
      result = result.substring(0, maxLength) + '\n... (truncated for length)';
    }

    return result;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
