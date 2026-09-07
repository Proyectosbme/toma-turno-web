export {};

// lib.dom.d.ts declara FileSystemHandle/FileSystemDirectoryHandle pero sin los métodos
// de permisos ni el iterador de contenido, y no declara showDirectoryPicker — son parte
// de la File System Access API (Chromium), todavía no estandarizada en el DOM oficial.
declare global {
    type FileSystemPermissionMode = 'read' | 'readwrite';

    interface FileSystemHandlePermissionDescriptor {
        mode?: FileSystemPermissionMode;
    }

    interface FileSystemHandle {
        queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
        requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    }

    interface FileSystemDirectoryHandle {
        values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
    }

    interface Window {
        showDirectoryPicker(options?: { id?: string; mode?: FileSystemPermissionMode }): Promise<FileSystemDirectoryHandle>;
    }
}
