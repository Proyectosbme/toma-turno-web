import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PersonaRequestDTO, PersonaResponseDTO } from '@general/dto/persona.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PersonaApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/personas`;

    constructor(private readonly http: HttpClient) {}

    crearOActualizar(dto: PersonaRequestDTO): Promise<PersonaResponseDTO> {
        return firstValueFrom(
            this.http.post<PersonaResponseDTO>(`${this.BASE_URL}/crear-o-actualizar`, dto)
        );
    }
}
