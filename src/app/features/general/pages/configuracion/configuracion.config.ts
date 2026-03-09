import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormFieldConfig } from '@shared/components/form-panel/form-panel';
import { SearchFieldConfig } from '@shared/components/search-panel/search-panel';
import { TableColumn } from '@shared/components/table/table';

export const COLUMNAS_TABLA: TableColumn[] = [
    { field: 'idConfiguracion', header: 'ID', width: '70px', sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'parametro', header: 'Parámetro (num)', width: '130px' },
    { field: 'valorTexto', header: 'Valor (texto)' },
    { field: 'descripcion', header: 'Descripción' },
    { field: 'estado', header: 'Estado', width: '90px', type: 'status' }
];

export function crearFormularioConfiguracion(esEdicion = false): FormGroup {
    return new FormGroup({
        idSucursal: new FormControl<number | null>(null, [Validators.required]),
        nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
        parametro: new FormControl<number | null>(null),
        valorTexto: new FormControl('', [Validators.maxLength(200)]),
        descripcion: new FormControl('', [Validators.maxLength(500)]),
        estado: new FormControl<number | null>(1, [Validators.required])
    });
}

export function crearFormularioBusqueda(): FormGroup {
    return new FormGroup({
        idSucursal: new FormControl<number | null>(null)
    });
}

export const CAMPOS_FORMULARIO: FormFieldConfig[] = [
    { name: 'idSucursal', label: 'Sucursal', type: 'select', options: [] },
    {
        name: 'nombre', label: 'Nombre / Clave',
        placeholder: 'Ej: VALIDAR_IP, REINICIAR_DIARIO, PREFIJO_COLA',
        type: 'text'
    },
    {
        name: 'parametro', label: 'Parámetro numérico',
        placeholder: 'Ej: 0 (inactivo), 1 (activo), 5 (correlativo)',
        type: 'number'
    },
    {
        name: 'valorTexto', label: 'Valor de texto',
        placeholder: 'Ej: C-, P-, formato de código',
        type: 'text'
    },
    {
        name: 'descripcion', label: 'Descripción',
        placeholder: 'Descripción del parámetro',
        type: 'text',
        fullWidth: true
    },
    {
        name: 'estado', label: 'Estado', type: 'select',
        options: [
            { label: 'Activo', value: 1 },
            { label: 'Inactivo', value: 0 }
        ]
    }
];

export const CAMPOS_BUSQUEDA: SearchFieldConfig[] = [
    { name: 'idSucursal', label: 'Sucursal', type: 'select', options: [] }
];
