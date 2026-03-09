import { AfterViewInit, Component, EventEmitter, Inject, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

export interface QuickNavItem {
  id: string;
  label: string;
  badge?: string;
}

@Component({
  selector: 'app-quick-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-nav.html',
  styleUrl: './quick-nav.scss'
})
export class QuickNavComponent implements AfterViewInit, OnDestroy {
  @Input() items: QuickNavItem[] = [];
  @Input() activeId = '';
  @Input() collapsed = false;

  @Output() activeChange = new EventEmitter<string>();

  private observer?: IntersectionObserver;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  ngAfterViewInit(): void {
    this.observeSections();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  navigate(item: QuickNavItem): void {
    this.activeId = item.id;
    this.activeChange.emit(item.id);

    const target = this.document.getElementById(item.id);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private observeSections(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer?.disconnect();

    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length === 0) {
          return;
        }

        const id = visible[0].target.id;
        if (id && id !== this.activeId) {
          this.activeId = id;
          this.activeChange.emit(id);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75]
      }
    );

    this.items.forEach((item) => {
      const target = this.document.getElementById(item.id);
      if (target) {
        this.observer?.observe(target);
      }
    });
  }
}
