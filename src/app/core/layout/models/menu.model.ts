/**
 * Modelo de dominio (Value Object)
 * Representa una opción de menú de la aplicación.
 */
export class MenuItem {
  constructor(
    public label?: string,
    public icon?: string,
    public route?: string,
    public items?: MenuItem[],
    public routerLink?: string | string[],
    public codigo?: number,
    public orden?: number,
    public perfiles?: string[]
  ) {}
}
