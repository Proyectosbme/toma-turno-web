import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { InputMaskModule } from 'primeng/inputmask';

export interface FormFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'select';
  options?: Array<{ label: string; value: any }>;
  fullWidth?: boolean;
  mask?: string;
}

@Component({
  selector: 'app-form-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, TooltipModule, InputMaskModule],
  templateUrl: './form-panel.html',
  styleUrl: './form-panel.scss'
})
export class FormPanelComponent {
  @Input() form!: FormGroup;
  @Input() fields: FormFieldConfig[] = [];
  @Input() columns: number = 2;
  @Input() isLoading = false;

}
