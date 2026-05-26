import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormFieldConfig } from '@shared/components/form-panel/form-panel';
import { SearchFieldConfig } from '@shared/components/search-panel/search-panel';
import { TableColumn } from '@shared/components/table/table';

export const COLUMNAS_TABLA: TableColumn[] = [
    { field: 'id', header: 'ID', width: '70px', sortable: true },
    { field: 'codigoUsuario', header: 'Código', sortable: true },
    { field: 'nombres', header: 'Nombres', sortable: true },
    { field: 'apellidos', header: 'Apellidos', sortable: true },
    { field: 'dui', header: 'DUI' },
    { field: 'nombreSucursal', header: 'Sucursal', sortable: true },
    { field: 'nombrePuesto', header: 'Puesto' },
    { field: 'correlativo', header: '#puesto' },
    { field: 'perfil', header: 'Perfil' },
    { field: 'estado', header: 'Estado', width: '90px', type: 'status' }
];

/** Opciones de perfil disponibles en el sistema */
export const OPCIONES_PERFIL = [
    { label: 'Administrador',  value: 'ADMIN'    },
    { label: 'Sub administrador',  value: 'SUBADMIN'    },
    { label: 'Monitor',        value: 'MONITOR'  },
    { label: 'Público',        value: 'PUBLICO'  },
    { label: 'Operador',       value: 'OPERADOR' }
];

/** Opciones de perfil que puede asignar un SUBADMIN */
export const OPCIONES_PERFIL_SUBADMIN = [
    { label: 'Público',  value: 'PUBLICO'  },
    { label: 'Operador', value: 'OPERADOR' }
];

export function crearFormularioUsuario(esEdicion = false): FormGroup {
    return new FormGroup({
        idSucursal:    new FormControl<number | null>(null, [Validators.required]),
        idPuesto:      new FormControl<number | null>(null),
        correlativo:   new FormControl<number | null>(null),
        perfil:        new FormControl('', [Validators.required]),
        nombres:       new FormControl('', [Validators.required, Validators.maxLength(100)]),
        apellidos:     new FormControl('', [Validators.required, Validators.maxLength(100)]),
        dui:           new FormControl('', [Validators.maxLength(20)]),
        estado:                 new FormControl<number | null>(1, [Validators.required]),
        telefono:               new FormControl('', [Validators.maxLength(20)]),
        ip:                     new FormControl('', [Validators.maxLength(50)]),
        atenderCasosEspeciales: new FormControl<number | null>(0),
        correo:        new FormControl('', [Validators.email, Validators.maxLength(150)])
    });
}

export function crearFormularioBusqueda(): FormGroup {
    return new FormGroup({
        idSucursal:    new FormControl<number | null>(null),
        codigoUsuario: new FormControl(''),
        nombre:        new FormControl('')
    });
}

export const CAMPOS_FORMULARIO_CREAR: FormFieldConfig[] = [
    { name: 'idSucursal', label: 'Sucursal', type: 'select', options: [] },
    { name: 'idPuesto',   label: 'Puesto',   type: 'select', options: [] },
    { name: 'correlativo', label: '#Estación', type: 'number', placeholder: 'Ej: 1 para el primer puesto de la sucursal' },
    {
        name: 'perfil', label: 'Perfil', type: 'select',
        options: OPCIONES_PERFIL
    },
    { name: 'nombres',       label: 'Nombres',             placeholder: 'Ej: Juan Carlos',    type: 'text'     },
    { name: 'apellidos',     label: 'Apellidos',           placeholder: 'Ej: Pérez López',    type: 'text'     },
    { name: 'correo',        label: 'Correo electrónico',  placeholder: 'Ej: juan@correo.com', type: 'text'    },
    { name: 'dui',           label: 'DUI',                                                    type: 'text', mask: '99999999-9' },
    { name: 'telefono',      label: 'Teléfono',            placeholder: 'Ej: 7777-8888',      type: 'text'     },
    { name: 'ip',            label: 'IP',                  placeholder: 'Ej: 192.168.1.10',   type: 'text'     },
    {
        name: 'estado', label: 'Estado', type: 'select',
        options: [
            { label: 'Activo',   value: 1 },
            { label: 'Inactivo', value: 0 }
        ]
    },
    {
        name: 'atenderCasosEspeciales', label: 'Priorizar casos especiales', type: 'select',
        options: [
            { label: 'No', value: 0 },
            { label: 'Sí', value: 1 }
        ]
    }
];

export const CAMPOS_FORMULARIO_EDITAR: FormFieldConfig[] = [
    { name: 'idSucursal', label: 'Sucursal', type: 'select', options: [] },
    { name: 'idPuesto',   label: 'Puesto',   type: 'select', options: [] },
    {name: 'correlativo', label: 'Número de Puesto', type: 'number', placeholder: 'Ej: 1 para el primer puesto de la sucursal' },
    {
        name: 'perfil', label: 'Perfil', type: 'select',
        options: OPCIONES_PERFIL
    },
    { name: 'nombres',       label: 'Nombres',                        placeholder: 'Ej: Juan Carlos',                  type: 'text'     },
    { name: 'apellidos',     label: 'Apellidos',                      placeholder: 'Ej: Pérez López',                  type: 'text'     },
    { name: 'correo',        label: 'Correo electrónico',             placeholder: 'Dejar vacío para no modificar',    type: 'text'     },
    { name: 'dui',           label: 'DUI',                                                                             type: 'text', mask: '99999999-9' },
    { name: 'telefono',      label: 'Teléfono',                       placeholder: 'Ej: 7777-8888',                    type: 'text'     },
    { name: 'ip',            label: 'IP',                             placeholder: 'Ej: 192.168.1.10',                 type: 'text'     },
    {
        name: 'estado', label: 'Estado', type: 'select',
        options: [
            { label: 'Activo',   value: 1 },
            { label: 'Inactivo', value: 0 }
        ]
    },
    {
        name: 'atenderCasosEspeciales', label: 'Priorizar casos especiales', type: 'select',
        options: [
            { label: 'No', value: 0 },
            { label: 'Sí', value: 1 }
        ]
    }
];

export const CAMPOS_BUSQUEDA: SearchFieldConfig[] = [
    { name: 'idSucursal',    label: 'Sucursal', type: 'select', options: [] },
    { name: 'codigoUsuario', label: 'Código',   placeholder: 'Buscar por código'          },
    { name: 'nombre',        label: 'Nombre',   placeholder: 'Buscar por nombre o apellido' }
];