import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { Tree } from 'primeng/tree';
import { MenuStateService } from '@core/layout/service/menu-state.service';
import { MenuItem } from '@core/layout/models/menu.model';
import { TreeNodeSelectEvent } from 'primeng/tree';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, Tree],
    templateUrl: './app.menu.component.html'
})
export class AppMenu implements OnInit {

    treeNodes: TreeNode[] = [];
    selectedNode: TreeNode | null = null;

    constructor(
        private readonly menuStateService: MenuStateService,
        private readonly router: Router,
        private readonly authService: AuthService
    ) {}

    ngOnInit(): void {
        this.loadMenuFromJson();
    }

    onNodeSelect(event: TreeNodeSelectEvent): void {
        const node = event.node;
        if (node.data?.routerLink) {
            this.router.navigate(node.data.routerLink);
        }
    }

    private async loadMenuFromJson(): Promise<void> {
        try {
            const usuario = this.authService.getUsuario();
            const perfil  = usuario?.perfil ?? null;
            const archivo = (perfil === 'ADMIN' && usuario?.idSucursal !== 1)
                ? '/assets/menu/menusubadmin.json'
                : '/assets/menu/menu.json';

            const response = await fetch(archivo);
            const menu = (await response.json()) as MenuItem[];
            const menuFiltrado = this.filtrarPorPerfil(menu, perfil);
            this.treeNodes = this.mapMenuToTreeNodes(menuFiltrado);
            this.menuStateService.setMenu(menuFiltrado);
        } catch {
            this.treeNodes = [];
            this.menuStateService.setMenu([]);
        }
    }

    private filtrarPorPerfil(items: MenuItem[], perfil: string | null): MenuItem[] {
        if (!perfil) return [];
        return items
            .filter(item => !item.perfiles || item.perfiles.includes(perfil))
            .map(item => ({
                ...item,
                items: item.items ? this.filtrarPorPerfil(item.items, perfil) : undefined
            }));
    }

    private mapMenuToTreeNodes(items: MenuItem[]): TreeNode[] {
        return items.map(item => {
            const hasChildren = Array.isArray(item.items) && item.items.length > 0;
            const node: TreeNode = {
                key: String(item.codigo),
                label: item.label,
                icon: item.icon,
                expanded: true,
                leaf: !hasChildren,
                data: {
                    routerLink: item.routerLink,
                    codigo: item.codigo,
                    orden: item.orden
                }
            };
            if (hasChildren) {
                node.children = this.mapMenuToTreeNodes(item.items!);
            }
            return node;
        });
    }
}
