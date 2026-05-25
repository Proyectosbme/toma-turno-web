import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormFieldConfig } from '@shared/components/form-panel/form-panel';
import { SearchFieldConfig } from '@shared/components/search-panel/search-panel';
import { TableColumn } from '@shared/components/table/table';

/* ══════════════════════════════════════════
   Formularios reactivos
   ══════════════════════════════════════════ */
export function crearFormularioCola(): FormGroup {
    return new FormGroup({
        idSucursal: new FormControl<number | null>(null, [Validators.required]),
        nombre: new FormControl('', [Validators.required]),
        codigo: new FormControl('', [Validators.required, Validators.maxLength(10)]),
        estado: new FormControl<number | null>(1, [Validators.required])
    });
}

export function crearFormularioBusqueda(): FormGroup {
    return new FormGroup({
        nombre: new FormControl(''),
        idSucursal: new FormControl<number | null>(null)
    });
}

/* ══════════════════════════════════════════
   Configuración de campos del formulario
   ══════════════════════════════════════════ */
export const CAMPOS_FORMULARIO: FormFieldConfig[] = [
    { name: 'idSucursal', label: 'Sucursal', type: 'select', options: [] },
    { name: 'nombre', label: 'Nombre', placeholder: 'Ej: Caja General', type: 'text' },
    { name: 'codigo', label: 'Código', placeholder: 'Ej: CG-001', type: 'text' },
    {
        name: 'estado', label: 'Estado', type: 'select',
        options: [
            { label: 'Activo', value: 1 },
            { label: 'Inactivo', value: 0 }
        ]
    }
];

/* ══════════════════════════════════════════
   Configuración de campos de búsqueda
   ══════════════════════════════════════════ */
export const CAMPOS_BUSQUEDA: SearchFieldConfig[] = [
    { name: 'nombre', label: 'Nombre', placeholder: 'Buscar por nombre' },
    { name: 'idSucursal', label: 'Sucursal', type: 'select', options: [] }
];

/* ══════════════════════════════════════════
   Configuración de columnas de la tabla
   ══════════════════════════════════════════ */
export const COLUMNAS_TABLA: TableColumn[] = [
    { field: 'id', header: 'ID', width: '80px', sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'codigo', header: 'Código', width: '120px' },
    { field: 'estado', header: 'Estado', width: '100px', type: 'status' },
    { field: 'nombreSucursal', header: 'Nombre Sucursal', sortable: true }
];

/* ══════════════════════════════════════════
   Configuración de columnas de la tabla detalle
   ══════════════════════════════════════════ */
export const COLUMNAS_TABLA_DETALLE: TableColumn[] = [
    { field: 'idDetalle', header: 'ID',  sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'codigo', header: 'Código' },
    { field: 'estado', header: 'Estado', type: 'status' }
];


export function crearFormularioDetalle(): FormGroup {
    return new FormGroup({
        nombre: new FormControl('', [Validators.required]),
        codigo: new FormControl('', [Validators.required, Validators.maxLength(10)]),
        estado: new FormControl<number | null>(1, [Validators.required])
    });
}

export const CAMPOS_FORMULARIO_DETALLE: FormFieldConfig[] = [
    { name: 'nombre', label: 'Nombre', placeholder: 'Ej: Ventanilla 1', type: 'text' },
    { name: 'codigo', label: 'Código', placeholder: 'Ej: V-001', type: 'text' },
    {
        name: 'estado', label: 'Estado', type: 'select',
        options: [
            { label: 'Activo', value: 1 },
            { label: 'Inactivo', value: 0 }
        ]
    }
];
