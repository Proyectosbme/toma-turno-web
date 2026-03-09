import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../empty-state/empty-state';

export interface TableItem {
  id?: number | string;
  [key: string]: any;
}

export interface TableColumn {
  field: string;
  header: string;
  width?: string;
  sortable?: boolean;
  type?: 'string' | 'number' | 'date' | 'status';
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, TableModule, EmptyStateComponent],
  templateUrl: './table.html',
  styleUrl: './table.scss'
})
export class TableComponent {
  @Input() items: TableItem[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() isLoading = false;
  @Input() selectedItem: TableItem | null = null;
  @Input() emptyTitle = 'Sin registros';
  @Input() emptySubtitle = 'Crea el primer registro para empezar.';
  @Input() metaText = '';
  @Input() dataKey: string | null = null;
  @Output() rowSelect = new EventEmitter<TableItem>();

  get hasCustomColumns(): boolean {
    return this.columns.length > 0;
  }

  get totalColspan(): number {
    return this.hasCustomColumns ? this.columns.length : 1;
  }

  isSelected(item: TableItem): boolean {
    if (!this.selectedItem) {
      return false;
    }
    const key = this.dataKey ?? 'id';
    if (this.selectedItem[key] != null || item[key] != null) {
      return this.selectedItem[key] === item[key];
    }
    return this.selectedItem === item;
  }
}