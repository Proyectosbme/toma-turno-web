import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem as PrimeMenuItem } from 'primeng/api';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem as DomainMenuItem } from '@core/layout/models/menu.model';
import { MenuStateService } from '@core/layout/service/menu-state.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, BreadcrumbModule],
  templateUrl: './app.breadcrumb.html',
  styleUrl: './app.breadcrumb.scss'
})
export class AppBreadcrumb implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly menuStateService = inject(MenuStateService);

  breadcrumbHome: PrimeMenuItem = { icon: 'pi pi-home', routerLink: '/' };
  breadcrumbItems: PrimeMenuItem[] = [];

  private menuTree: DomainMenuItem[] = [];

  ngOnInit(): void {
    this.menuStateService.menuItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((menu) => {
        this.menuTree = menu || [];
        this.updateBreadcrumb(this.router.url);
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        this.updateBreadcrumb(nav.urlAfterRedirects || nav.url);
      });
  }

  private updateBreadcrumb(url: string) {
    const cleanUrl = this.normalizeUrl(url);
    const path = this.findPath(this.menuTree, cleanUrl);

    if (path && path.length) {
      this.breadcrumbItems = this.buildBreadcrumb(path);
    } else {
      this.breadcrumbItems = [];
    }
  }

  private findPath(items: DomainMenuItem[], url: string): DomainMenuItem[] | null {
    for (const item of items || []) {
      const children = item.items || [];
      const itemRoute = this.getItemRoute(item);

      if (itemRoute && this.matchRoute(url, itemRoute)) {
        return [item];
      }

      if (children.length) {
        const childPath = this.findPath(children, url);
        if (childPath) {
          return [item, ...childPath];
        }
      }
    }
    return null;
  }

  private getItemRoute(item: DomainMenuItem): string | null {
    const itemAny = item as unknown as { routerLink?: string | string[] };
    const routerLink = itemAny.routerLink;

    if (Array.isArray(routerLink)) {
      return routerLink[0] || null;
    }

    if (typeof routerLink === 'string') {
      return routerLink;
    }

    return item.route || null;
  }

  private buildBreadcrumb(path: DomainMenuItem[]): PrimeMenuItem[] {
    let currentRoute = '';

    return path.map((item) => {
      const itemRoute = this.getItemRoute(item);

      if (itemRoute) {
        if (itemRoute.startsWith('/')) {
          currentRoute = itemRoute;
        } else {
          currentRoute = this.joinRoutes(currentRoute, itemRoute);
        }
      }

      return {
        label: item.label,
        routerLink: currentRoute || undefined
      } as PrimeMenuItem;
    });
  }

  private joinRoutes(base: string, segment: string): string {
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanSegment = segment.startsWith('/') ? segment.slice(1) : segment;

    if (!cleanBase) {
      return '/' + cleanSegment;
    }

    return cleanBase + '/' + cleanSegment;
  }

  private matchRoute(url: string, route: string): boolean {
    if (!route) {
      return false;
    }

    const cleanUrl = this.normalizeUrl(url);
    const cleanRoute = this.normalizeRoute(route);

    if (cleanUrl === cleanRoute || cleanUrl.startsWith(cleanRoute + '/')) {
      return true;
    }

    if (!route.startsWith('/')) {
      return cleanUrl === '/' + route || cleanUrl.endsWith('/' + route);
    }

    return false;
  }

  private normalizeUrl(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  private normalizeRoute(route: string): string {
    let clean = route.split('?')[0].split('#')[0];
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    return clean;
  }
}
