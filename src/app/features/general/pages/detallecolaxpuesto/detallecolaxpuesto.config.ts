import { FormControl, FormGroup } from '@angular/forms';
import { SearchFieldConfig } from '@shared/components/search-panel/search-panel';
import { TableColumn } from '@shared/components/table/table';

export const COLUMNAS_TABLA: TableColumn[] = [
    { field: 'nombreCola', header: 'Cola', sortable: true },
    { field: 'nombreDetalle', header: 'Detalle', sortable: true },
    { field: 'userCreacion', header: 'Creado por' },
    { field: 'fechaCreacion', header: 'Fecha asignación' }
];


/* ══════════════════════════════════════════
   Formulario reactivo para el filtro
   ══════════════════════════════════════════ */
export function crearFormularioFiltro(): FormGroup {
    return new FormGroup({
        idSucursal: new FormControl<number | null>(null),
        idPuesto:   new FormControl<number | null>({ value: null, disabled: true })
    });
}


/* ══════════════════════════════════════════
   Configuración de campos de búsqueda
   ══════════════════════════════════════════ */
export const CAMPOS_FILTRO: SearchFieldConfig[] = [
    {
        name: 'idSucursal',
        label: 'Sucursal',
        type: 'select',
        options: [],
        placeholder: 'Seleccionar sucursal'
    },
    {
        name: 'idPuesto',
        label: 'Puesto',
        type: 'select',
        options: [],
        placeholder: 'Seleccionar puesto'
    }
];