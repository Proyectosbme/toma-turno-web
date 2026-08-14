import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';



@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, TooltipModule],
  templateUrl: './search-panel.html',
  styleUrl: './search-panel.scss'
})
export class SearchPanelComponent {
  @Input() form!: FormGroup;
  @Input() fields: SearchFieldConfig[] = [];
  @Input() showClear = true;
  @Input() isLoading = false;

  @Output() searchAction = new EventEmitter<void>();
  @Output() clearAction = new EventEmitter<void>();
}

export interface SearchFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  options?: Array<{ label: string; value: any }>;
}
