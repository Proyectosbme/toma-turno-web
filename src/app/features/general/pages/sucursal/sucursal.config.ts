import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormFieldConfig } from '@shared/components/form-panel/form-panel';
import { SearchFieldConfig } from '@shared/components/search-panel/search-panel';
import { TableColumn } from '@shared/components/table/table';

/* ══════════════════════════════════════════════════
   Configuración de columnas de la tabla sucursales
   ════════════════════════════════════════════════*/
export const COLUMNAS_TABLA: TableColumn[] = [
    { field: 'codigo', header: 'ID', sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'correo', header: 'Correo', sortable: true },    
    { field: 'telefono', header: 'Teléfono', sortable: true },
    { field: 'direccion', header: 'Dirección' },
    { field: 'estado', header: 'Estado', type: 'status' }
];


/* ══════════════════════════════════════════
   Formularios reactivos
   ══════════════════════════════════════════ */
export function crearFormularioSucursal(): FormGroup {
    return new FormGroup({
        nombre: new FormControl('', [Validators.required]),
        correo: new FormControl('', [Validators.required, Validators.maxLength(50)]),
        telefono: new FormControl('', [Validators.required, Validators.maxLength(15)]),
        direccion: new FormControl('', [Validators.required, Validators.maxLength(200)]),
        estado: new FormControl<number | null>(1, [Validators.required])
    });
}


/* ══════════════════════════════════════════
   Configuración de campos del formulario
   ══════════════════════════════════════════ */
export const CAMPOS_FORMULARIO: FormFieldConfig[] = [
    { name: 'nombre', label: 'Nombre', placeholder: 'Ej: Caja General', type: 'text' },
    { name: 'correo', label: 'Correo', placeholder: 'Ej: correo@ejemplo.com', type: 'email' },
    { name: 'telefono', label: 'Teléfono', placeholder: '9999-9999', type: 'text', mask: '9999-9999' },
    { name: 'direccion', label: 'Dirección', placeholder: 'Ej: Calle Falsa 123', type: 'text' },
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
    { name: 'nombre', label: 'Nombre', placeholder: 'Buscar por nombre' }
];

export function crearFormularioBusqueda(): FormGroup {
    return new FormGroup({
        nombre: new FormControl('')
    });
}