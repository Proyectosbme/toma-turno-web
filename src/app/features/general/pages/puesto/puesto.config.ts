import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormFieldConfig } from '@shared/components/form-panel/form-panel';
import { SearchFieldConfig } from '@shared/components/search-panel/search-panel';
import { TableColumn } from '@shared/components/table/table';

/* ══════════════════════════════════════════════════
   Configuración de columnas de la tabla puestos
   ════════════════════════════════════════════════*/
export const COLUMNAS_TABLA: TableColumn[] = [
    { field: 'id', header: 'ID', width: '80px', sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'nombreLlamada', header: 'Nombre de Llamada', sortable: true },
    { field: 'nombreSucursal', header: 'Sucursal', sortable: true },
    { field: 'estado', header: 'Estado', width: '100px', type: 'status' }
];


/* ══════════════════════════════════════════
   Formularios reactivos
   ══════════════════════════════════════════ */
export function crearFormularioPuesto(): FormGroup {
    return new FormGroup({
        idSucursal: new FormControl<number | null>(null, [Validators.required]),
        nombre: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
        nombreLlamada: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
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
    { name: 'nombre', label: 'Nombre', placeholder: 'Ej: Caja 1', type: 'text' },
    { name: 'nombreLlamada', label: 'Nombre de Llamada', placeholder: 'Ej: Caja 1', type: 'text' },
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
