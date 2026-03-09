import { Component, Input, AfterViewInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-layout.component.html',
  styleUrls: ['./page-layout.component.scss'],
  exportAs: 'appPageLayout'
})
export class PageLayoutComponent implements AfterViewInit {
  @Input() showQuickNav = false;
  quickNavCollapsed = false;

  @ViewChild('headerRef', { static: false }) headerRef!: ElementRef;
  @ViewChild('mainContentRef', { static: false }) mainContentRef!: ElementRef;
  @ViewChild('quickNavRef', { static: false }) quickNavRef!: ElementRef;

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.recalculateLayout();
  }

  toggleQuickNav() {
    this.quickNavCollapsed = !this.quickNavCollapsed;
    this.recalculateLayout();
  }

  private recalculateLayout() {
    setTimeout(() => {
      const headerHeight = this.headerRef?.nativeElement?.offsetHeight ?? 0;

      if (this.headerRef && this.quickNavRef) {
        const topValue = `${headerHeight + this.remToPx(7.5)}px`;
        this.renderer.setStyle(this.quickNavRef.nativeElement, 'top', topValue);
        const heightValue = `calc(100vh - ${headerHeight + this.remToPx(8)}px)`;
        this.renderer.setStyle(this.quickNavRef.nativeElement, 'height', heightValue);
      }
    }, 0);
  }

  private remToPx(rem: number): number {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
}
