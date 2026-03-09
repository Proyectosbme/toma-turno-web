import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss'
})
export class EmptyStateComponent {
  @Input() title = 'Sin registros';
  @Input() subtitle = 'Aún no hay información para mostrar.';
  @Input() icon = 'pi pi-inbox';
}
