import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-title.html',
  styleUrl: './page-title.scss'
})
export class PageTitleComponent {
  @Input() title = '';
}